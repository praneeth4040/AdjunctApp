import { Stack, useRouter } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase"; // 🔁 Adjust path if needed

SplashScreen.preventAutoHideAsync(); // Prevent splash auto-hide

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Kreon-Regular': require('../assets/fonts/Kreon-Regular.ttf'),
    'Kreon-Bold': require('../assets/fonts/Kreon-Bold.ttf'),
    'Kreon-SemiBold': require('../assets/fonts/Kreon-SemiBold.ttf'),
  });

  const [checkingSession, setCheckingSession] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (session) {
        // ✅ Already logged in
        router.replace('/'); // 👉 Change to your main screen
      } else {
        router.replace('/onboard');
      }

      setCheckingSession(false);
      SplashScreen.hideAsync(); // ⏱️ Hide splash once done
    };

    if (fontsLoaded) {
      checkSession();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded || checkingSession) return null;

  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
