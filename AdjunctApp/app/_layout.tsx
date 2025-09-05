import { Stack, useRouter } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useCallback } from "react";
import { GestureHandlerRootView } from 'react-native-gesture-handler'; // ✅ import this
import { supabase } from "../lib/supabase"; // ✅ Adjust if needed

SplashScreen.preventAutoHideAsync(); // Don’t auto-hide until ready

export default function RootLayout() {
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    'Kreon-Regular': require('../assets/fonts/Kreon-Regular.ttf'),
    'Kreon-Bold': require('../assets/fonts/Kreon-Bold.ttf'),
    'Kreon-SemiBold': require('../assets/fonts/Kreon-SemiBold.ttf'),
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        router.replace('/home/chats'); // ✅ Change to home or wherever
      } else {
        router.replace('/onboard');
      }

      await SplashScreen.hideAsync(); // 🔐 Only hide once nav is complete
    }
  }, [fontsLoaded]);

  useEffect(() => {
    onLayoutRootView();
  }, [onLayoutRootView]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}
