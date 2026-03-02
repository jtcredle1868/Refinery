import datetime
import uuid
from typing import Any, Optional


def api_response(
    data: Any = None,
    error: Optional[str] = None,
    success: bool = True,
    status_code: int = 200,
) -> dict:
    return {
        "success": success,
        "data": data,
        "error": error,
        "meta": {
            "request_id": str(uuid.uuid4()),
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        },
    }
