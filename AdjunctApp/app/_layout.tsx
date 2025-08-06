import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // 🔥 Hides the header across all screens
      }}
    />
  );
}
