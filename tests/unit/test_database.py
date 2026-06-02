from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.database import _run_alembic_upgrade, get_db, init_db


@pytest.mark.asyncio
async def test_get_db_yields_session():
    mock_session = AsyncMock()

    class FakeCtx:
        async def __aenter__(self):
            return mock_session

        async def __aexit__(self, *args):
            return None

    with patch("src.database.AsyncSessionLocal", return_value=FakeCtx()):
        gen = get_db()
        session = await anext(gen)
        assert session is mock_session
        with pytest.raises(StopAsyncIteration):
            await anext(gen)


def test_run_alembic_upgrade_invokes_command():
    mock_cfg = MagicMock()
    with (
        patch("alembic.config.Config", return_value=mock_cfg) as cfg_cls,
        patch("alembic.command.upgrade") as upgrade,
        patch.dict("os.environ", {"DATABASE_URL": "postgresql+asyncpg://test/db"}, clear=False),
    ):
        _run_alembic_upgrade()

    cfg_cls.assert_called_once_with("alembic.ini")
    mock_cfg.set_main_option.assert_called_once()
    upgrade.assert_called_once_with(mock_cfg, "head")


@pytest.mark.asyncio
async def test_init_db_delegates_to_thread():
    with (
        patch("src.database.asyncio.to_thread", AsyncMock()) as to_thread,
        patch("src.database._run_alembic_upgrade"),
    ):
        await init_db()
        to_thread.assert_awaited_once()
