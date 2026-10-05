# Employee Management

A small HR admin app: employee directory, profiles, time off, Trash and a dashboard. React + Vite on the client, Express on the server, SQLite for storage. All demo data is fake.

## Requirements

Node 22 or newer.

## Install

```sh
npm install
```

## Seed

```sh
npm run seed
```

Creates `data/employees.db` with the schema and loads 37 fake employees (3 of them in the Trash). Run it again at any time to reset to the same known dataset. The first `npm run dev` also seeds an empty database automatically.

## Run

```sh
npm run dev
```

Starts the API on http://localhost:3001 and the web app on http://localhost:5173. Open the web app to see the employee directory.

## Test

```sh
npm test
```

API tests (Node built-in test runner) run against a fresh seeded in-memory database.

## Layout

- `server/src/routes/<resource>.ts`: one Express router per resource, registered in `server/src/app.ts`.
- `client/src/pages/<Screen>Page.tsx`: one component per screen, routed in `client/src/App.tsx`.
- `client/src/api/<endpoint>.ts`: one function per API endpoint, re-exported from `client/src/api/index.ts`.
