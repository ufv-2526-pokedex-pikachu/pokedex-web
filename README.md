# Pokédex Web

Web para entrenadores que usa la [Pokédex API](https://github.com/ufv-2526-pokedex-pikachu/pokedex-api) tal cual, sin modificarla: todo lo que hace la web pasa por los endpoints de la API.

Hecha con React 19, TypeScript y Vite.

## Tests

Las reglas del minijuego de captura (`src/lib/capture.ts`) y la tabla de tipos (`src/lib/typechart.ts`) tienen tests:

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

3. Abre http://localhost:5173.

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
| Ficha de un Pokémon | `GET /pokemon/{id}`, `GET /pokemon/{id}/card`, `POST /pokedex`, `PATCH /pokedex/{id}`, `DELETE /pokedex/{id}` |

## Notas sobre la API

- **Fechas de captura.** Si `capture_date` llega sin zona horaria (por ejemplo `"2026-11-16"`), la API responde 500 en vez de 422. La web nunca manda fechas así:
  - al capturar, no envía la fecha y la API pone la de hoy;
  - al elegir una fecha en la ficha, la envía con zona horaria (`toApiDate` en `src/lib/format.ts`).
- **Equipos.** La API no tiene endpoint para borrar equipos, así que la web no lo ofrece. Tampoco deja borrar de la Pokédex un Pokémon que está en un equipo: responde 409 y la web muestra su mensaje.
