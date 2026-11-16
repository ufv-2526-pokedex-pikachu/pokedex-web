"""Tests del puente: Google y la API van simulados, no se usa la red."""
import json

import httpx
import pytest
from fastapi.testclient import TestClient

import app as bridge

CLAIMS = {"sub": "109876543210987654321", "email": "ash.ketchum@gmail.com", "email_verified": True}


@pytest.fixture(autouse=True)
def configured(monkeypatch):
    monkeypatch.setattr(bridge, "GOOGLE_CLIENT_ID", "test-client.apps.googleusercontent.com")
    monkeypatch.setattr(bridge, "BRIDGE_SECRET", "secreto-de-prueba")


class FakeApi:
    """Imita la Pokédex API: usuarios en memoria, login y register."""

    def __init__(self, emails_taken=()):
        self.users: dict[str, str] = {}
        self.emails = set(emails_taken)
        self.calls: list[str] = []

    def handler(self, request: httpx.Request) -> httpx.Response:
        self.calls.append(request.url.path)
        if request.url.path == "/api/v1/auth/login":
            form = httpx.QueryParams(request.content.decode())
            if self.users.get(form["username"]) == form["password"]:
                return httpx.Response(200, json={"access_token": "a", "refresh_token": "r", "token_type": "bearer"})
            return httpx.Response(401, json={"detail": "Credenciales incorrectas"})
        if request.url.path == "/api/v1/auth/register":
            body = json.loads(request.content)
            if body["email"] in self.emails or body["username"] in self.users:
                return httpx.Response(409, json={"detail": "Ya existe"})
            self.users[body["username"]] = body["password"]
            self.emails.add(body["email"])
            return httpx.Response(201, json={"id": 1})
        return httpx.Response(404)


def client(fake: FakeApi, verify=lambda c: CLAIMS) -> TestClient:
    return TestClient(bridge.create_app(verify=verify, transport=httpx.MockTransport(fake.handler)))


def test_password_cumple_la_politica_de_la_api_y_depende_del_secreto():
    p = bridge.derive_password("123", "s1")
    assert len(p) >= 8 and any(c.isupper() for c in p) and any(c.isdigit() for c in p)
    assert len(p.encode()) <= 72
    assert p == bridge.derive_password("123", "s1")
    assert p != bridge.derive_password("123", "s2")
    assert p != bridge.derive_password("124", "s1")


def test_usuario_legible_y_dentro_de_los_limites():
    u = bridge.derive_username("Ash.Ketchum+tv@gmail.com", "109876543210987654321")
    assert u == "ash.ketchumtv-g54321"
    assert 3 <= len(bridge.derive_username("x" * 80 + "@a.com", "1" * 21)) <= 50


def test_primera_vez_registra_y_entra():
    fake = FakeApi()
    r = client(fake).post("/bridge/google", json={"credential": "token"})
    assert r.status_code == 200 and r.json()["access_token"] == "a"
    assert fake.calls == ["/api/v1/auth/login", "/api/v1/auth/register", "/api/v1/auth/login"]


def test_segunda_vez_solo_hace_login():
    fake = FakeApi()
    client(fake).post("/bridge/google", json={"credential": "token"})
    fake.calls.clear()
    r = client(fake).post("/bridge/google", json={"credential": "token"})
    assert r.status_code == 200
    assert fake.calls == ["/api/v1/auth/login"]


def test_token_falso_da_401_sin_tocar_la_api():
    fake = FakeApi()

    def reject(_):
        raise ValueError("firma no válida")

    r = client(fake, verify=reject).post("/bridge/google", json={"credential": "falso"})
    assert r.status_code == 401
    assert fake.calls == []


def test_email_ya_registrado_con_contrasena_da_409():
    fake = FakeApi(emails_taken={"ash.ketchum@gmail.com"})
    r = client(fake).post("/bridge/google", json={"credential": "token"})
    assert r.status_code == 409
    assert "usuario y contraseña" in r.json()["detail"]


def test_sin_configurar_da_503(monkeypatch):
    monkeypatch.setattr(bridge, "BRIDGE_SECRET", "")
    r = client(FakeApi()).post("/bridge/google", json={"credential": "token"})
    assert r.status_code == 503
