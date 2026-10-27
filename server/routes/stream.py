"""Audio streaming endpoint.

The server proxies the audio from YouTube so the phone always talks to us and
never touches an expiring / IP-locked googlevideo URL. HTTP Range headers are
forwarded both ways so the player can seek.
"""
import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from ..services import ytdlp

router = APIRouter()

_HOP_BY_HOP = {"content-encoding", "transfer-encoding", "connection", "keep-alive"}


@router.get("/stream/{video_id}")
async def stream(video_id: str, request: Request):
    try:
        url, mime = ytdlp.resolve_stream(video_id)
    except Exception as exc:  # noqa: BLE001 - surface a clean 502 to the client
        raise HTTPException(status_code=502, detail=f"resolve failed: {exc}") from exc

    range_header = request.headers.get("range")
    client_sent_range = range_header is not None
    # googlevideo returns 403 for any request WITHOUT a Range header, so always
    # send one upstream. When the client didn't ask for a range we request the
    # whole file (bytes=0-) and hand it back as a normal 200.
    upstream_headers = {
        "Range": range_header if client_sent_range else "bytes=0-",
        # Mirror a browser UA — some googlevideo edges are picky about the client.
        "User-Agent": "Mozilla/5.0",
    }

    client = httpx.AsyncClient(timeout=None, follow_redirects=True)
    req = client.build_request("GET", url, headers=upstream_headers)
    upstream = await client.send(req, stream=True)

    if upstream.status_code >= 400:
        await upstream.aclose()
        await client.aclose()
        raise HTTPException(status_code=502, detail=f"upstream {upstream.status_code}")

    passthrough: dict[str, str] = {"Accept-Ranges": "bytes", "Content-Type": mime}
    for k, v in upstream.headers.items():
        if k.lower() in {"content-range", "content-length"}:
            passthrough[k.title()] = v

    # If the client never requested a range, present a clean 200 full-body
    # response instead of leaking the 206 we used to satisfy googlevideo.
    if client_sent_range:
        status_code = upstream.status_code
    else:
        status_code = 200
        passthrough.pop("Content-Range", None)

    async def body_iter():
        try:
            async for chunk in upstream.aiter_bytes(chunk_size=65536):
                yield chunk
        finally:
            await upstream.aclose()
            await client.aclose()

    return StreamingResponse(
        body_iter(),
        status_code=status_code,
        headers=passthrough,
        media_type=mime,
    )
