import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from prometheus_fastapi_instrumentator import Instrumentator

from src.config import settings
from src.database import init_db
from src.routes import bookings, rooms
from src.schemas import HealthOut

# ── OpenTelemetry setup ──────────────────────────────────────────────────────
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)


def _setup_otel(app: FastAPI) -> None:
    resource = Resource(attributes={"service.name": "bakoda-hotel-booking"})
    provider = TracerProvider(resource=resource)
    exporter = OTLPSpanExporter(endpoint=settings.otel_exporter_otlp_endpoint, insecure=True)
    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)
    FastAPIInstrumentor.instrument_app(app)
    SQLAlchemyInstrumentor().instrument()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up — initialising database tables")
    await init_db()
    yield
    logger.info("Shutting down")


app = FastAPI(
    title="Bakoda Hotel Booking API",
    version="0.1.0",
    description="MTH2526-B25 Dönem Projesi — Hotel Room Booking (Konu #15)",
    lifespan=lifespan,
)

_setup_otel(app)

# ── Prometheus metrics ───────────────────────────────────────────────────────
Instrumentator().instrument(app).expose(app)

# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(rooms.router)
app.include_router(bookings.router)


@app.get("/health", response_model=HealthOut, tags=["health"])
async def health():
    return HealthOut(status="ok")
