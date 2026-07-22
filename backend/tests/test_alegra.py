import asyncio

import pytest

from app.alegra import AlegraClient, AlegraError, normalize_item
from app.core.config import Settings


def test_normalize_item_prefers_explicit_barcode_and_maps_inventory() -> None:
    item = normalize_item(
        {
            "id": 42,
            "name": "Cargador USB-C",
            "reference": "CAR-01",
            "barCode": "7701234567890",
            "inventariable": True,
            "inventory": {"quantity": 7},
            "supplier": {"id": 9, "name": "Distribuciones Delta"},
        }
    )

    assert item is not None
    assert item.alegra_id == "42"
    assert item.reference == "CAR-01"
    assert item.barcode == "7701234567890"
    assert item.inventory_quantity == 7
    assert item.inventory_enabled is True
    assert item.supplier_id == "9"


def test_normalize_item_skips_rows_without_identity() -> None:
    assert normalize_item({"name": "Sin id"}) is None
    assert normalize_item({"id": 1}) is None


def test_items_paginates_in_batches_of_thirty(monkeypatch: pytest.MonkeyPatch) -> None:
    settings = Settings(alegra_user="user@example.com", alegra_token="secret")
    client = AlegraClient(settings)
    calls: list[tuple[str, dict[str, int]]] = []

    async def fake_page(path: str, params: dict[str, int]) -> list[dict[str, int]]:
        calls.append((path, params))
        if params["start"] == 0:
            return [{"id": index} for index in range(30)]
        return [{"id": 30}]

    monkeypatch.setattr(client, "_get_page", fake_page)
    result = asyncio.run(client.items())

    assert len(result) == 31
    assert calls == [("/items", {"limit": 30, "start": 0}), ("/items", {"limit": 30, "start": 30})]


def test_client_rejects_missing_credentials() -> None:
    with pytest.raises(AlegraError, match="ALEGRA_USER"):
        AlegraClient(Settings())
