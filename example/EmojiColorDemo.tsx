import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useEmojiColor } from '../src';

export const EmojiColorDemo = (): JSX.Element => {
  const { loading, error, result } = useEmojiColor('🦊', {
    cache: 'disk',
    paletteSize: 3,
    renderSize: 64,
    fallbackColor: '#888888',
  });

  if (loading) {
    return <ActivityIndicator />;
  }

  if (error || !result) {
    return <Text>Failed to load emoji color.</Text>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{result.emoji}</Text>
      <View style={[styles.colorSwatch, { backgroundColor: result.mainColor }]} />
      <Text>Main Color: {result.mainColor}</Text>
      <Text>Source: {result.source}</Text>
      <View style={styles.paletteRow}>
        {(result.palette ?? []).map((color) => (
          <View key={color} style={[styles.paletteSwatch, { backgroundColor: color }]} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, alignItems: 'center', gap: 8 },
  emoji: { fontSize: 48 },
  colorSwatch: { width: 84, height: 84, borderRadius: 12 },
  paletteRow: { flexDirection: 'row', gap: 8 },
  paletteSwatch: { width: 24, height: 24, borderRadius: 6 },
});
