/** Settings: backend URL, connection test, volume, the sleep timer, and YT Music auth. */
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { api } from '../api/client';
import { setVolume, toggleMute, usePlayer } from '../audio/player';
import { pickDownloadFolder } from '../downloads/manager';
import { SeekBar } from '../components/SeekBar';
import { colors, font } from '../theme/terminal';
import { DEFAULT_BASE_URL, useSettings } from '../store/settings';
import { useUI } from '../store/ui';

export function SettingsScreen() {
  const setView = useUI((s) => s.setView);
  const { baseUrl, vinylGesture, downloadFolderUri, update } = useSettings();
  const { volume, muted } = usePlayer();
  const [draft, setDraft] = useState(baseUrl);
  const [test, setTest] = useState<{ status: 'idle' | 'ok' | 'fail'; msg?: string }>({ status: 'idle' });

  // YT Music auth state
  const [ytAuthed, setYtAuthed] = useState<boolean | null>(null);
  const [ytModal, setYtModal] = useState(false);
  const [oauthInput, setOauthInput] = useState('');
  const [oauthSaving, setOauthSaving] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  useEffect(() => {
    void api.getYTAuthStatus().then((r) => setYtAuthed(r.authenticated)).catch(() => setYtAuthed(false));
  }, []);

  const saveOAuth = async () => {
    const json = oauthInput.trim();
    if (!json) return;
    setOauthSaving(true);
    setOauthError(null);
    try {
      await api.setupYTAuth(json);
      setYtAuthed(true);
      setYtModal(false);
      setOauthInput('');
    } catch (e: any) {
      setOauthError(String(e?.message ?? e));
    } finally {
      setOauthSaving(false);
    }
  };

  const save = () => {
    const cleaned = draft.trim().replace(/\/+$/, '');
    update({ baseUrl: cleaned });
    setTest({ status: 'idle' });
  };

  const testConn = async () => {
    save();
    setTest({ status: 'idle', msg: 'testing…' });
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6000);
      await api.health(ctrl.signal);
      clearTimeout(t);
      setTest({ status: 'ok', msg: 'connected ✓' });
    } catch (e: any) {
      setTest({ status: 'fail', msg: String(e?.message ?? e) });
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.topbar}>
        <Pressable onPress={() => setView('home')} hitSlop={8}>
          <Text style={styles.back}>◂ back</Text>
        </Pressable>
        <Text style={styles.title}>SETTINGS</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.label}>BACKEND URL</Text>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder={DEFAULT_BASE_URL}
          placeholderTextColor={colors.textFaint}
          style={styles.input}
        />
        <Text style={styles.help}>
          Emulator: {DEFAULT_BASE_URL}. Physical phone: use your PC's LAN IP (e.g. http://192.168.1.20:8000). Later, point
          this at your own server — no other change needed.
        </Text>

        <View style={styles.btnRow}>
          <Pressable onPress={save} style={styles.btn}>
            <Text style={styles.btnText}>save</Text>
          </Pressable>
          <Pressable onPress={testConn} style={styles.btn}>
            <Text style={styles.btnText}>test connection</Text>
          </Pressable>
        </View>
        {test.msg ? (
          <Text style={[styles.testMsg, test.status === 'ok' ? { color: colors.green } : test.status === 'fail' ? { color: colors.red } : null]}>
            {test.msg}
          </Text>
        ) : null}

        <View style={styles.divider} />

        <Text style={styles.label}>VOLUME {Math.round((muted ? 0 : volume) * 100)}%</Text>
        <View style={styles.volRow}>
          <Pressable onPress={toggleMute} hitSlop={8}>
            <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={22} color={colors.text} />
          </Pressable>
          <SeekBar value={muted ? 0 : volume} onSeek={setVolume} style={styles.vol} color={colors.accent} />
        </View>

        <View style={styles.divider} />

        <Text style={styles.label}>VINYL GESTURE</Text>
        <Pressable onPress={() => update({ vinylGesture: !vinylGesture })} style={styles.toggleRow}>
          <Ionicons name={vinylGesture ? 'checkbox' : 'square-outline'} size={22} color={colors.text} />
          <Text style={styles.toggleText}>Rotate the vinyl to scrub the song</Text>
        </Pressable>
        <Text style={styles.help}>
          When on, spin the record on Now Playing to seek — clockwise moves forward, counter-clockwise rewinds.
        </Text>

        <View style={styles.divider} />

        <Text style={styles.label}>DOWNLOAD FOLDER</Text>
        <View style={styles.folderRow}>
          <Ionicons name={downloadFolderUri ? 'folder' : 'folder-open-outline'} size={20} color={colors.text} />
          <Text style={styles.folderStatus} numberOfLines={1}>
            {downloadFolderUri ? 'Folder selected — downloads save to your phone' : 'Not set — downloads stay in-app'}
          </Text>
        </View>
        <Pressable onPress={() => void pickDownloadFolder()} style={styles.btn}>
          <Text style={styles.btnText}>{downloadFolderUri ? 'change folder' : 'choose folder'}</Text>
        </Pressable>
        <Text style={styles.help}>
          Downloads are copied into this folder so your file manager and other music apps can play them. They also
          stay in-app for offline playback.
        </Text>

        <View style={styles.divider} />

        <Text style={styles.label}>YOUTUBE MUSIC</Text>
        <View style={styles.folderRow}>
          <Ionicons name={ytAuthed ? 'checkmark-circle' : 'information-circle-outline'} size={20} color={colors.text} />
          <Text style={styles.folderStatus}>
            {ytAuthed === null ? 'Checking…' : ytAuthed ? 'Authenticated — library playlists available' : 'Public playlists importable (no setup needed)'}
          </Text>
        </View>
        <Pressable onPress={() => { setYtModal(true); setOauthInput(''); setOauthError(null); }} style={styles.btn}>
          <Text style={styles.btnText}>{ytAuthed ? 'Re-setup OAuth' : 'Setup OAuth (optional)'}</Text>
        </Pressable>
        <Text style={styles.help}>
          Public YouTube Music playlists can be imported by URL with no setup.{'\n'}To also import YOUR library playlists, you need OAuth:{'\n'}1. Create a Google Cloud project + YouTube Data API{'\n'}2. OAuth credentials → "TVs and Limited Input devices"{'\n'}3. Run: ytmusicapi oauth{'\n'}4. Paste the oauth.json contents above
        </Text>

        {/* OAuth setup modal */}
        <Modal visible={ytModal} transparent animationType="fade" onRequestClose={() => setYtModal(false)}>
          <Pressable style={styles.ytBackdrop} onPress={() => setYtModal(false)}>
            <Pressable style={styles.ytSheet} onPress={() => {}}>
              <Text style={styles.ytTitle}>YOUTUBE MUSIC OAuth</Text>
              <Text style={styles.help}>
                1. Create a Google Cloud project + enable YouTube Data API{'\n'}2. Create OAuth credentials for "TVs and Limited Input devices"{'\n'}3. Run: ytmusicapi oauth{'\n'}4. Paste the generated oauth.json below
              </Text>
              <TextInput
                value={oauthInput}
                onChangeText={setOauthInput}
                placeholder='paste oauth.json contents'
                placeholderTextColor={colors.textFaint}
                style={[styles.input, { minHeight: 100 }]}
                multiline
                autoCapitalize="none"
                autoCorrect={false}
              />
              {oauthError ? <Text style={styles.testMsg}>{oauthError}</Text> : null}
              <View style={styles.btnRow}>
                <Pressable onPress={() => setYtModal(false)} style={[styles.btn, { flex: 1 }]}>
                  <Text style={styles.btnText}>Cancel</Text>
                </Pressable>
                <Pressable onPress={() => void saveOAuth()} style={[styles.btn, { flex: 1 }]} disabled={oauthSaving || !oauthInput.trim()}>
                  {oauthSaving ? (
                    <ActivityIndicator size="small" color={colors.text} />
                  ) : (
                    <Text style={styles.btnText}>Save</Text>
                  )}
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10 },
  back: { fontFamily: font.family, fontSize: font.sm, color: colors.accent, width: 48 },
  title: { fontFamily: font.family, fontSize: font.sm, color: colors.text, letterSpacing: 2 },
  body: { gap: 8, paddingBottom: 24 },
  label: { fontFamily: font.family, fontSize: font.xs, color: colors.textDim, letterSpacing: 2, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontFamily: font.family,
    fontSize: font.sm,
    color: colors.text,
    backgroundColor: colors.panelAlt,
  },
  help: { fontFamily: font.family, fontSize: font.xs, color: colors.textFaint, lineHeight: 16 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  btn: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: colors.panelAlt },
  btnText: { fontFamily: font.family, fontSize: font.sm, color: colors.text },
  testMsg: { fontFamily: font.family, fontSize: font.xs, marginTop: 4, color: colors.textDim },
  divider: { height: 1, backgroundColor: colors.borderDim, marginVertical: 16 },
  volRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  vol: { flex: 1 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  toggleText: { fontFamily: font.family, fontSize: font.sm, color: colors.text },
  folderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4, marginBottom: 8 },
  folderStatus: { flex: 1, fontFamily: font.family, fontSize: font.sm, color: colors.text },
  ytBackdrop: { flex: 1, backgroundColor: '#000a', justifyContent: 'center', padding: 28 },
  ytSheet: { backgroundColor: colors.panel, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 18, gap: 12 },
  ytTitle: { fontFamily: font.display, fontSize: 11, color: colors.text, letterSpacing: 1 },
});
