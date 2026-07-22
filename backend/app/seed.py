from datetime import UTC, datetime, timedelta

from sqlmodel import Session, select

from app.models import (
    Product,
    PurchaseRequest,
    RequestEvent,
    RequestPriority,
    RequestStatus,
    Supplier,
)


def seed_development_data(session: Session) -> None:
    """Creates useful demo data once, never overwriting real operating data."""
    if session.exec(select(Supplier)).first() is not None:
        return

    suppliers = [
        Supplier(name="Tecno Import", lead_time_days=3),
        Supplier(name="Distribuciones Delta", lead_time_days=5),
        Supplier(name="Nova Accesorios", lead_time_days=2),
    ]
    session.add_all(suppliers)
    session.flush()

    products = [
        Product(alegra_id="demo-msd-128", name="Memoria MicroSD 128 GB", sku="MSD-128", preferred_supplier_id=suppliers[0].id),
        Product(alegra_id="demo-cab-usbc-2", name="Cable USB-C trenzado 2 m", sku="CAB-USBC-2", preferred_supplier_id=suppliers[2].id),
        Product(alegra_id="demo-gan-65", name="Cargador GaN 65 W", sku="GAN-65", preferred_supplier_id=suppliers[1].id),
    ]
    session.add_all(products)
    session.flush()

    now = datetime.now(UTC)
    requests = [
        PurchaseRequest(
            title="Memoria MicroSD 128 GB",
            product_id=products[0].id,
            supplier_id=suppliers[0].id,
            quantity=6,
            priority=RequestPriority.URGENT,
            status=RequestStatus.TRIAGE,
            customer_contact="300 123 4567",
            note="Cliente espera confirmación hoy.",
            due_date=now + timedelta(days=1),
        ),
        PurchaseRequest(
            title="Cargador GaN 65 W",
            product_id=products[2].id,
            supplier_id=suppliers[1].id,
            quantity=3,
            priority=RequestPriority.HIGH,
            status=RequestStatus.SOURCING,
            note="Comparar precio entre dos distribuidores.",
            due_date=now + timedelta(days=2),
        ),
        PurchaseRequest(
            title="Cable USB-C trenzado 2 m",
            product_id=products[1].id,
            supplier_id=suppliers[2].id,
            quantity=12,
            priority=RequestPriority.NORMAL,
            status=RequestStatus.ORDERED,
            due_date=now + timedelta(days=3),
        ),
        PurchaseRequest(
            title="Adaptador HDMI a USB-C",
            quantity=4,
            priority=RequestPriority.NORMAL,
            status=RequestStatus.INTAKE,
            note="Faltante recurrente en mostrador.",
        ),
    ]
    session.add_all(requests)
    session.flush()
    session.add_all(
        [
            RequestEvent(request_id=request.id, to_status=request.status, actor="Sistema")
            for request in requests
        ]
    )
    session.commit()
