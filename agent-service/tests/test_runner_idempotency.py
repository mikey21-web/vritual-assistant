import pytest
from app.idempotency import init, close, already_processed, mark_processing


@pytest.mark.asyncio
async def test_in_memory_dedupe():
    await init(None)

    assert not await already_processed("trigger-1")
    await mark_processing("trigger-1")
    assert await already_processed("trigger-1")
    assert not await already_processed("trigger-2")

    await close()


@pytest.mark.asyncio
async def test_in_memory_reset():
    await init(None)

    assert not await already_processed("trigger-3")
    await mark_processing("trigger-3")
    assert await already_processed("trigger-3")

    await close()
