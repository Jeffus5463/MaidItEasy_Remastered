import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts as useJakarta,
  PlusJakartaSans_400Regular as Jakarta_400Regular,
  PlusJakartaSans_500Medium as Jakarta_500Medium,
  PlusJakartaSans_600SemiBold as Jakarta_600SemiBold,
  PlusJakartaSans_700Bold as Jakarta_700Bold,
  PlusJakartaSans_800ExtraBold as Jakarta_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  BricolageGrotesque_600SemiBold as Bricolage_600SemiBold,
  BricolageGrotesque_700Bold as Bricolage_700Bold,
} from '@expo-google-fonts/bricolage-grotesque';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { View } from 'react-native';
import { colors } from '../src/theme';
import { BookingProvider } from '../src/store';

const queryClient = new QueryClient();

export default function RootLayout() {
  const [loaded] = useJakarta({
    Jakarta_400Regular,
    Jakarta_500Medium,
    Jakarta_600SemiBold,
    Jakarta_700Bold,
    Jakarta_800ExtraBold,
    Bricolage_600SemiBold,
    Bricolage_700Bold,
  });

  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.cream }} />;

  return (
    <QueryClientProvider client={queryClient}>
      <BookingProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.cream },
            animation: 'slide_from_right',
          }}
        />
      </BookingProvider>
    </QueryClientProvider>
  );
}
