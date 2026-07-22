import uuid
from datetime import UTC, datetime
from enum import Enum

from sqlmodel import Field, SQLModel


def now_utc() -> datetime:
    return datetime.now(UTC)


class RequestStatus(str, Enum):
    INTAKE = "intake"
    TRIAGE = "triage"
    SOURCING = "sourcing"
    ORDERED = "ordered"
    RECEIVED = "received"
    CANCELLED = "cancelled"


class RequestPriority(str, Enum):
    URGENT = "urgent"
    HIGH = "high"
    NORMAL = "normal"
    LOW = "low"


class RequestKind(str, Enum):
    OUT_OF_STOCK = "out_of_stock"
    NEW_PRODUCT = "new_product"


class Supplier(SQLModel, table=True):
    __tablename__ = "suppliers"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    alegra_id: str | None = Field(default=None, index=True, unique=True, max_length=80)
    name: str = Field(index=True, unique=True, min_length=2, max_length=120)
    lead_time_days: int | None = Field(default=None, ge=0, le=365)
    is_active: bool = Field(default=True, index=True)
    created_at: datetime = Field(default_factory=now_utc, nullable=False)


class Product(SQLModel, table=True):
    __tablename__ = "products"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    alegra_id: str = Field(index=True, unique=True, max_length=80)
    name: str = Field(index=True, min_length=2, max_length=180)
    sku: str | None = Field(default=None, index=True, max_length=80)
    barcode: str | None = Field(default=None, index=True, max_length=80)
    inventory_quantity: float | None = Field(default=None)
    inventory_enabled: bool = Field(default=False, index=True)
    source_updated_at: datetime | None = Field(default=None)
    last_synced_at: datetime = Field(default_factory=now_utc, nullable=False, index=True)
    is_active: bool = Field(default=True, index=True)
    preferred_supplier_id: uuid.UUID | None = Field(
        default=None, foreign_key="suppliers.id", index=True
    )
    created_at: datetime = Field(default_factory=now_utc, nullable=False)


class PurchaseRequest(SQLModel, table=True):
    __tablename__ = "purchase_requests"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    title: str = Field(index=True, min_length=2, max_length=180)
    product_id: uuid.UUID | None = Field(default=None, foreign_key="products.id", index=True)
    supplier_id: uuid.UUID | None = Field(default=None, foreign_key="suppliers.id", index=True)
    quantity: int = Field(default=1, ge=1, le=100_000)
    request_kind: RequestKind = Field(default=RequestKind.OUT_OF_STOCK, index=True)
    priority: RequestPriority = Field(default=RequestPriority.NORMAL, index=True)
    status: RequestStatus = Field(default=RequestStatus.INTAKE, index=True)
    customer_contact: str | None = Field(default=None, max_length=120)
    note: str | None = Field(default=None, max_length=1_000)
    due_date: datetime | None = Field(default=None, index=True)
    created_by: str = Field(default="Mostrador", max_length=80)
    created_at: datetime = Field(default_factory=now_utc, nullable=False, index=True)
    updated_at: datetime = Field(default_factory=now_utc, nullable=False)


class RequestEvent(SQLModel, table=True):
    __tablename__ = "request_events"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    request_id: uuid.UUID = Field(foreign_key="purchase_requests.id", index=True)
    from_status: RequestStatus | None = Field(default=None)
    to_status: RequestStatus = Field(index=True)
    note: str | None = Field(default=None, max_length=1_000)
    actor: str = Field(default="Mostrador", max_length=80)
    created_at: datetime = Field(default_factory=now_utc, nullable=False, index=True)


class CatalogSyncState(SQLModel, table=True):
    __tablename__ = "catalog_sync_state"

    id: int = Field(default=1, primary_key=True)
    status: str = Field(default="never_synced", max_length=40)
    item_count: int = Field(default=0)
    last_attempt_at: datetime | None = Field(default=None)
    last_success_at: datetime | None = Field(default=None, index=True)
    last_error: str | None = Field(default=None, max_length=500)
