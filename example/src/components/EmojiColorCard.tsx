import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { EmojiColorResult } from 'emoji-main-color-react-native';

type Props = {
  result: EmojiColorResult;
};

export const EmojiColorCard = ({ result }: Props): JSX.Element => {
  return (
    <View style={styles.card}>
      <Text style={styles.emoji}>{result.emoji}</Text>
      <View style={[styles.mainColor, { backgroundColor: result.mainColor }]} />
      <Text style={styles.label}>Main: {result.mainColor}</Text>
      <Text style={styles.label}>Source: {result.source}</Text>
      {!!result.palette?.length && (
        <View style={styles.paletteRow}>
          {result.palette.map((color) => (
            <View key={`${result.emoji}-${color}`} style={[styles.paletteSwatch, { backgroundColor: color }]} />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E9E9E9',
  },
  emoji: { fontSize: 44, marginBottom: 8 },
  mainColor: { height: 56, borderRadius: 10, marginBottom: 8 },
  label: { color: '#2D2D2D' },
  paletteRow: { flexDirection: 'row', marginTop: 8, gap: 8 },
  paletteSwatch: { width: 24, height: 24, borderRadius: 6 },
});
