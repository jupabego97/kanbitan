# Kanbitan

Kanbitan convierte faltantes de mostrador en compras que avanzan. Es una consola operativa para registrar solicitudes, priorizarlas, asignar proveedor, seguir su tránsito y conservar un historial auditable.

## Qué incluye

- Tablero de cinco estados: nuevas, revisión, por pedir, en tránsito y recibido.
- Vista de lista, búsqueda instantánea, filtros por prioridad y proveedor.
- Alta rápida con cantidad, contacto, proveedor y contexto.
- Detalle de solicitud con timeline de actividad y acceso a WhatsApp.
- Modo demo automático cuando la API aún no está levantada; no bloquea la exploración de la UI.
- API con transiciones de estado explícitas y eventos inmutables por solicitud.
- Migraciones Alembic separadas del proceso HTTP; SQLite sólo para desarrollo local.

## Arquitectura

- `frontend/`: Next.js App Router 16, React 19, TypeScript, Tailwind CSS 4 y primitives con la convención de shadcn/ui.
- `backend/`: FastAPI, SQLModel, PostgreSQL, Alembic y Pydantic Settings.
- `docker-compose.yml`: PostgreSQL 16 local para probar el mismo motor que Railway.

## Ejecutar localmente

### API

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
Copy-Item .env.example .env
uvicorn app.main:app --reload --port 8000
```

### Frontend

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```

Abre `http://localhost:3000`. Sin API disponible, la interfaz inicia en modo demo. Con API disponible, define `NEXT_PUBLIC_API_URL=http://localhost:8000`.

## PostgreSQL y Railway

En local puedes levantar PostgreSQL con `docker compose up -d postgres` y configurar `DATABASE_URL=postgresql://kanbitan:kanbitan@localhost:5432/kanbitan`.

En Railway:

1. Crea un servicio PostgreSQL y un servicio para `backend/`.
2. Define `ENVIRONMENT=production`, `DATABASE_URL` y `FRONTEND_ORIGIN`.
3. Ejecuta `alembic upgrade head` como paso de release antes de iniciar Uvicorn.
4. Define `NEXT_PUBLIC_API_URL` en el servicio frontend apuntando al dominio público de la API.

Las migraciones son explícitas y no se ejecutan durante una petición HTTP.

## Verificación

```powershell
cd frontend
npm run lint
npm run build

cd ..\backend
pytest
```

La carpeta `backend/tests` cubre las reglas críticas de transición. Para una revisión completa de producción todavía conviene añadir pruebas de integración PostgreSQL y un flujo E2E con Playwright.
