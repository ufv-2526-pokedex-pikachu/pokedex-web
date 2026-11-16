# Pokédex Web

Web para entrenadores que usa la [Pokédex API](https://github.com/ufv-2526-pokedex-pikachu/pokedex-api) tal cual, sin modificarla: todo lo que hace la web pasa por los endpoints de la API.

Hecha con React 19, TypeScript y Vite.

## Tests

Las reglas del minijuego de captura (`src/lib/capture.ts`), la tabla de tipos (`src/lib/typechart.ts`), el motor de combate (`src/lib/battle.ts`), la carta holográfica (`src/lib/holo.ts`) y la onda del grito (`src/lib/audio.ts`) tienen tests:

```bash
npm test
```

## Cómo arrancarla

1. Arranca la API en el puerto 8000, siguiendo su README.
2. En esta carpeta:

```bash
npm install
npm run dev
```

3. Abre http://localhost:5173 (con `localhost`, no con `127.0.0.1`: Google solo acepta los orígenes que tiene autorizados).

### Login con Google (opcional)

La API solo autentica con usuario y contraseña y no se modifica. Por eso hay un **puente** aparte, en `bridge/`:

1. La web recibe de Google un *ID token* firmado al pulsar «Continuar con Google».
2. El puente comprueba con las claves públicas de Google que el token es auténtico, que es para nuestra app y que el email está verificado.
3. Calcula un usuario y una contraseña fijos para esa cuenta de Google. La contraseña es un HMAC con un secreto que solo tiene el puente.
4. Hace login en la API con ellos; si la cuenta aún no existe, la registra primero.
5. Devuelve a la web los JWT normales de la API.

Para activarlo:

1. Crea un ID de cliente OAuth en Google Cloud (Google Auth Platform → Clientes → Aplicación web) con los orígenes `http://localhost:5173` y `http://localhost`.
2. Copia `.env.example` como `.env` en esta carpeta y pon el ID de cliente en `VITE_GOOGLE_CLIENT_ID`.
3. Copia `bridge/.env.example` como `bridge/.env` y rellénalo (el ID de cliente y un `BRIDGE_SECRET` aleatorio).
4. Arranca el puente:

```bash
cd bridge
uv venv --python 3.12 .venv
uv pip install --python .venv/Scripts/python.exe -r requirements.txt
.venv/Scripts/python -m uvicorn app:app --port 8787
```

Tests del puente (Google y la API van simulados): `.venv/Scripts/python -m pytest -q`.

Mientras la app de Google esté en modo «Prueba», solo pueden entrar los usuarios de prueba que añadas en Google Auth Platform → Público.

Si la API está en otra dirección, indícalo con `API_URL`. En PowerShell, por ejemplo: `$env:API_URL="http://127.0.0.1:9000"; npm run dev`.

## Cómo habla con la API

- **Mismo origen.** La web llama a rutas relativas (`/api/v1/...`) y el servidor de Vite las reenvía a la API (`vite.config.ts`). El navegador ve un solo origen, así que no hace falta cambiar el CORS de la API.
- **Un solo cliente.** Todas las llamadas están en `src/api/client.ts`. Ese archivo:
  - añade el token JWT a cada petición;
  - si la API responde 401, renueva la sesión una vez con `/auth/refresh`;
  - traduce los errores de la API (`detail`, los 422 de validación y los 429) a mensajes en español.
- **Pocas peticiones.** La API limita PokeAPI a 30 peticiones por minuto. Por eso los sprites del muro de Kanto se cargan directamente del repositorio público de sprites de PokeAPI, sin pasar por la API.

## Pantallas

| Pantalla | Endpoints que usa |
|---|---|
| Acceso (entrar y crear cuenta) | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `POST /auth/refresh` |
| Inicio (resumen y muro de Kanto) | `GET /pokedex/stats`, `GET /pokedex` (paginado de 100 en 100) |
| Mi Pokédex (pestañas, orden, páginas, favoritos, exportar) | `GET /pokedex` con `captured`, `favorite`, `sort`, `order`, `limit`, `offset`; `GET /pokedex/stats` para los totales; `PATCH /pokedex/{id}`; `GET /pokedex/export` |
| Capturar (buscador, hierba alta y minijuego) | `GET /pokemon/search`, `GET /pokemon/{id}`, `POST /pokedex`, `PATCH /pokedex/{id}` |
| Equipos (lista, crear, editar, ordenar, PDF) | `GET /teams`, `POST /teams`, `PUT /teams/{id}`, `GET /teams/{id}/export`; `GET /pokemon/{id}` para las stats del resumen |
| Batalla por turnos | `GET /teams`, `GET /pokemon/{id}` (stats y sprites de los dos equipos). El combate lo calcula la web (`src/lib/battle.ts`) |
| Álbum (cartas holográficas de la colección) | `GET /pokedex` (paginado de 100 en 100); las ilustraciones van por URL, sin gastar peticiones |
| Ficha de un Pokémon (carta holográfica, grito con su onda, evolución) | `GET /api/v2/pokedex` (cadena evolutiva), `GET /pokemon/{id}`, `GET /pokemon/{id}/card`, `POST /pokedex`, `PATCH /pokedex/{id}`, `DELETE /pokedex/{id}` |

## Notas sobre la API

- **Fechas de captura.** Si `capture_date` llega sin zona horaria (por ejemplo `"2026-11-16"`), la API responde 500 en vez de 422. La web nunca manda fechas así:
  - al capturar, no envía la fecha y la API pone la de hoy;
  - al elegir una fecha en la ficha, la envía con zona horaria (`toApiDate` en `src/lib/format.ts`).
- **Equipos.** La API no tiene endpoint para borrar equipos, así que la web no lo ofrece. Tampoco deja borrar de la Pokédex un Pokémon que está en un equipo: responde 409 y la web muestra su mensaje.
- **Batallas.** La API no guarda combates. El récord de victorias y derrotas se guarda solo en el navegador (`localStorage`).
- **Registros con Google.** La API permite 5 registros por hora desde la misma IP, y todos los registros con Google salen del puente. Por eso, como mucho 5 personas nuevas por hora pueden entrar con Google por primera vez; las que ya entraron antes solo hacen login.
- **Email repetido.** Si el email de la cuenta de Google ya tiene una cuenta creada con usuario y contraseña, el puente responde 409 y la web pide entrar con la contraseña.
