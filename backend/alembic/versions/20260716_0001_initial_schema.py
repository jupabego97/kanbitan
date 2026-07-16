"""initial Kanbitan workflow schema

Revision ID: 20260716_0001
Revises:
Create Date: 2026-07-16
"""

import sqlalchemy as sa
from alembic import op

revision = "20260716_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    status = sa.Enum("intake", "triage", "sourcing", "ordered", "received", "cancelled", name="requeststatus")
    priority = sa.Enum("urgent", "high", "normal", "low", name="requestpriority")
    status.create(op.get_bind(), checkfirst=True)
    priority.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "suppliers",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False, unique=True),
        sa.Column("lead_time_days", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_suppliers_name", "suppliers", ["name"])
    op.create_table(
        "products",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("name", sa.String(length=180), nullable=False),
        sa.Column("sku", sa.String(length=80), nullable=True),
        sa.Column("barcode", sa.String(length=80), nullable=True),
        sa.Column("preferred_supplier_id", sa.Uuid(), sa.ForeignKey("suppliers.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_products_name", "products", ["name"])
    op.create_index("ix_products_sku", "products", ["sku"])
    op.create_index("ix_products_barcode", "products", ["barcode"])
    op.create_table(
        "purchase_requests",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("product_id", sa.Uuid(), sa.ForeignKey("products.id"), nullable=True),
        sa.Column("supplier_id", sa.Uuid(), sa.ForeignKey("suppliers.id"), nullable=True),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("priority", priority, nullable=False, server_default="normal"),
        sa.Column("status", status, nullable=False, server_default="intake"),
        sa.Column("customer_contact", sa.String(length=120), nullable=True),
        sa.Column("note", sa.String(length=1000), nullable=True),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.String(length=80), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("quantity > 0", name="ck_purchase_requests_positive_quantity"),
    )
    op.create_index("ix_purchase_requests_status", "purchase_requests", ["status"])
    op.create_index("ix_purchase_requests_supplier_id", "purchase_requests", ["supplier_id"])
    op.create_index("ix_purchase_requests_created_at", "purchase_requests", ["created_at"])
    op.create_table(
        "request_events",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("request_id", sa.Uuid(), sa.ForeignKey("purchase_requests.id", ondelete="CASCADE"), nullable=False),
        sa.Column("from_status", status, nullable=True),
        sa.Column("to_status", status, nullable=False),
        sa.Column("note", sa.String(length=1000), nullable=True),
        sa.Column("actor", sa.String(length=80), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_request_events_request_id", "request_events", ["request_id"])


def downgrade() -> None:
    op.drop_table("request_events")
    op.drop_table("purchase_requests")
    op.drop_table("products")
    op.drop_table("suppliers")
    sa.Enum(name="requestpriority").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="requeststatus").drop(op.get_bind(), checkfirst=True)
