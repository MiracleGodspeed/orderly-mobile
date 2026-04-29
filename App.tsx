import 'react-native-gesture-handler';
import './global.css';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useState, useCallback } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import RootNavigator from './src/navigation/RootNavigator';
import { ToastProvider } from 'react-native-toast-notifications';
import { usePushNotifications } from './src/hooks/usePushNotifications';
import { preloadAppAssets } from './src/lib/preloadAssets';
import {
  useFonts,
  Quicksand_400Regular,
  Quicksand_600SemiBold,
  Quicksand_700Bold,
} from '@expo-google-fonts/quicksand';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [fontsLoaded] = useFonts({
    Quicksand_400Regular,
    Quicksand_600SemiBold,
    Quicksand_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const isReady = appIsReady && fontsLoaded;

  // Mount push-notification foreground/tap listeners once.
  usePushNotifications();

  useEffect(() => {
    async function prepare() {
      try {
        // Decode critical bitmap assets (logo, splash artwork) into memory
        // *before* we hide the splash screen — eliminates the flash where
        // the navbar logo arrives 5-10s after first paint.
        await preloadAppAssets();
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (isReady) {
      
      await SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
       <ToastProvider
      duration={3000} 
      offset={50}     
      swipeEnabled
      animationType="slide-in"
      placement="top"
    >
      <View style={styles.root} onLayout={onLayoutRootView}>
        <StatusBar style="light" backgroundColor="#265CC7" />
        <RootNavigator />
      </View>
       </ToastProvider>
      
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#265CC7", 
  },
});
