import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { EmojiColorResult, getEmojiColors, useEmojiColor } from 'emoji-main-color-react-native';
import { EmojiColorCard } from './components/EmojiColorCard';

const EMOJIS = ['🍋', '🦊', '🌊', '🍓', '🌵', '🧠'];

const App = (): JSX.Element => {
  const [batchResults, setBatchResults] = useState<EmojiColorResult[]>([]);
  const [batchLoading, setBatchLoading] = useState(true);

  const fox = useEmojiColor('🦊', {
    cache: 'disk',
    paletteSize: 4,
    renderSize: 72,
    fallbackColor: '#999999',
  });

  const options = useMemo(
    () => ({
      cache: 'memory' as const,
      paletteSize: 3,
      renderSize: 64,
      fallbackColor: '#808080',
    }),
    [],
  );

  useEffect(() => {
    let mounted = true;
    setBatchLoading(true);

    getEmojiColors(EMOJIS, options)
      .then((results) => {
        if (mounted) {
          setBatchResults(results);
          setBatchLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setBatchLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [options]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Emoji Main Color Example</Text>
        <Text style={styles.subtitle}>Single hook usage (`useEmojiColor`)</Text>

        {fox.loading && <ActivityIndicator />}
        {fox.error && <Text style={styles.error}>{fox.error.message}</Text>}
        {fox.result && <EmojiColorCard result={fox.result} />}

        <Text style={styles.subtitle}>Batch API (`getEmojiColors`)</Text>
        {batchLoading ? (
          <ActivityIndicator />
        ) : (
          <View>
            {batchResults.map((result) => (
              <EmojiColorCard key={`${result.emoji}-${result.mainColor}`} result={result} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F7F7' },
  container: { padding: 16 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 6, color: '#1F1F1F' },
  subtitle: { fontSize: 16, fontWeight: '600', marginBottom: 12, marginTop: 12 },
  error: { color: '#B00020' },
});

export default App;
