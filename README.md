# Kanbitan

Kanbitan convierte faltantes de mostrador en compras que avanzan. Es una consola operativa para registrar solicitudes, priorizarlas, asignar proveedor, seguir su tránsito y conservar un historial auditable.

## Qué incluye

- Tablero de cinco estados: nuevas, revisión, por pedir, en tránsito y recibido.
- Vista de lista, búsqueda instantánea, filtros por prioridad y proveedor.
- Alta rápida con cantidad, contacto, proveedor y contexto.
- Detalle de solicitud con timeline de actividad y acceso a WhatsApp.
- Mostrador de entrada con búsqueda por nombre, referencia y código de barras desde Alegra.
- Tablero operativo separado en `/tablero`, con historial auditable de cada solicitud.
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

Abre `http://localhost:3000`. Define `NEXT_PUBLIC_API_URL=http://localhost:8000` para conectar el frontend con la API. El modo demo sólo se mantiene para desarrollo local.

## PostgreSQL y Railway

En local puedes levantar PostgreSQL con `docker compose up -d postgres` y configurar `DATABASE_URL=postgresql://kanbitan:kanbitan@localhost:5432/kanbitan`.

En Railway:

1. Crea un servicio PostgreSQL y un servicio para `backend/`.
2. Define `ENVIRONMENT=production`, `DATABASE_URL`, `FRONTEND_ORIGIN`, `ALEGRA_USER`, `ALEGRA_TOKEN` y `CATALOG_SYNC_SECRET` en el servicio API. Las credenciales de Alegra sólo viven en backend.
3. Ejecuta `alembic upgrade head` como paso de release antes de iniciar Uvicorn. Deja el Start Command del backend vacío para usar el Dockerfile, o configúralo como `python start.py`.
4. Define `NEXT_PUBLIC_API_URL` en el servicio frontend apuntando al dominio público de la API.
5. Ejecuta `POST /api/v1/catalog/sync` con `X-Catalog-Sync-Secret` al desplegar y consulta `GET /api/v1/catalog/sync` para ver el estado. La sincronización se procesa en segundo plano para no bloquear Railway. Las búsquedas actualizan automáticamente el índice cuando supera `CATALOG_TTL_MINUTES`; una ejecución atascada se puede recuperar después de `CATALOG_SYNC_STALE_MINUTES`.

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
