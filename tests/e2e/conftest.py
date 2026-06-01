"""
Shared fixtures for E2E tests (API + browser).

Requires a running app at BASE_URL (default http://localhost:8000), e.g. docker compose up.
"""
from __future__ import annotations

import os
import urllib.error
import urllib.request

import pytest

BASE_URL = os.getenv("BASE_URL", "http://localhost:8000").rstrip("/")


def _app_is_up() -> bool:
    try:
        with urllib.request.urlopen(f"{BASE_URL}/health", timeout=5) as resp:
            return resp.status == 200
    except (urllib.error.URLError, TimeoutError, OSError):
        return False


@pytest.fixture(scope="session")
def browser_context_args(browser_context_args: dict) -> dict:
    """pytest-playwright: resolve relative URLs against BASE_URL."""
    return {**browser_context_args, "base_url": BASE_URL}


@pytest.fixture(scope="session", autouse=True)
def require_live_app() -> None:
    if not _app_is_up():
        pytest.skip(f"Live app not reachable at {BASE_URL} (start server, then re-run E2E)")
