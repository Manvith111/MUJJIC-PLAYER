from fastapi import APIRouter, HTTPException

from ..services import ytmusic

router = APIRouter()


@router.get("/lyrics/{video_id}")
def lyrics(video_id: str):
    try:
        data = ytmusic.lyrics(video_id)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"lyrics failed: {exc}") from exc
    if not data:
        raise HTTPException(status_code=404, detail="no lyrics")
    return data


@router.get("/synced/{video_id}")
def synced(video_id: str):
    try:
        data = ytmusic.synced_lyrics(video_id)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"synced failed: {exc}") from exc
    if not data or not data.get("synced"):
        raise HTTPException(status_code=404, detail="no synced lyrics")
    return data
