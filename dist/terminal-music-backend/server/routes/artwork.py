"""Artwork proxy.

Returns a track/video thumbnail through the server so the app has one stable
host for images (handy once everything moves behind the user's own server).
"""
import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

router = APIRouter()

# Try progressively lower-res fallbacks; maxres isn't always present.
_CANDIDATES = ["maxresdefault", "sddefault", "hqdefault", "mqdefault", "default"]


@router.get("/artwork/{video_id}")
async def artwork(video_id: str):
    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
        for name in _CANDIDATES:
            url = f"https://i.ytimg.com/vi/{video_id}/{name}.jpg"
            try:
                r = await client.get(url)
            except httpx.HTTPError:
                continue
            # YouTube serves a 120x90 placeholder for missing sizes; skip tiny ones.
            if r.status_code == 200 and len(r.content) > 1200:
                return Response(
                    content=r.content,
                    media_type=r.headers.get("content-type", "image/jpeg"),
                    headers={"Cache-Control": "public, max-age=86400"},
                )
    raise HTTPException(status_code=404, detail="artwork not found")
