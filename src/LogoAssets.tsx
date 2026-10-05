import { Image, StyleSheet, View } from 'react-native';

const markSource = require('../designs/Emerald P With Upward Arrow.png');
const wordmarkSource = require('../designs/Pocket Wordmark.png');

// Both reference files use a 1696 × 926 canvas. These clipped views preserve
// the original artwork while hiding the unused white canvas around each asset.
export function PocketMarkImage({ size = 86 }: { size?: number }) {
  const ratio = size / 86;
  return <View style={[styles.clip, { width: size, height: 96 * ratio }]}><Image source={markSource} resizeMode="stretch" style={{ position: 'absolute', width: 279 * ratio, height: 152 * ratio, left: -98 * ratio, top: -28 * ratio }} /></View>;
}

export function PocketWordImage({ width = 196 }: { width?: number }) {
  return <Image source={wordmarkSource} resizeMode="contain" style={{ width, height: width * 225 / 850 }} />;
}

const styles = StyleSheet.create({ clip: { overflow: 'hidden', backgroundColor: '#FFFFFF' } });
