"""Thin wrapper around ytmusicapi.

Isolates all upstream shape-handling in one place and maps everything to the
models in models.py. No authentication is needed for search / radio.
"""
from __future__ import annotations

from functools import lru_cache
from typing import Any, Optional

from ytmusicapi import YTMusic

from .models import Album, Artist, PlaylistItem, SearchResponse, Track, YTMusicPlaylistResponse


@lru_cache(maxsize=1)
def _yt() -> YTMusic:
    # Constructing YTMusic hits the network once; cache the instance.
    return YTMusic()


_yt_auth_instance: Optional[YTMusic] = None


def _yt_auth() -> Optional[YTMusic]:
    """Authenticated YTMusic instance using oauth.json. None if not set up."""
    global _yt_auth_instance
    from ..config import YTMUSIC_OAUTH_PATH
    if _yt_auth_instance is not None:
        return _yt_auth_instance
    if not YTMUSIC_OAUTH_PATH.exists():
        return None
    try:
        _yt_auth_instance = YTMusic(str(YTMUSIC_OAUTH_PATH))
        return _yt_auth_instance
    except Exception:
        return None


def is_authenticated() -> bool:
    """Check whether YouTube Music OAuth credentials are configured."""
    from ..config import YTMUSIC_OAUTH_PATH
    return YTMUSIC_OAUTH_PATH.exists()


def setup_oauth(oauth_json: str) -> bool:
    """Save OAuth JSON credentials to the data directory. Returns True on success."""
    from ..config import YTMUSIC_OAUTH_PATH
    import json
    try:
        data = json.loads(oauth_json)
        YTMUSIC_OAUTH_PATH.write_text(json.dumps(data, indent=2), encoding="utf-8")
        # Reset the cached auth instance so it picks up the new file.
        global _yt_auth_instance
        _yt_auth_instance = None
        return True
    except Exception:
        return False


def _best_thumbnail(thumbnails: Optional[list[dict]]) -> Optional[str]:
    if not thumbnails:
        return None
    # ytmusicapi returns thumbnails ordered small->large; take the last/biggest.
    best = max(thumbnails, key=lambda t: t.get("width", 0) * t.get("height", 0))
    return best.get("url")


def _flatten_artists(artists: Any) -> str:
    if not artists:
        return ""
    if isinstance(artists, str):
        return artists
    names = []
    for a in artists:
        if isinstance(a, dict):
            name = a.get("name")
            if name:
                names.append(name)
        elif isinstance(a, str):
            names.append(a)
    return ", ".join(names)


def _to_track(item: dict) -> Optional[Track]:
    vid = item.get("videoId")
    if not vid:
        return None
    return Track(
        id=vid,
        title=item.get("title", "Unknown"),
        artist=_flatten_artists(item.get("artists")),
        album=(item.get("album") or {}).get("name") if isinstance(item.get("album"), dict) else item.get("album"),
        duration=item.get("duration_seconds"),
        durationText=item.get("duration") or item.get("length"),
        thumbnail=_best_thumbnail(item.get("thumbnails") or item.get("thumbnail")),
    )


def _to_album(item: dict) -> Optional[Album]:
    aid = item.get("browseId")
    if not aid:
        return None
    return Album(
        id=aid,
        title=item.get("title", "Unknown"),
        artist=_flatten_artists(item.get("artists")),
        year=item.get("year"),
        thumbnail=_best_thumbnail(item.get("thumbnails")),
    )


def _to_artist(item: dict) -> Optional[Artist]:
    aid = item.get("browseId")
    name = item.get("artist") or item.get("title")
    if not aid or not name:
        return None
    return Artist(id=aid, name=name, thumbnail=_best_thumbnail(item.get("thumbnails")))


def _to_playlist(item: dict) -> Optional[PlaylistItem]:
    pid = item.get("browseId") or item.get("playlistId")
    if not pid:
        return None
    return PlaylistItem(
        id=pid,
        title=item.get("title", "Unknown"),
        author=_flatten_artists(item.get("author")),
        thumbnail=_best_thumbnail(item.get("thumbnails")),
    )


_FILTER_MAP = {
    "songs": "songs",
    "tracks": "songs",
    "albums": "albums",
    "artists": "artists",
    "playlists": "playlists",
}


