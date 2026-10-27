"""Normalized data models returned by the API.

The app depends only on these shapes, never on raw ytmusicapi/yt-dlp output, so
if the upstream libraries change we only adjust the mappers in ytmusic.py.
"""
from __future__ import annotations

from typing import Optional
from pydantic import BaseModel


class Track(BaseModel):
    id: str                       # YouTube videoId
    title: str
    artist: str = ""              # flattened artist name(s)
    album: Optional[str] = None
    duration: Optional[int] = None      # seconds
    durationText: Optional[str] = None  # "3:45"
    thumbnail: Optional[str] = None     # highest-res thumbnail URL
    type: str = "song"


class Album(BaseModel):
    id: str                       # browseId / audioPlaylistId
    title: str
    artist: str = ""
    year: Optional[str] = None
    thumbnail: Optional[str] = None
    type: str = "album"


class Artist(BaseModel):
    id: str                       # browseId
    name: str
    thumbnail: Optional[str] = None
    type: str = "artist"


class PlaylistItem(BaseModel):
    id: str                       # playlistId
    title: str
    author: str = ""
    thumbnail: Optional[str] = None
    type: str = "playlist"


class SearchResponse(BaseModel):
    songs: list[Track] = []
    albums: list[Album] = []
    artists: list[Artist] = []
    playlists: list[PlaylistItem] = []


class YTMusicPlaylistResponse(BaseModel):
    id: str
    title: str
    author: str = ""
    trackCount: int = 0
    thumbnail: Optional[str] = None
    tracks: list[Track] = []
