from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
import secrets
from datetime import UTC, datetime, timedelta
from typing import Annotated
from uuid import UUID

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlmodel import Session, select

from app.alegra import AlegraError, sync_catalog
from app.core.config import get_settings
from app.db import create_development_schema, engine, get_session
from app.models import (
    CatalogSyncState,
    Product,
    PurchaseRequest,
    RequestEvent,
    RequestPriority,
    RequestStatus,
    Supplier,
)
from app.schemas import (
    DashboardMetrics,
    CatalogSyncRead,
    ProductRead,
    PurchaseRequestCreate,
    PurchaseRequestList,
    PurchaseRequestRead,
    PurchaseRequestStatusUpdate,
    RequestEventRead,
    SupplierRead,
)
from app.seed import seed_development_data

settings = get_settings()
SessionDependency = Annotated[Session, Depends(get_session)]

ALLOWED_TRANSITIONS: dict[RequestStatus, set[RequestStatus]] = {
    RequestStatus.INTAKE: {RequestStatus.TRIAGE, RequestStatus.CANCELLED},
    RequestStatus.TRIAGE: {RequestStatus.INTAKE, RequestStatus.SOURCING, RequestStatus.CANCELLED},
    RequestStatus.SOURCING: {RequestStatus.TRIAGE, RequestStatus.ORDERED, RequestStatus.CANCELLED},
    RequestStatus.ORDERED: {RequestStatus.SOURCING, RequestStatus.RECEIVED},
    RequestStatus.RECEIVED: set(),
    RequestStatus.CANCELLED: {RequestStatus.INTAKE},
}


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    # Development must be effortless; production must be migration-driven.
    if settings.is_development:
        create_development_schema()
        with Session(engine) as session:
            seed_development_data(session)
    yield


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="API auditable para solicitudes y compras de Kanbitan.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.frontend_origin.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "X-Catalog-Sync-Secret"],
)


def request_read(request: PurchaseRequest, suppliers: dict[UUID, Supplier]) -> PurchaseRequestRead:
    supplier = suppliers.get(request.supplier_id) if request.supplier_id else None
    return PurchaseRequestRead(
        id=request.id,
        title=request.title,
        product_id=request.product_id,
        supplier_id=request.supplier_id,
        supplier_name=supplier.name if supplier else None,
        quantity=request.quantity,
        request_kind=request.request_kind,
        priority=request.priority,
        status=request.status,
        customer_contact=request.customer_contact,
        note=request.note,
        due_date=request.due_date,
        created_by=request.created_by,
        created_at=request.created_at,
        updated_at=request.updated_at,
    )


def supplier_lookup(session: Session, requests: list[PurchaseRequest]) -> dict[UUID, Supplier]:
    ids = {request.supplier_id for request in requests if request.supplier_id is not None}
    if not ids:
        return {}
    suppliers = session.exec(select(Supplier).where(Supplier.id.in_(ids))).all()
    return {supplier.id: supplier for supplier in suppliers}


def catalog_stale(session: Session) -> bool:
    state = session.get(CatalogSyncState, 1)
    if state is None or state.last_success_at is None:
        return True
    return datetime.now(UTC) - state.last_success_at > timedelta(minutes=max(settings.catalog_ttl_minutes, 1))


def sync_if_needed(session: Session) -> tuple[bool, str | None]:
    if not catalog_stale(session):
        return False, None
    try:
        sync_catalog_sync(session)
        return True, None
    except AlegraError as exc:
        if not settings.alegra_configured:
            raise HTTPException(
                status_code=503,
                detail={"code": "catalog_unavailable", "message": str(exc)},
            ) from exc
        if session.exec(select(Product).where(Product.is_active.is_(True))).first() is not None:
            return False, str(exc)
        raise HTTPException(status_code=503, detail={"code": "catalog_unavailable", "message": str(exc)}) from exc


def sync_catalog_sync(session: Session) -> dict:
    import asyncio

    return asyncio.run(sync_catalog(session, settings))


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "kanbitan-api"}


@app.get("/api/v1/suppliers", response_model=list[SupplierRead])
def list_suppliers(session: SessionDependency) -> list[Supplier]:
    return session.exec(
        select(Supplier).where(Supplier.is_active.is_(True)).order_by(Supplier.name)
    ).all()


@app.get("/api/v1/catalog/search", response_model=list[ProductRead])
def search_catalog(
    response: Response,
    session: SessionDependency,
    query: str = Query(default="", min_length=0, max_length=100),
) -> list[Product]:
    _, sync_error = sync_if_needed(session)
    if sync_error:
        response.headers["X-Catalog-Stale"] = "true"
        response.headers["X-Catalog-Error"] = sync_error[:160]
    term = query.strip()
    statement = select(Product).where(Product.is_active.is_(True)).order_by(Product.name).limit(20)
    if term:
        normalized = term.replace(" ", "")
        pattern = f"%{term}%"
        statement = statement.where(
            (Product.name.ilike(pattern))
            | (Product.sku.ilike(pattern))
            | (Product.barcode == normalized)
            | (Product.sku == normalized)
        )
    return list(session.exec(statement).all())


@app.post("/api/v1/catalog/sync", response_model=CatalogSyncRead)
def trigger_catalog_sync(
    session: SessionDependency,
    x_catalog_sync_secret: str | None = Header(default=None),
) -> CatalogSyncRead:
    if not settings.catalog_sync_secret or not x_catalog_sync_secret or not secrets.compare_digest(
        x_catalog_sync_secret, settings.catalog_sync_secret
    ):
        raise HTTPException(status_code=401, detail="Credencial de sincronización inválida.")
    try:
        result = sync_catalog_sync(session)
    except AlegraError as exc:
        raise HTTPException(status_code=502, detail={"code": "alegra_error", "message": str(exc)}) from exc
    return CatalogSyncRead(**result)


