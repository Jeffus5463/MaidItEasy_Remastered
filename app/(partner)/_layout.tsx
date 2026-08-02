import { Stack } from 'expo-router';
import { colors } from '../../src/theme';
import { PartnerProvider } from '../../src/partnerStore';

export default function PartnerLayout() {
  return (
    <PartnerProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.cream },
          animation: 'slide_from_right',
        }}
      />
    </PartnerProvider>
  );
}
