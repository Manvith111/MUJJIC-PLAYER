# New Features

> Status (2026-08-12): all JS/React-Native items below are **implemented** except the
> home-screen **Widget**, which is deferred to a dedicated native effort using
> **react-native-android-widget** (config plugin + APK rebuild; can't run in Expo Go).

## Widgets for App (Like Music Player)  — ⏳ deferred (native)

- Widget support for home screen quick access

## Long Press on Music in Home Page

- Long press on any music item on the home page to show a 3-dot pop-up menu with options (e.g., play, add to playlist, share, delete)

## Home Page — Show Playlist

- Display playlists directly on the home page for quick access

## Offline Playlist Support

- Create offline playlists and manage them from the library
- Banner for playlists is not loading properly (bug to fix)

## Downloaded Playlist Tagging

- When a playlist is downloaded, show it as "Offline" with a tag to differentiate from online playlists in the library

## Offline Sub-Pages

- **All Songs** — A sub-page showing all downloaded songs
- **Offline Playlists** — A sub-page for creating, editing, and viewing all offline playlists

## Playlist + Button (Sticky)

- Add a `+` button below the playlist section (sticky, without the name part)
- When pressed, open a popup to:
  - Give the playlist a name
  - Add songs to the playlist

## Search Playlist Bar

- Add a search bar at the top of the playlist section to filter and search playlists

## Now Playing — Swipe Gestures

- Swipe left on the Now Playing screen to play the next song
- Swipe right on the Now Playing screen to play the previous song