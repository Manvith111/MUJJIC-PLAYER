import { StatusBar } from 'expo-status-bar';
import { Silkscreen_400Regular, Silkscreen_700Bold, useFonts } from '@expo-google-fonts/silkscreen';
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StatusBar as RNStatusBar, StyleSheet, View } from 'react-native';

import { initAudio } from './src/audio/player';
import { BottomNav } from './src/components/BottomNav';
import { CreatePlaylistModal } from './src/components/CreatePlaylistModal';
import { ImportPlaylistModal } from './src/components/ImportPlaylistModal';
import { MiniPlayer } from './src/components/MiniPlayer';
import { TrackMenu } from './src/components/TrackMenu';
import { initLibrary } from './src/db/library';
import { HomeScreen } from './src/screens/HomeScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { NowPlaying } from './src/screens/NowPlaying';
import { PlaylistScreen } from './src/screens/PlaylistScreen';
import { QueueScreen } from './src/screens/QueueScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { colors } from './src/theme/terminal';
import { useSettings } from './src/store/settings';
import { useUI } from './src/store/ui';

export default function App() {
  const view = useUI((s) => s.view);
  const [booted, setBooted] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    Silkscreen_400Regular,
    Silkscreen_700Bold,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });

  const [fontTimeout, setFontTimeout] = useState(false);

  useEffect(() => {
    // Render as soon as settings are hydrated; audio + library init run in the
    // background so a hanging native call (e.g. on web) can't block the UI.
    (async () => {
      await useSettings.getState().hydrate().catch(() => {});
      setBooted(true);
      initAudio().catch(() => {});
      initLibrary().catch(() => {});
    })();
    const t = setTimeout(() => setFontTimeout(true), 3500);
    return () => clearTimeout(t);
  }, []);

  const ready = booted && (fontsLoaded || !!fontError || fontTimeout);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {ready ? (
        <>
          <View style={styles.content}>
            {view === 'home' && <HomeScreen />}
            {view === 'search' && <SearchScreen />}
            {view === 'library' && <LibraryScreen />}
            {view === 'playlist' && <PlaylistScreen />}
            {view === 'nowplaying' && <NowPlaying />}
            {view === 'queue' && <QueueScreen />}
            {view === 'settings' && <SettingsScreen />}
          </View>
          {view !== 'nowplaying' ? (
            <View style={styles.dock}>
              <MiniPlayer />
              <BottomNav />
            </View>
          ) : null}
          <TrackMenu />
          <CreatePlaylistModal />
          <ImportPlaylistModal />
        </>
      ) : (
        <View style={styles.boot}>
          <ActivityIndicator color={colors.text} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 24) : 44,
  },
  content: { flex: 1, paddingHorizontal: 12 },
  dock: { paddingHorizontal: 12, paddingTop: 6, paddingBottom: 8, gap: 6 },
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
