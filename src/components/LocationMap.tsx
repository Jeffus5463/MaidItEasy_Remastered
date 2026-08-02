// Draggable pin on native (react-native-maps); web has no map renderer for it,
// so it falls back to the barangay/landmark fields for pinpointing location.
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { DUMAGUETE_CENTER } from '../data';
import { colors, fonts, radius } from '../theme';

interface Props {
  latitude: number;
  longitude: number;
  onChange: (coords: { latitude: number; longitude: number }) => void;
}

export function LocationMap({ latitude, longitude, onChange }: Props) {
  if (Platform.OS === 'web') {
    return (
      <View style={styles.fallback}>
        <Ionicons name="location" size={28} color={colors.primary} />
        <Text style={styles.fallbackText}>Map preview available on iOS & Android</Text>
      </View>
    );
  }

  const MapView = require('react-native-maps').default;
  const { Marker } = require('react-native-maps');

  return (
    <MapView
      style={styles.map}
      initialRegion={{
        latitude: DUMAGUETE_CENTER.latitude,
        longitude: DUMAGUETE_CENTER.longitude,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06,
      }}
    >
      <Marker
        coordinate={{ latitude, longitude }}
        draggable
        onDragEnd={(e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) =>
          onChange(e.nativeEvent.coordinate)
        }
      />
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { height: 170, borderRadius: radius.lg, overflow: 'hidden', marginTop: 16 },
  fallback: {
    height: 150,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryTintBg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 4,
  },
  fallbackText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.primaryDark,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
