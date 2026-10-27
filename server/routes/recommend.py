from fastapi import APIRouter, HTTPException, Query

from ..services import ytmusic
from ..services.models import Track

router = APIRouter()


@router.get("/recommend/{video_id}", response_model=list[Track])
def recommend(video_id: str, limit: int = Query(25, ge=1, le=50)):
    try:
        return ytmusic.radio(video_id, limit=limit)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"recommend failed: {exc}") from exc
