import React, {useMemo, useState} from 'react';
import {
  Button,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  getEmojiColors,
  useEmojiColor,
} from 'emoji-main-color-react-native';
import type {CacheMode} from 'emoji-main-color-react-native';
import {
  SystemEmojiPicker,
  useEmojiKeyboard,
} from 'react-native-system-emoji-picker';

const SAMPLE_EMOJIS = ['🍋', '🦊', '🫐', '🌵'];

export default function App() {
  const emojiKeyboard = useEmojiKeyboard();
  const [selectedEmoji, setSelectedEmoji] = useState<string>('🍋');
  const [cacheMode, setCacheMode] = useState<CacheMode>('memory');
  const [batchSummary, setBatchSummary] = useState<string>('');
  const [pickerStatus, setPickerStatus] = useState<'open' | 'closed'>('closed');
  const {result, loading, error, reload} = useEmojiColor(selectedEmoji, {
    cache: cacheMode,
    paletteSize: 3,
    renderSize: 72,
    fallbackColor: '#9CA3AF',
  });

  const palette = useMemo(() => result?.palette ?? [], [result?.palette]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Text style={styles.title}>emoji-main-color-react-native</Text>
        <Text style={styles.subtitle}>
          Dominant color extraction for native emoji rendering
        </Text>

        <Text style={styles.emoji}>{selectedEmoji}</Text>
        <Text style={styles.status}>Cache: {cacheMode}</Text>
        <Text style={styles.status}>Picker: {pickerStatus}</Text>
        <Text style={styles.status}>
          Main color: {loading ? 'Loading…' : result?.mainColor ?? '—'}
        </Text>
        <Text style={styles.status}>Source: {result?.source ?? 'pending'}</Text>

        <View style={styles.paletteRow}>
          {palette.map(color => (
            <View key={color} style={[styles.swatch, {backgroundColor: color}]} />
          ))}
        </View>

        {error != null ? <Text style={styles.error}>{error.message}</Text> : null}

        <View style={styles.buttonRow}>
          <Button title="Pick emoji" onPress={emojiKeyboard.open} />
          <Button title="Dismiss picker" onPress={emojiKeyboard.dismiss} />
        </View>

        <View style={styles.buttonRow}>
          {SAMPLE_EMOJIS.map(emoji => (
            <Button
              key={emoji}
              title={emoji}
              onPress={() => setSelectedEmoji(emoji)}
            />
          ))}
        </View>

        <View style={styles.buttonRow}>
          <Button title="Use memory cache" onPress={() => setCacheMode('memory')} />
          <Button title="Use disk cache" onPress={() => setCacheMode('disk')} />
          <Button title="Reload" onPress={reload} />
        </View>

        <View style={styles.buttonRow}>
          <Button
            title="Run batch demo"
            onPress={async () => {
              const values = await getEmojiColors(SAMPLE_EMOJIS, {
                cache: cacheMode,
                renderSize: 56,
              });
              setBatchSummary(
                values.map(item => `${item.emoji} ${item.mainColor}`).join(' • '),
              );
            }}
          />
        </View>

        {batchSummary.length > 0 ? (
          <Text style={styles.batchSummary}>{batchSummary}</Text>
        ) : null}

        <SystemEmojiPicker
          ref={emojiKeyboard.ref}
          keyboardAppearance="light"
          autoHideAfterSelection
          dismissOnTapOutside
          onEmojiSelected={emoji => {
            setSelectedEmoji(emoji);
            setBatchSummary('');
          }}
          onOpen={() => setPickerStatus('open')}
          onClose={() => setPickerStatus('closed')}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F4EA',
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    color: '#1F2A1F',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    color: '#5E665A',
    fontSize: 15,
    marginBottom: 20,
    textAlign: 'center',
  },
  emoji: {
    fontSize: 72,
    marginBottom: 16,
  },
  status: {
    color: '#33413A',
    fontSize: 14,
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
    justifyContent: 'center',
  },
  paletteRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 16,
  },
  swatch: {
    width: 36,
    height: 36,
    borderColor: '#D4D4D4',
    borderRadius: 10,
    borderWidth: 1,
  },
  batchSummary: {
    color: '#33413A',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
  },
  error: {
    color: '#9D2B2B',
    marginBottom: 12,
  },
});
