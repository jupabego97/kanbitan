"""Add Alegra-backed catalog fields and request kind."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "20260722_0002"
down_revision = "20260716_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    request_kind = postgresql.ENUM(
        "out_of_stock", "new_product", name="requestkind", create_type=False
    )
    request_kind.create(bind, checkfirst=True)

    op.add_column("suppliers", sa.Column("alegra_id", sa.String(length=80), nullable=True))
    op.create_index("ix_suppliers_alegra_id", "suppliers", ["alegra_id"], unique=True)

    op.add_column("products", sa.Column("alegra_id", sa.String(length=80), nullable=True))
    op.add_column("products", sa.Column("inventory_quantity", sa.Float(), nullable=True))
    op.add_column("products", sa.Column("inventory_enabled", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("products", sa.Column("source_updated_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("products", sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("products", sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.create_index("ix_products_alegra_id", "products", ["alegra_id"], unique=True)
    op.create_index("ix_products_last_synced_at", "products", ["last_synced_at"])
    op.create_index("ix_products_is_active", "products", ["is_active"])
    op.execute("UPDATE products SET alegra_id = 'legacy-' || id::text WHERE alegra_id IS NULL")
    op.execute("UPDATE products SET last_synced_at = CURRENT_TIMESTAMP WHERE last_synced_at IS NULL")
    op.alter_column("products", "alegra_id", nullable=False)
    op.alter_column("products", "last_synced_at", nullable=False)

    op.add_column(
        "purchase_requests",
        sa.Column("request_kind", request_kind, nullable=False, server_default="out_of_stock"),
    )

    op.create_table(
        "catalog_sync_state",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="never_synced"),
        sa.Column("item_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_attempt_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_success_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error", sa.String(length=500), nullable=True),
    )
    op.create_index("ix_catalog_sync_state_last_success_at", "catalog_sync_state", ["last_success_at"])


def downgrade() -> None:
    op.drop_index("ix_catalog_sync_state_last_success_at", table_name="catalog_sync_state")
    op.drop_table("catalog_sync_state")
    op.drop_column("purchase_requests", "request_kind")
    op.drop_index("ix_products_is_active", table_name="products")
    op.drop_index("ix_products_last_synced_at", table_name="products")
    op.drop_index("ix_products_alegra_id", table_name="products")
    op.drop_column("products", "is_active")
    op.drop_column("products", "last_synced_at")
    op.drop_column("products", "source_updated_at")
    op.drop_column("products", "inventory_enabled")
    op.drop_column("products", "inventory_quantity")
    op.drop_column("products", "alegra_id")
    op.drop_index("ix_suppliers_alegra_id", table_name="suppliers")
    op.drop_column("suppliers", "alegra_id")
    sa.Enum(name="requestkind").drop(op.get_bind(), checkfirst=True)
