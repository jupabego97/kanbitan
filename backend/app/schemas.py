import uuid
from datetime import datetime

from pydantic import ConfigDict
from sqlmodel import Field, SQLModel

from app.models import RequestKind, RequestPriority, RequestStatus


class SupplierRead(SQLModel):
    id: uuid.UUID
    alegra_id: str | None
    name: str
    lead_time_days: int | None


class ProductRead(SQLModel):
    id: uuid.UUID
    alegra_id: str
    name: str
    sku: str | None
    barcode: str | None
    inventory_quantity: float | None
    inventory_enabled: bool
    source_updated_at: datetime | None
    last_synced_at: datetime
    preferred_supplier_id: uuid.UUID | None


class CatalogSyncRead(SQLModel):
    status: str
    item_count: int
    last_attempt_at: datetime | None = None
    last_success_at: datetime | None
    stale: bool
    message: str | None = None


class PurchaseRequestCreate(SQLModel):
    title: str = Field(min_length=2, max_length=180)
    product_id: uuid.UUID | None = None
    supplier_id: uuid.UUID | None = None
    quantity: int = Field(default=1, ge=1, le=100_000)
    request_kind: RequestKind = RequestKind.OUT_OF_STOCK
    priority: RequestPriority = RequestPriority.NORMAL
    customer_contact: str | None = Field(default=None, max_length=120)
    note: str | None = Field(default=None, max_length=1_000)
    due_date: datetime | None = None
    created_by: str = Field(default="Mostrador", min_length=2, max_length=80)


class PurchaseRequestStatusUpdate(SQLModel):
    status: RequestStatus
    note: str | None = Field(default=None, max_length=1_000)
    actor: str = Field(default="Operaciones", min_length=2, max_length=80)


class PurchaseRequestRead(SQLModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    product_id: uuid.UUID | None
    supplier_id: uuid.UUID | None
    supplier_name: str | None
    quantity: int
    request_kind: RequestKind
    priority: RequestPriority
    status: RequestStatus
    customer_contact: str | None
    note: str | None
    due_date: datetime | None
    created_by: str
    created_at: datetime
    updated_at: datetime


class RequestEventRead(SQLModel):
    id: uuid.UUID
    from_status: RequestStatus | None
    to_status: RequestStatus
    note: str | None
    actor: str
    created_at: datetime


class PurchaseRequestList(SQLModel):
    items: list[PurchaseRequestRead]
    total: int


class DashboardMetrics(SQLModel):
    total_open: int
    urgent_open: int
    ordered: int
    received_this_week: int
    average_lead_time_days: float | None
