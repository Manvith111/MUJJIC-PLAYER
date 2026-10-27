from fastapi import APIRouter

from ..services import ytdlp

router = APIRouter()


@router.get("/video/{video_id}")
def video(video_id: str):
    try:
        meta = ytdlp.track_meta(video_id)
        return meta
    except Exception as e:
        return {"id": video_id, "title": "Unknown", "error": str(e)}