import { View, Text, Pressable } from "react-native";
import * as WebBrowser from "expo-web-browser";

/**
 * Apple App Store Review Guideline 3.1.2(c) requires every screen that
 * commits a user to an auto-renewing subscription to render, in the app
 * itself (not just the marketing site):
 *
 *   • The subscription title
 *   • Its length / billing period
 *   • Its price (and price per unit if material)
 *   • A functional Privacy Policy link
 *   • A functional Terms of Use (EULA) link
 *   • The standard auto-renewal language
 *
 * Title + length + price are already carried by the surrounding screen
 * chrome (plan card + cycle toggle + CTA price string). This component
 * adds the missing disclosure sentence + the two required tappable
 * links so every subscription surface is compliant without each screen
 * having to hand-roll the legalese itself.
 *
 * Drop it inside the sticky footer just above the Continue / Subscribe
 * button. Keep it compact — small grey type so it reads as legal
 * fine-print, not marketing copy.
 *
 * Privacy + Terms open in an in-app browser via expo-web-browser so the
 * reviewer never sees the app open Safari. URLs match what's set in
 * App Store Connect — keep them in sync if either is ever moved.
 */

const PRIVACY_URL = "https://orderlystores.com/privacy";
const TERMS_URL = "https://orderlystores.com/terms";

export default function SubscriptionLegalDisclosure() {
  return (
    <View className="pb-3 px-1">
      <Text className="text-[11px] text-gray-500 leading-[15px] text-center">
        Subscriptions auto-renew unless cancelled at least 24 hours before the
        end of the current period. Manage in your App Store account.
      </Text>
      <View className="flex-row items-center justify-center gap-2 mt-2">
        <Pressable
          onPress={() =>
            WebBrowser.openBrowserAsync(PRIVACY_URL).catch(() => {})
          }
          hitSlop={8}
        >
          <Text className="text-[11px] font-semibold text-blue-700 underline">
            Privacy Policy
          </Text>
        </Pressable>
        <Text className="text-[11px] text-gray-400">·</Text>
        <Pressable
          onPress={() =>
            WebBrowser.openBrowserAsync(TERMS_URL).catch(() => {})
          }
          hitSlop={8}
        >
          <Text className="text-[11px] font-semibold text-blue-700 underline">
            Terms of Use
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