@app.get("/api/v1/requests", response_model=PurchaseRequestList)
def list_requests(
    session: SessionDependency,
    status_filter: RequestStatus | None = Query(default=None, alias="status"),
    supplier_id: UUID | None = None,
    query: str = Query(default="", min_length=0, max_length=100),
    limit: int = Query(default=100, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> PurchaseRequestList:
    statement = select(PurchaseRequest)
    count_statement = select(func.count()).select_from(PurchaseRequest)
    if status_filter:
        statement = statement.where(PurchaseRequest.status == status_filter)
        count_statement = count_statement.where(PurchaseRequest.status == status_filter)
    if supplier_id:
        statement = statement.where(PurchaseRequest.supplier_id == supplier_id)
        count_statement = count_statement.where(PurchaseRequest.supplier_id == supplier_id)
    if query.strip():
        statement = statement.where(PurchaseRequest.title.ilike(f"%{query.strip()}%"))
        count_statement = count_statement.where(PurchaseRequest.title.ilike(f"%{query.strip()}%"))

    total = session.exec(count_statement).one()
    page = list(
        session.exec(
            statement.order_by(PurchaseRequest.created_at.desc()).offset(offset).limit(limit)
        ).all()
    )
    suppliers = supplier_lookup(session, page)
    return PurchaseRequestList(
        items=[request_read(request, suppliers) for request in page], total=total
    )


@app.post(
    "/api/v1/requests",
    response_model=PurchaseRequestRead,
    status_code=status.HTTP_201_CREATED,
)
def create_request(payload: PurchaseRequestCreate, session: SessionDependency) -> PurchaseRequestRead:
    if payload.supplier_id and not session.get(Supplier, payload.supplier_id):
        raise HTTPException(status_code=422, detail="El proveedor seleccionado no existe.")
    if payload.product_id:
        product = session.get(Product, payload.product_id)
        if not product or not product.is_active:
            raise HTTPException(status_code=422, detail="El producto seleccionado no está disponible.")

    request = PurchaseRequest(
        **payload.model_dump(), status=RequestStatus.INTAKE, updated_at=datetime.now(UTC)
    )
    session.add(request)
    session.flush()
    session.add(
        RequestEvent(
            request_id=request.id,
            to_status=request.status,
            note="Solicitud creada",
            actor=payload.created_by,
        )
    )
    session.commit()
    session.refresh(request)
    suppliers = supplier_lookup(session, [request])
    return request_read(request, suppliers)


@app.patch("/api/v1/requests/{request_id}/status", response_model=PurchaseRequestRead)
def update_request_status(
    request_id: UUID, payload: PurchaseRequestStatusUpdate, session: SessionDependency
) -> PurchaseRequestRead:
    request = session.get(PurchaseRequest, request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada.")
    if payload.status == request.status:
        return request_read(request, supplier_lookup(session, [request]))
    if payload.status not in ALLOWED_TRANSITIONS[request.status]:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "invalid_transition",
                "message": f"No se puede mover de {request.status.value} a {payload.status.value}.",
            },
        )

    previous = request.status
    request.status = payload.status
    request.updated_at = datetime.now(UTC)
    session.add(request)
    session.add(
        RequestEvent(
            request_id=request.id,
            from_status=previous,
            to_status=payload.status,
            note=payload.note,
            actor=payload.actor,
        )
    )
    session.commit()
    session.refresh(request)
    return request_read(request, supplier_lookup(session, [request]))


@app.get("/api/v1/requests/{request_id}/events", response_model=list[RequestEventRead])
def request_events(request_id: UUID, session: SessionDependency) -> list[RequestEvent]:
    if not session.get(PurchaseRequest, request_id):
        raise HTTPException(status_code=404, detail="Solicitud no encontrada.")
    return list(
        session.exec(
            select(RequestEvent)
            .where(RequestEvent.request_id == request_id)
            .order_by(RequestEvent.created_at.desc())
        ).all()
    )


@app.get("/api/v1/dashboard", response_model=DashboardMetrics)
def dashboard_metrics(session: SessionDependency) -> DashboardMetrics:
    requests = list(session.exec(select(PurchaseRequest)).all())
    now = datetime.now(UTC)
    week_start = now - timedelta(days=7)
    open_statuses = {
        RequestStatus.INTAKE,
        RequestStatus.TRIAGE,
        RequestStatus.SOURCING,
        RequestStatus.ORDERED,
    }
    suppliers = supplier_lookup(session, requests)
    lead_times = [
        suppliers[request.supplier_id].lead_time_days
        for request in requests
        if request.supplier_id in suppliers
        and suppliers[request.supplier_id].lead_time_days is not None
    ]
    return DashboardMetrics(
        total_open=sum(request.status in open_statuses for request in requests),
        urgent_open=sum(
            request.status in open_statuses and request.priority == RequestPriority.URGENT
            for request in requests
        ),
        ordered=sum(request.status == RequestStatus.ORDERED for request in requests),
        received_this_week=sum(
            request.status == RequestStatus.RECEIVED and request.updated_at >= week_start
            for request in requests
        ),
        average_lead_time_days=round(sum(lead_times) / len(lead_times), 1) if lead_times else None,
    )
