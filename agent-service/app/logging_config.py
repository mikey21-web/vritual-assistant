import uuid
from datetime import datetime, timezone

import structlog
import logging


def setup_logging() -> None:
    import sys
    structlog.configure(
        processors=[
            structlog.dev.ConsoleRenderer(),
        ],
        cache_logger_on_first_use=True,
    )


def new_run_id() -> str:
    return str(uuid.uuid4())


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
