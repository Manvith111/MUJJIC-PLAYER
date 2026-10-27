"""Download endpoint.

The app fetches audio bytes from here (via expo-file-system) and stores them on
the device for offline playback. Runs yt-dlp + ffmpeg to produce an m4a file.
"""
import anyio
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from ..services import ytdlp

router = APIRouter()


@router.get("/download/{video_id}")
async def download(video_id: str):
    try:
        # yt-dlp/ffmpeg is blocking; run it off the event loop.
        path = await anyio.to_thread.run_sync(ytdlp.download_audio, video_id)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"download failed: {exc}") from exc

    return FileResponse(
        path,
        media_type="audio/mp4",
        filename=f"{video_id}.m4a",
    )
