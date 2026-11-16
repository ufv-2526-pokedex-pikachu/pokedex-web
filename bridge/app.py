"""Puente de login con Google para la Pokédex API.

La API solo sabe autenticar con usuario y contraseña, y no se modifica. Este servicio pequeño:

1. Recibe el token de identidad (ID token) que Google da a la web al pulsar «Continuar con Google».
2. Comprueba con las claves públicas de Google que el token es auténtico, que es para nuestra
   app (audience = nuestro ID de cliente) y que el email está verificado.
3. Calcula para esa cuenta de Google un usuario y una contraseña fijos. La contraseña es un HMAC
   con un secreto que solo conoce el puente: nadie puede deducirla sin ese secreto.
4. Hace login en la API con ellos; si la cuenta aún no existe, la registra y luego hace login.
5. Devuelve a la web los tokens JWT normales de la API.

Arranque: uvicorn app:app --port 8787   (variables en bridge/.env, ver .env.example)
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import logging
import os
import re
from pathlib import Path
from typing import Any, Callable

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

logger = logging.getLogger("bridge")
logging.basicConfig(level=logging.INFO, format="%(asctime)s - bridge - %(levelname)s - %(message)s")


def _load_env(path: Path) -> None:
    """Lee KEY=valor de bridge/.env sin sobrescribir lo que ya venga del entorno."""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip())


_load_env(Path(__file__).with_name(".env"))

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
BRIDGE_SECRET = os.environ.get("BRIDGE_SECRET", "")
API_URL = os.environ.get("API_URL", "http://127.0.0.1:8000").rstrip("/")


# ---------- Identidad derivada ----------

def derive_password(sub: str, secret: str) -> str:
    """Contraseña fija para una cuenta de Google.

    HMAC-SHA256(secreto, sub) en base64: sin el secreto no se puede calcular. El prefijo «Gg1»
    garantiza la mayúscula y el número que exige la API, y el total (35 caracteres ASCII)
    queda lejos del límite de 72 bytes de bcrypt.
    """
    digest = hmac.new(secret.encode(), f"google:{sub}".encode(), hashlib.sha256).digest()
    return "Gg1" + base64.urlsafe_b64encode(digest).decode().rstrip("=")[:32]


def derive_username(email: str, sub: str) -> str:
    """Usuario legible y único: la parte del email antes de la @ y el final del id de Google.

    shortcut: si alguien cambia el email de su cuenta de Google, el usuario calculado cambia y se
    le crearía una cuenta nueva; con más usuarios habría que guardar la relación sub → usuario.
    """
    local = re.sub(r"[^a-z0-9._-]", "", email.split("@")[0].lower())[:30] or "entrenador"
    return f"{local}-g{sub[-5:]}"


# ---------- Verificación del token de Google ----------

def verify_google_token(credential: str) -> dict[str, Any]:
    """Valida firma, caducidad, emisor y audience del ID token. Lanza ValueError si algo falla."""
    from google.auth import exceptions as google_exceptions
    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token

    try:
        claims = id_token.verify_oauth2_token(credential, google_requests.Request(), GOOGLE_CLIENT_ID)
    except google_exceptions.GoogleAuthError as exc:
        raise ValueError(str(exc)) from exc
    if not claims.get("email_verified"):
        raise ValueError("El email de la cuenta de Google no está verificado")
    return claims


# ---------- App ----------

class GoogleLogin(BaseModel):
    credential: str


def create_app(
    verify: Callable[[str], dict[str, Any]] = verify_google_token,
    transport: httpx.BaseTransport | None = None,
) -> FastAPI:
    """Crea la app. Los tests pasan su propio `verify` y un `transport` falso para no usar la red."""
    app = FastAPI(title="Puente Google → Pokédex API", docs_url=None, redoc_url=None)

    @app.get("/bridge/health")
    def health() -> dict[str, Any]:
        return {"status": "ok", "google_configured": bool(GOOGLE_CLIENT_ID and BRIDGE_SECRET)}

    @app.post("/bridge/google")
    def google_login(body: GoogleLogin) -> dict[str, Any]:
        if not GOOGLE_CLIENT_ID or not BRIDGE_SECRET:
            raise HTTPException(503, "El login con Google no está configurado en el puente")
        try:
            claims = verify(body.credential)
        except ValueError as exc:
            logger.warning("Token de Google rechazado: %s", exc)
            raise HTTPException(401, "Google no ha validado el inicio de sesión. Prueba otra vez.") from exc

        email = claims["email"]
        username = derive_username(email, claims["sub"])
        password = derive_password(claims["sub"], BRIDGE_SECRET)

        with httpx.Client(base_url=API_URL, timeout=10, transport=transport) as api:
            def login() -> httpx.Response:
                return api.post("/api/v1/auth/login", data={"username": username, "password": password})

            res = login()
            if res.status_code == 401:
                reg = api.post(
                    "/api/v1/auth/register",
                    json={"username": username, "email": email, "password": password},
                )
                if reg.status_code == 409:
                    # El email ya tiene una cuenta creada con usuario y contraseña.
                    raise HTTPException(
                        409,
                        "Ya hay una cuenta con el email de esta cuenta de Google. Entra con tu usuario y contraseña.",
                    )
                if reg.status_code == 429:
                    raise HTTPException(429, "Se han creado muchas cuentas seguidas. Espera un rato y vuelve a probar.")
                if reg.status_code != 201:
                    logger.error("Registro en la API falló: %s %s", reg.status_code, reg.text[:200])
                    raise HTTPException(502, "La API no ha podido crear la cuenta")
                logger.info("Cuenta nueva creada para un usuario de Google: %s", username)
                res = login()

            if res.status_code == 429:
                raise HTTPException(429, "Demasiados inicios de sesión seguidos. Espera un minuto.")
            if res.status_code != 200:
                logger.error("Login en la API falló: %s", res.status_code)
                raise HTTPException(502, "La API no ha aceptado el inicio de sesión")

        logger.info("Login con Google correcto: %s", username)
        return res.json()

    return app


app = create_app()