def search(query: str, filter: Optional[str] = None, limit: int = 20) -> SearchResponse:
    """Search YT Music. `filter` narrows to one category; None searches songs."""
    yt = _yt()
    resp = SearchResponse()
    f = _FILTER_MAP.get((filter or "songs").lower(), "songs")

    results = yt.search(query, filter=f, limit=limit) or []
    for item in results:
        rtype = item.get("resultType")
        if f == "songs" and rtype in ("song", "video"):
            t = _to_track(item)
            if t:
                resp.songs.append(t)
        elif f == "albums" and rtype == "album":
            a = _to_album(item)
            if a:
                resp.albums.append(a)
        elif f == "artists" and rtype == "artist":
            ar = _to_artist(item)
            if ar:
                resp.artists.append(ar)
        elif f == "playlists" and rtype == "playlist":
            p = _to_playlist(item)
            if p:
                resp.playlists.append(p)
    return resp


def radio(video_id: str, limit: int = 25) -> list[Track]:
    """Related/radio tracks used for autoplay + recommendations."""
    yt = _yt()
    data = yt.get_watch_playlist(videoId=video_id, limit=limit) or {}
    tracks: list[Track] = []
    for item in data.get("tracks", []):
        t = _to_track(item)
        if t and t.id != video_id:
            tracks.append(t)
    return tracks[:limit]


def _translate_to_english(text: str) -> Optional[str]:
    """Best-effort translation via the free Google endpoint (no key). None on failure."""
    import httpx

    try:
        # POST keeps long lyrics out of the URL length limit.
        r = httpx.post(
            "https://translate.googleapis.com/translate_a/single",
            params={"client": "gtx", "sl": "auto", "tl": "en", "dt": "t"},
            data={"q": text},
            timeout=15,
        )
        if r.status_code != 200:
            return None
        segments = r.json()[0] or []
        out = "".join(seg[0] for seg in segments if seg and seg[0])
        return out or None
    except Exception:  # noqa: BLE001 - translation is optional
        return None


def lyrics(video_id: str) -> Optional[dict]:
    """Lyrics for a track (English by default), if YT Music has them."""
    yt = _yt()
    wp = yt.get_watch_playlist(videoId=video_id, limit=1) or {}
    browse_id = wp.get("lyrics")
    if not browse_id:
        return None
    data = yt.get_lyrics(browse_id) or {}
    original = data.get("lyrics")
    if not original:
        return None
    english = _translate_to_english(original)
    return {
        "original": original,
        "english": english or original,
        "translated": bool(english) and english != original,
        "source": data.get("source"),
    }


def _parse_length(length: Optional[str]) -> Optional[int]:
    if not length or ":" not in length:
        return None
    try:
        parts = [int(p) for p in length.split(":")]
        secs = 0
        for p in parts:
            secs = secs * 60 + p
        return secs
    except ValueError:
        return None


def synced_lyrics(video_id: str) -> Optional[dict]:
    """Time-synced lyrics (LRC) from lrclib.net, matched by title/artist/duration."""
    import httpx

    yt = _yt()
    wp = yt.get_watch_playlist(videoId=video_id, limit=1) or {}
    tracks = wp.get("tracks") or []
    if not tracks:
        return None
    t = tracks[0]
    title = t.get("title")
    artist = _flatten_artists(t.get("artists"))
    duration = _parse_length(t.get("length"))
    if not title or not artist:
        return None

    headers = {"User-Agent": "MUJJIC-PLAYER (personal use)"}
    try:
        with httpx.Client(timeout=15, headers=headers) as client:
            params = {"artist_name": artist, "track_name": title}
            if duration:
                params["duration"] = duration
            r = client.get("https://lrclib.net/api/get", params=params)
            data = r.json() if r.status_code == 200 else None
            if not data or not data.get("syncedLyrics"):
                # Fall back to a fuzzy search and take the first synced match.
                sr = client.get("https://lrclib.net/api/search", params={"track_name": title, "artist_name": artist})
                if sr.status_code == 200:
                    for item in sr.json() or []:
                        if item.get("syncedLyrics"):
                            data = item
                            break
    except Exception:  # noqa: BLE001
        return None

    if not data:
        return None
    return {"synced": data.get("syncedLyrics"), "plain": data.get("plainLyrics")}


def album_tracks(browse_id: str) -> list[Track]:
    yt = _yt()
    data = yt.get_album(browse_id) or {}
    tracks: list[Track] = []
    album_name = data.get("title")
    album_thumb = _best_thumbnail(data.get("thumbnails"))
    for item in data.get("tracks", []):
        t = _to_track(item)
        if t:
            if not t.album:
                t.album = album_name
            if not t.thumbnail:
                t.thumbnail = album_thumb
            tracks.append(t)
    return tracks


