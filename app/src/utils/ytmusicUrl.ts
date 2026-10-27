/**
 * Extract a YouTube Music playlist ID from a URL or raw ID string.
 *
 * Accepted formats:
 *   - https://music.youtube.com/playlist?list=PLxxxxx
 *   - https://youtube.com/playlist?list=PLxxxxx
 *   - PLxxxxx (raw ID)
 *   - OLAKxxxx, UULFxxxx, etc.
 */
export function extractYTPlaylistId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Try parsing as a URL with a list= query param.
  try {
    const url = new URL(trimmed);
    const list = url.searchParams.get('list');
    if (list && /^PL|OLAK|UULF|UU[A-Z0-9_-]{10,}/i.test(list)) return list;
  } catch {
    // Not a valid URL — fall through.
  }

  // Bare ID (starts with a known prefix).
  if (/^(PL|OLAK|UULF|UU)[A-Za-z0-9_-]{10,}$/.test(trimmed)) return trimmed;

  return null;
}
