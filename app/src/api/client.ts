/**
 * API client for the Python backend.
 *
 * The base URL is configurable at runtime (Settings) so the app points at the
 * user's PC now (LAN IP) and their own server later with no code change.
 */
import { baseUrlSync, getBaseUrl } from '../store/settings';

export type Track = {
  id: string;
  title: string;
  artist: string;
  album?: string | null;
  duration?: number | null;
  durationText?: string | null;
  thumbnail?: string | null;
  type?: string;
  // Present only for downloaded/local tracks:
  localUri?: string | null;
};

export type Album = {
  id: string;
  title: string;
  artist: string;
  year?: string | null;
  thumbnail?: string | null;
  type: 'album';
};

export type Artist = {
  id: string;
  name: string;
  thumbnail?: string | null;
  type: 'artist';
};

export type PlaylistItem = {
  id: string;
  title: string;
  author: string;
  thumbnail?: string | null;
  type: 'playlist';
};

export type YTMusicPlaylist = {
  id: string;
  title: string;
  author: string;
  trackCount: number;
  thumbnail: string | null;
  tracks: Track[];
};

export type SearchResponse = {
  songs: Track[];
  albums: Album[];
  artists: Artist[];
  playlists: PlaylistItem[];
};

export type SearchType = 'songs' | 'albums' | 'artists' | 'playlists';

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const base = await getBaseUrl();
  const res = await fetch(`${base}${path}`, { signal });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${detail.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export const api = {
  async search(q: string, type: SearchType = 'songs', signal?: AbortSignal) {
    const qs = `?q=${encodeURIComponent(q)}&type=${type}`;
    return getJson<SearchResponse>(`/search${qs}`, signal);
  },

  async recommend(videoId: string, limit = 25, signal?: AbortSignal) {
    return getJson<Track[]>(`/recommend/${videoId}?limit=${limit}`, signal);
  },

  async lyrics(videoId: string, signal?: AbortSignal) {
    return getJson<{ original: string; english: string; translated: boolean; source?: string }>(
      `/lyrics/${videoId}`,
      signal,
    );
  },

  async synced(videoId: string, signal?: AbortSignal) {
    return getJson<{ synced: string; plain?: string }>(`/synced/${videoId}`, signal);
  },

  async streamUrl(videoId: string) {
    const base = await getBaseUrl();
    return `${base}/stream/${videoId}`;
  },

  async downloadUrl(videoId: string) {
    const base = await getBaseUrl();
    return `${base}/download/${videoId}`;
  },

  async artworkUrl(videoId: string) {
    const base = await getBaseUrl();
    return `${base}/artwork/${videoId}`;
  },

  /** High-res artwork URL (sync) for large art like the vinyl centre. */
  artworkUrlSync(videoId: string) {
    return `${baseUrlSync()}/artwork/${videoId}`;
  },

  async health(signal?: AbortSignal) {
    return getJson<{ status: string }>(`/health`, signal);
  },

  async video(videoId: string, signal?: AbortSignal) {
    return getJson<{ id: string; title: string; artist: string; duration?: number; thumbnail?: string; error?: string }>(
      `/video/${videoId}`,
      signal,
    );
  },

  async fetchPublicYTMusicPlaylist(playlistId: string, signal?: AbortSignal) {
    return getJson<YTMusicPlaylist>(`/yt-playlists/public/${encodeURIComponent(playlistId)}`, signal);
  },

  async fetchLibraryPlaylists(signal?: AbortSignal) {
    return getJson<PlaylistItem[]>(`/yt-playlists/library`, signal);
  },

  async fetchLibraryPlaylist(playlistId: string, signal?: AbortSignal) {
    return getJson<YTMusicPlaylist>(`/yt-playlists/library/${encodeURIComponent(playlistId)}`, signal);
  },

  async getYTAuthStatus(signal?: AbortSignal) {
    return getJson<{ authenticated: boolean }>(`/yt-playlists/auth/status`, signal);
  },

  async setupYTAuth(oauthJson: string, signal?: AbortSignal) {
    const base = await getBaseUrl();
    const res = await fetch(`${base}/yt-playlists/auth/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oauth_json: oauthJson }),
      signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${detail.slice(0, 200)}`);
    }
    return (await res.json()) as { authenticated: boolean };
  },
};