def _playlist_to_response(data: dict) -> Optional[YTMusicPlaylistResponse]:
    """Map a ytmusicapi playlist dict to our normalized model."""
    pid = data.get("id") or data.get("browseId")
    if not pid:
        return None
    tracks: list[Track] = []
    for item in data.get("tracks", []):
        t = _to_track(item)
        if t:
            tracks.append(t)
    return YTMusicPlaylistResponse(
        id=pid,
        title=data.get("title", "Unknown"),
        author=_flatten_artists(data.get("author")),
        trackCount=data.get("trackCount") or len(tracks),
        thumbnail=_best_thumbnail(data.get("thumbnails")),
        tracks=tracks,
    )


def fetch_public_playlist(playlist_id: str) -> Optional[YTMusicPlaylistResponse]:
    """Fetch a public YouTube Music playlist by ID.

    First tries the YouTube Data API directly (no auth needed), which works
    for any public playlist. Falls back to ytmusicapi if the API call fails.
    """
    from ..config import YOUTUBE_API_KEY
    import httpx

    # Try YouTube Data API v3 directly — works for any public playlist.
    if YOUTUBE_API_KEY:
        try:
            return _fetch_via_youtube_api(playlist_id, YOUTUBE_API_KEY)
        except Exception:
            pass  # fall through to ytmusicapi

    # Fallback: ytmusicapi (unauthenticated, may not work for all playlists).
    yt = _yt()
    try:
        data = yt.get_playlist(playlist_id, limit=None) or {}
        return _playlist_to_response(data)
    except Exception:
        return None


def _fetch_via_youtube_api(playlist_id: str, api_key: str) -> Optional[YTMusicPlaylistResponse]:
    """Fetch a public playlist using the YouTube Data API v3 (no OAuth)."""
    import httpx

    base = "https://www.googleapis.com/youtube/v3"

    # 1. Get playlist metadata
    with httpx.Client(timeout=15) as client:
        meta_resp = client.get(f"{base}/playlists", params={
            "part": "snippet,contentDetails",
            "id": playlist_id,
            "key": api_key,
        })
        if meta_resp.status_code != 200:
            return None
        items = meta_resp.json().get("items", [])
        if not items:
            return None
        meta = items[0]
        snippet = meta.get("snippet", {})
        content = meta.get("contentDetails", {})

        title = snippet.get("title", "Unknown")
        author = snippet.get("channelTitle", "")
        thumbnails = snippet.get("thumbnails", {})
        thumb_url = thumbnails.get("high", thumbnails.get("medium", thumbnails.get("default", {}))).get("url")
        track_count = content.get("itemCount", 0)

        # 2. Get playlist items (tracks) — paginated, max 50 per request
        tracks: list[Track] = []
        next_token = None
        while True:
            params: dict = {
                "part": "snippet,contentDetails",
                "playlistId": playlist_id,
                "maxResults": 50,
                "key": api_key,
            }
            if next_token:
                params["pageToken"] = next_token

            items_resp = client.get(f"{base}/playlistItems", params=params)
            if items_resp.status_code != 200:
                break

            data = items_resp.json()
            for item in data.get("items", []):
                snip = item.get("snippet", {})
                content_details = item.get("contentDetails", {})
                video_id = content_details.get("videoId")
                if not video_id:
                    continue

                # Get the best thumbnail
                thumbs = snip.get("thumbnails", {})
                best_thumb = thumbs.get("high", thumbs.get("medium", thumbs.get("default", {}))).get("url")

                # Try to parse duration from the description or use a placeholder
                duration_text = None
                duration_secs = None

                tracks.append(Track(
                    id=video_id,
                    title=snip.get("title", "Unknown"),
                    artist=snip.get("videoOwnerChannelTitle", snip.get("channelTitle", "")),
                    album=None,
                    duration=duration_secs,
                    durationText=duration_text,
                    thumbnail=best_thumb,
                ))

            next_token = data.get("nextPageToken")
            if not next_token:
                break

    return YTMusicPlaylistResponse(
        id=playlist_id,
        title=title,
        author=author,
        trackCount=track_count,
        thumbnail=thumb_url,
        tracks=tracks,
    )


def fetch_library_playlists() -> list[PlaylistItem]:
    """List the authenticated user's library playlists. Empty if not authenticated."""
    yt = _yt_auth()
    if not yt:
        return []
    try:
        items = yt.get_library_playlists(limit=50) or []
        result: list[PlaylistItem] = []
        for item in items:
            p = _to_playlist(item)
            if p:
                result.append(p)
        return result
    except Exception:
        return []


def fetch_library_playlist(playlist_id: str) -> Optional[YTMusicPlaylistResponse]:
    """Fetch a specific playlist from the user's library (auth required)."""
    yt = _yt_auth()
    if not yt:
        return None
    try:
        data = yt.get_playlist(playlist_id, limit=None) or {}
        return _playlist_to_response(data)
    except Exception:
        return None
