from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

import httpx
from sqlmodel import Session, select

from app.core.config import Settings
from app.models import CatalogSyncState, Product, Supplier


class AlegraError(RuntimeError):
    """An expected failure while reading the Alegra API."""


def _text(*values: Any) -> str | None:
    for value in values:
        if value is None:
            continue
        result = str(value).strip()
        if result:
            return result
    return None


def _number(value: Any) -> float | None:
    try:
        return float(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def _boolean(value: Any, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "si", "sí"}
    if value is None:
        return default
    return bool(value)


def _rows(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [row for row in payload if isinstance(row, dict)]
    if isinstance(payload, dict):
        for key in ("data", "items", "results"):
            if isinstance(payload.get(key), list):
                return [row for row in payload[key] if isinstance(row, dict)]
    raise AlegraError("Alegra devolvió una respuesta de catálogo no válida.")


def _barcode(row: dict[str, Any]) -> str | None:
    direct = _text(row.get("barcode"), row.get("barCode"), row.get("ean"), row.get("ean13"))
    if direct:
        return direct
    for key in ("codes", "barcodes"):
        values = row.get(key)
        if isinstance(values, list) and values:
            first = values[0]
            if isinstance(first, dict):
                return _text(first.get("code"), first.get("value"), first.get("barcode"))
            return _text(first)
    return None


@dataclass(frozen=True)
class NormalizedItem:
    alegra_id: str
    name: str
    reference: str | None
    barcode: str | None
    inventory_quantity: float | None
    inventory_enabled: bool
    source_updated_at: datetime | None
    supplier_id: str | None
    supplier_name: str | None


class AlegraClient:
    def __init__(self, settings: Settings) -> None:
        if not settings.alegra_configured:
            raise AlegraError("ALEGRA_USER y ALEGRA_TOKEN no están configurados.")
        self.base_url = settings.alegra_base_url.rstrip("/")
        self.auth = httpx.BasicAuth(settings.alegra_user, settings.alegra_token)

    async def _get_page(self, path: str, params: dict[str, Any]) -> list[dict[str, Any]]:
        try:
            async with httpx.AsyncClient(
                base_url=self.base_url,
                auth=self.auth,
                timeout=httpx.Timeout(20.0, connect=5.0),
                headers={"Accept": "application/json"},
            ) as client:
                response = await client.get(path, params=params)
                response.raise_for_status()
                return _rows(response.json())
        except httpx.HTTPStatusError as exc:
            raise AlegraError(f"Alegra respondió HTTP {exc.response.status_code}.") from exc
        except (httpx.HTTPError, ValueError) as exc:
            raise AlegraError("No fue posible comunicarse con Alegra.") from exc

    async def items(self) -> list[dict[str, Any]]:
        page_size = 30
        start = 0
        result: list[dict[str, Any]] = []
        while True:
            page = await self._get_page("/items", {"limit": page_size, "start": start})
            result.extend(page)
            if len(page) < page_size:
                return result
            start += page_size

    async def contacts(self) -> list[dict[str, Any]]:
        result: list[dict[str, Any]] = []
        start = 0
        try:
            while True:
                page = await self._get_page("/contacts", {"limit": 30, "start": start})
                result.extend(page)
                if len(page) < 30:
                    return result
                start += 30
        except AlegraError:
            # Contacts are helpful for supplier labels but must not prevent catalog sync.
            return result


def _parse_updated(row: dict[str, Any]) -> datetime | None:
    value = _text(row.get("updatedAt"), row.get("updated_at"), row.get("updateDate"))
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)
    except ValueError:
        return None


def normalize_item(row: dict[str, Any]) -> NormalizedItem | None:
    alegra_id = _text(row.get("id"))
    name = _text(row.get("name"), row.get("description"))
    if not alegra_id or not name:
        return None
    inventory = row.get("inventory") if isinstance(row.get("inventory"), dict) else {}
    supplier = row.get("supplier") or row.get("provider") or {}
    supplier = supplier if isinstance(supplier, dict) else {}
    return NormalizedItem(
        alegra_id=alegra_id,
        name=name,
        reference=_text(row.get("reference"), row.get("ref"), row.get("sku"), row.get("code")),
        barcode=_barcode(row),
        inventory_quantity=_number(
            inventory.get("quantity", row.get("quantity", row.get("stock")))
        ),
        inventory_enabled=_boolean(
            row.get("inventariable", row.get("inventoryEnabled")), bool(inventory)
        ),
        source_updated_at=_parse_updated(row),
        supplier_id=_text(supplier.get("id")),
        supplier_name=_text(supplier.get("name")),
    )


def _sync_contacts(session: Session, rows: list[dict[str, Any]]) -> dict[str, Supplier]:
    suppliers: dict[str, Supplier] = {}
    for row in rows:
        remote_id = _text(row.get("id"))
        name = _text(row.get("name"), row.get("company"))
        if not remote_id or not name:
            continue
        contact_type = str(row.get("type", "")).lower()
        if contact_type and contact_type not in {"provider", "supplier", "both", "proveedor"}:
            continue
        supplier = session.exec(select(Supplier).where(Supplier.alegra_id == remote_id)).first()
        if supplier is None:
            supplier = Supplier(alegra_id=remote_id, name=name)
        else:
            supplier.name = name
        session.add(supplier)
        suppliers[remote_id] = supplier
    session.flush()
    return suppliers


async def sync_catalog(session: Session, settings: Settings) -> dict[str, Any]:
    state = session.get(CatalogSyncState, 1) or CatalogSyncState(id=1)
    state.status = "syncing"
    state.last_attempt_at = datetime.now(UTC)
    state.last_error = None
    session.add(state)
    session.commit()

    try:
        client = AlegraClient(settings)
        raw_items, contacts = await asyncio.gather(client.items(), client.contacts())
        suppliers = _sync_contacts(session, contacts)
        synced_at = datetime.now(UTC)
        seen: set[str] = set()
        count = 0
        for row in raw_items:
            item = normalize_item(row)
            if item is None:
                continue
            seen.add(item.alegra_id)
            product = session.exec(select(Product).where(Product.alegra_id == item.alegra_id)).first()
            if product is None:
                product = Product(alegra_id=item.alegra_id, name=item.name)
            product.name = item.name
            product.sku = item.reference
            product.barcode = item.barcode
            product.inventory_quantity = item.inventory_quantity
            product.inventory_enabled = item.inventory_enabled
            product.source_updated_at = item.source_updated_at
            product.last_synced_at = synced_at
            product.is_active = True
            if item.supplier_id and item.supplier_id in suppliers:
                product.preferred_supplier_id = suppliers[item.supplier_id].id
            session.add(product)
            count += 1

        for product in session.exec(select(Product)).all():
            if product.alegra_id not in seen:
                product.is_active = False
                session.add(product)
        state.status = "success"
        state.item_count = count
        state.last_success_at = synced_at
        state.last_error = None
        session.add(state)
        session.commit()
        return {
            "status": "success",
            "item_count": count,
            "last_success_at": synced_at,
            "stale": False,
        }
    except AlegraError as exc:
        session.rollback()
        state = session.get(CatalogSyncState, 1) or CatalogSyncState(id=1)
        state.status = "error"
        state.last_error = str(exc)
        state.last_attempt_at = datetime.now(UTC)
        session.add(state)
        session.commit()
        raise
