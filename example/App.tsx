import React, {useMemo, useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useEmojiColor} from 'emoji-main-color-react-native';
import {
  SystemEmojiPicker,
  useEmojiKeyboard,
} from 'react-native-system-emoji-picker';

const SAMPLE_EMOJIS = ['🍋', '🦊', '🫐'];
const INITIAL_PICKER_EMOJI = '🌵';
type SelectedEmojiSource = `sample:${string}` | 'picker';

export default function App() {
  const emojiKeyboard = useEmojiKeyboard();
  const [selectedEmoji, setSelectedEmoji] = useState<string>('🍋');
  const [pickerEmoji, setPickerEmoji] = useState<string>(INITIAL_PICKER_EMOJI);
  const [selectedSource, setSelectedSource] =
    useState<SelectedEmojiSource>('sample:🍋');
  const {result, loading, error} = useEmojiColor(selectedEmoji, {
    cache: 'memory',
    paletteSize: 3,
    renderSize: 72,
    fallbackColor: '#9CA3AF',
  });

  const palette = useMemo(() => result?.palette ?? [], [result?.palette]);
  const colorDisplays = useMemo(
    () => [
      {label: 'Main color', value: result?.mainColor},
      {label: 'Dark color', value: result?.mainDarkColor},
      {label: 'Light color', value: result?.mainLightColor},
    ],
    [result?.mainColor, result?.mainDarkColor, result?.mainLightColor],
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Text style={styles.title}>emoji-main-color-react-native</Text>
        <Text style={styles.subtitle}>
          Dominant color extraction for native emoji rendering
        </Text>

        <Text style={styles.emoji} testID="selected-emoji">
          {selectedEmoji}
        </Text>

        <View style={styles.emojiSelectorRow}>
          {SAMPLE_EMOJIS.map(emoji => {
            const isActive = selectedSource === `sample:${emoji}`;

            return (
              <Pressable
                key={emoji}
                accessibilityRole="button"
                onPress={() => {
                  setSelectedEmoji(emoji);
                  setSelectedSource(`sample:${emoji}`);
                }}
                style={styles.emojiOption}
                testID={`emoji-option-${emoji}`}>
                <Text style={styles.selectorEmoji}>{emoji}</Text>
                <View
                  style={[
                    styles.activeIndicator,
                    isActive ? styles.activeIndicatorVisible : null,
                  ]}
                />
              </Pressable>
            );
          })}

          <Pressable
            accessibilityRole="button"
            onPress={emojiKeyboard.open}
            style={styles.pickerOption}
            testID="emoji-picker-option">
            <View style={styles.pickerBox}>
              <Text style={styles.selectorEmoji}>{pickerEmoji}</Text>
            </View>
            <View
              style={[
                styles.activeIndicator,
                selectedSource === 'picker'
                  ? styles.activeIndicatorVisible
                  : null,
              ]}
            />
          </Pressable>
        </View>

        <View style={styles.colorDisplayRow}>
          {colorDisplays.map(item => {
            const displayValue = loading ? 'Loading…' : item.value ?? '—';
            const backgroundColor = item.value ?? '#9CA3AF';

            return (
              <View
                key={item.label}
                style={[styles.colorDisplay, {backgroundColor}]}>
                <Text style={styles.colorDisplayText}>{item.label}</Text>
                <Text style={styles.colorDisplayText}>{displayValue}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.paletteRow}>
          {palette.map(color => (
            <View key={color} style={[styles.swatch, {backgroundColor: color}]} />
          ))}
        </View>

        {error != null ? <Text style={styles.error}>{error.message}</Text> : null}

        <SystemEmojiPicker
          ref={emojiKeyboard.ref}
          keyboardAppearance="light"
          autoHideAfterSelection
          dismissOnTapOutside
          onEmojiSelected={emoji => {
            setPickerEmoji(emoji);
            setSelectedEmoji(emoji);
            setSelectedSource('picker');
          }}
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
    marginBottom: 10,
  },
  emojiSelectorRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'center',
    marginBottom: 22,
  },
  emojiOption: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    minHeight: 58,
    minWidth: 48,
  },
  pickerOption: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    minHeight: 58,
    minWidth: 54,
  },
  pickerBox: {
    alignItems: 'center',
    borderColor: '#7F8A80',
    borderRadius: 8,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  selectorEmoji: {
    fontSize: 30,
    lineHeight: 38,
  },
  activeIndicator: {
    backgroundColor: 'transparent',
    borderRadius: 2,
    height: 4,
    marginTop: 6,
    width: 24,
  },
  activeIndicatorVisible: {
    backgroundColor: '#33413A',
  },
  colorDisplayRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginBottom: 10,
  },
  colorDisplay: {
    alignItems: 'center',
    borderRadius: 8,
    minHeight: 54,
    minWidth: 112,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  colorDisplayText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    textAlign: 'center',
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
  error: {
    color: '#9D2B2B',
    marginBottom: 12,
  },
});
