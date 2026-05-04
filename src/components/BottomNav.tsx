import React from 'react';
import { View, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface TabConfig {
  id: string;
  /** Icon for the inactive state — outline variant. */
  outline: keyof typeof Ionicons.glyphMap;
  /** Icon for the active state — solid variant. Picked deliberately
   *  per-tab rather than auto-derived from the outline so each one
   *  gets the most refined glyph available. */
  filled: keyof typeof Ionicons.glyphMap;
  label: string;
  screen: keyof RootStackParamList;
}

const ACTIVE_COLOR = '#2563eb';
const ACTIVE_PILL = '#dbeafe';
const ACTIVE_PILL_BORDER = '#bfdbfe';
const INACTIVE_COLOR = '#94a3b8';
const INACTIVE_LABEL = '#64748b';

/**
 * Self-contained tab item. Uses Reanimated for the active-pill
 * scale-in/scale-out so the transition feels deliberate rather than
 * a naked CSS class swap. Kept to one shared value per tab to
 * minimise re-renders on navigation.
 */
function NavTab({
  tab,
  isActive,
  onPress,
}: {
  tab: TabConfig;
  isActive: boolean;
  onPress: () => void;
}) {
  // Pill scale: 1 when active, 0.85 when inactive (so it tucks in
  // rather than disappearing entirely; a subtle ghost remains).
  const pillScale = useSharedValue(isActive ? 1 : 0.85);
  const pillOpacity = useSharedValue(isActive ? 1 : 0);
  const labelOpacity = useSharedValue(isActive ? 1 : 0.85);

  React.useEffect(() => {
    pillScale.value = withSpring(isActive ? 1 : 0.85, {
      damping: 15,
      stiffness: 220,
    });
    pillOpacity.value = withTiming(isActive ? 1 : 0, { duration: 180 });
    labelOpacity.value = withTiming(isActive ? 1 : 0.9, { duration: 180 });
  }, [isActive, pillScale, pillOpacity, labelOpacity]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: pillOpacity.value,
    transform: [{ scale: pillScale.value }],
  }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
  }));

  return (
    <Pressable
      onPress={onPress}
      className="flex-1 items-center justify-center"
      hitSlop={6}
      android_ripple={{ color: '#e0e7ff', borderless: true, radius: 32 }}
    >
      {/* Icon + active-pill stack. The pill sits behind the icon and
          fades/scales in when this tab becomes active. */}
      <View className="w-12 h-8 items-center justify-center">
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              width: 44,
              height: 30,
              borderRadius: 999,
              backgroundColor: ACTIVE_PILL,
              borderWidth: 1,
              borderColor: ACTIVE_PILL_BORDER,
            },
            pillStyle,
          ]}
        />
        <Ionicons
          name={isActive ? tab.filled : tab.outline}
          size={isActive ? 20 : 21}
          color={isActive ? ACTIVE_COLOR : INACTIVE_COLOR}
        />
      </View>

      <Animated.Text
        style={[
          {
            fontSize: 10.5,
            marginTop: 3,
            letterSpacing: 0.2,
            color: isActive ? ACTIVE_COLOR : INACTIVE_LABEL,
            fontFamily: isActive
              ? 'PlusJakartaSans_700Bold'
              : 'PlusJakartaSans_500Medium',
          },
          labelStyle,
        ]}
      >
        {tab.label}
      </Animated.Text>
    </Pressable>
  );
}

export default function BottomNav() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  // Refined glyph picks: ditched the document-text "report" icon and
  // generic person silhouette for `analytics` and `person-circle` —
  // they read as modern commerce-app icons, not 2010 admin panels.
  const tabs: TabConfig[] = [
    {
      id: 'home',
      outline: 'home-outline',
      filled: 'home',
      label: 'Home',
      screen: 'Home',
    },
    {
      id: 'orders',
      outline: 'bag-handle-outline',
      filled: 'bag-handle',
      label: 'Orders',
      screen: 'Orders',
    },
    {
      id: 'store',
      outline: 'storefront-outline',
      filled: 'storefront',
      label: 'Store',
      screen: 'ManageStore',
    },
    {
      id: 'reports',
      outline: 'analytics-outline',
      filled: 'analytics',
      label: 'Reports',
      screen: 'ReportsAnalytics',
    },
    {
      id: 'profile',
      outline: 'person-circle-outline',
      filled: 'person-circle',
      label: 'Profile',
      screen: 'Profile',
    },
  ];

  const isActiveTab = (screenName: string) => route.name === screenName;

  const handleTabPress = (screen: keyof RootStackParamList, isActive: boolean) => {
    if (isActive) return;
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync().catch(() => {});
    }
    navigation.navigate(screen as any);
  };

  return (
    <View
      className="absolute bottom-0 left-0 right-0 bg-white"
      style={{
        // Pull tabs closer to the bottom edge. The full `insets.bottom`
        // (~34pt on iPhones with a home indicator) leaves the icons
        // floating high above the indicator, which is what the previous
        // version did. Shaving 14pt brings the labels right above the
        // indicator like the native tab bar, while the floor of 4pt
        // keeps it sensible on Android (where insets.bottom is 0).
        paddingBottom: Math.max(insets.bottom - 14, 6),
        // Soft elevated border instead of a hard 1px line — feels more
        // premium and matches modern iOS/Android tab bars.
        borderTopWidth: 0,
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 12,
      }}
    >
      {/* Hairline divider — drawn as its own view so we can keep it
          half-pixel thin without depending on borderTop quirks. */}
      <View
        style={{
          height: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.06)',
        }}
      />
      <View className="flex-row h-16 px-1">
        {tabs.map((tab) => (
          <NavTab
            key={tab.id}
            tab={tab}
            isActive={isActiveTab(tab.screen)}
            onPress={() => handleTabPress(tab.screen, isActiveTab(tab.screen))}
          />
        ))}
      </View>
    </View>
  );
}
