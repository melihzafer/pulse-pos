import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { initDatabase, seedDatabase } from '../lib/db';

export default function RootLayout() {
  useEffect(() => {
    initDatabase();
    seedDatabase();
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen 
        name="modals" 
        options={{
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
