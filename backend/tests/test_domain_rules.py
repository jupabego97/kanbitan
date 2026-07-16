from app.main import ALLOWED_TRANSITIONS
from app.models import RequestStatus


def test_received_is_terminal() -> None:
    assert ALLOWED_TRANSITIONS[RequestStatus.RECEIVED] == set()


def test_intake_can_be_cancelled_or_triaged() -> None:
    assert ALLOWED_TRANSITIONS[RequestStatus.INTAKE] == {
        RequestStatus.TRIAGE,
        RequestStatus.CANCELLED,
    }


def test_cancelled_requests_can_be_reopened() -> None:
    assert ALLOWED_TRANSITIONS[RequestStatus.CANCELLED] == {RequestStatus.INTAKE}
