from fastapi import APIRouter, Query

from ..services import ytmusic
from ..services.models import SearchResponse

router = APIRouter()


@router.get("/search", response_model=SearchResponse)
def search(
    q: str = Query(..., min_length=1),
    type: str | None = Query(None, description="songs|albums|artists|playlists"),
    limit: int = Query(20, ge=1, le=40),
):
    return ytmusic.search(q, filter=type, limit=limit)
