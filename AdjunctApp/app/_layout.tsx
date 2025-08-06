import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from "react";

SplashScreen.preventAutoHideAsync(); // prevent splash screen from hiding early

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Kreon-Regular': require('../assets/fonts/Kreon-Regular.ttf'),
    'Kreon-Bold': require('../assets/fonts/Kreon-Bold.ttf'),
    'Kreon-SemiBold': require('../assets/fonts/Kreon-SemiBold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();  // hide splash screen once fonts are loaded
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;   // keep splash screen until fonts are ready
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
