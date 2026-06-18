from __future__ import annotations

import redis.asyncio as aioredis
import structlog

logger = structlog.get_logger()

_in_memory: dict[str, bool] = {}
_redis: aioredis.Redis | None = None
_redis_url: str | None = None

TTL_SECONDS = 86400


async def init(redis_url: str | None) -> None:
    global _redis, _redis_url, _in_memory
    _redis_url = redis_url
    _in_memory = {}
    if redis_url:
        try:
            _redis = aioredis.from_url(redis_url, decode_responses=True)
            await _redis.ping()
            logger.info("idempotency.redis_connected", url=redis_url)
        except Exception:
            logger.warning("idempotency.redis_failed", url=redis_url)
            _redis = None


async def already_processed(trigger_id: str) -> bool:
    if _redis:
        return await _redis.get(f"agent:trigger:{trigger_id}") == "1"
    return _in_memory.get(trigger_id, False)


async def mark_processing(trigger_id: str) -> None:
    if _redis:
        result = await _redis.set(f"agent:trigger:{trigger_id}", "1", nx=True, ex=TTL_SECONDS)
        if not result:
            logger.debug("idempotency_race_skipped", trigger_id=trigger_id)
    else:
        _in_memory[trigger_id] = True


async def mark_done(trigger_id: str) -> None:
    pass


async def close() -> None:
    global _redis
    if _redis:
        await _redis.aclose()
        _redis = None
