import asyncio
import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# ── OpenTelemetry setup ──────────────────────────────────────────────────────
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from prometheus_fastapi_instrumentator import Instrumentator

from src.config import settings
from src.database import init_db
from src.routes import auth, bookings, contact, hotels, payments, rooms, users
from src.schemas import HealthOut
from src.services import s3_service

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)


def _ensure_s3_images() -> None:
    """Bucket'ı oluştur, eksik otel görsellerini yükle."""
    images_dir = Path(__file__).parent.parent / "hotel_images"
    if not images_dir.exists():
        return
    s3_service.ensure_bucket()
    import boto3
    client = boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url,
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
        region_name=settings.aws_default_region,
    )
    existing = {
        obj["Key"]
        for page in client.get_paginator("list_objects_v2").paginate(
            Bucket=settings.s3_bucket_name, Prefix="hotel_images/"
        )
        for obj in page.get("Contents", [])
    }
    uploaded = 0
    for img in images_dir.iterdir():
        if img.suffix.lower() not in (".jpg", ".jpeg", ".png", ".webp"):
            continue
        key = f"hotel_images/{img.name}"
        if key not in existing:
            ct = "image/jpeg" if img.suffix.lower() in (".jpg", ".jpeg") else f"image/{img.suffix[1:]}"
            s3_service.upload_image(key, img.read_bytes(), ct)
            uploaded += 1
    if uploaded:
        logger.info("S3: %d otel görseli yüklendi", uploaded)
    else:
        logger.info("S3: tüm görseller mevcut")


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
    logger.info("Starting up — running database migrations")
    await init_db()
    try:
        await asyncio.to_thread(_ensure_s3_images)
    except Exception as e:
        logger.warning("S3 image sync failed (non-fatal): %s", e)
    yield
    logger.info("Shutting down")


app = FastAPI(
    title="Bakoda Hotel Booking API",
    version="0.1.0",
    description="MTH2526-B25 Dönem Projesi — Hotel Room Booking (Konu #15)",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# OTel'i yalnızca etkinse ve test (pytest) altında değilken kur; aksi halde
# collector yoksa (test/prod) sürekli OTLP export hatası loglanır.
if settings.otel_enabled and "pytest" not in sys.modules:
    _setup_otel(app)

# ── Prometheus metrics ───────────────────────────────────────────────────────
Instrumentator().instrument(app).expose(app)

# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api")
app.include_router(hotels.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(bookings.router, prefix="/api")
app.include_router(payments.router, prefix="/api")
app.include_router(contact.router, prefix="/api")
app.include_router(rooms.router, prefix="/api")


@app.get("/health", response_model=HealthOut, tags=["health"])
async def health():
    return HealthOut(status="ok")


# ── Frontend static files ────────────────────────────────────────────────────
class NoCacheStaticFiles(StaticFiles):
    """Tarayıcının .jsx/.html dosyalarını cache'lemesini engeller; geliştirme
    sırasında düzenlemeler hard-refresh gerektirmeden anında yansır."""

    def is_not_modified(self, response_headers, request_headers) -> bool:
        return False

    async def get_response(self, path, scope):
        response = await super().get_response(path, scope)
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        return response


_frontend_dir = Path(__file__).parent.parent / "frontend"
app.mount("/", NoCacheStaticFiles(directory=_frontend_dir, html=True), name="frontend")
