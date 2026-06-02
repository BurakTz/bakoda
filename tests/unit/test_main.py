from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

import src.main as main_module
from src.main import app, health, lifespan


@pytest.mark.asyncio
async def test_health_endpoint_returns_ok():
    result = await health()
    assert result.status == "ok"


@pytest.mark.asyncio
async def test_lifespan_runs_migrations():
    with patch("src.main.init_db", AsyncMock()) as init_db:
        async with lifespan(app):
            init_db.assert_awaited_once()


@pytest.mark.asyncio
async def test_health_http_without_running_migrations():
    with patch("src.main.init_db", AsyncMock()):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/health")

    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["version"] == "0.1.0"


def test_setup_otel_instruments_app_without_network():
    """_setup_otel app'i enstrümante eder; gerçek OTLP bağlantısı kurulmaz."""
    with (
        patch("src.main.OTLPSpanExporter"),
        patch("src.main.BatchSpanProcessor"),
        patch("src.main.TracerProvider"),
        patch("src.main.trace.set_tracer_provider"),
        patch("src.main.FastAPIInstrumentor") as fastapi_instr,
        patch("src.main.SQLAlchemyInstrumentor") as sqla_instr,
    ):
        main_module._setup_otel(app)

    fastapi_instr.instrument_app.assert_called_once_with(app)
    sqla_instr.return_value.instrument.assert_called_once()
