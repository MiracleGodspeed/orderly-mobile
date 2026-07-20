import React, { useEffect, useState } from "react";
import { View, Text, Pressable, Dimensions, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ConfettiCannon from "react-native-confetti-cannon";
import Modal from "react-native-modal";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";

/**
 * In-app order-milestone celebration (first order, 50, 100, 200, 300,
 * 500, then every 100). Detection is fully client-side: Home passes the
 * all-time order count, we compare the highest crossed milestone against
 * what this device last celebrated (AsyncStorage, per store) and fire
 * confetti + a sheet exactly once per milestone. Email + push for the
 * same milestones come from the backend order-milestone-sweep job.
 *
 * Baseline rule: first sighting of a store on this device records its
 * current standing WITHOUT celebrating, so an existing vendor updating
 * the app isn't congratulated for milestones passed long ago.
 *
 * Mirrors web `src/admin/components/MilestoneCelebration.tsx`.
 */

const LADDER_BASE = [1, 50, 100, 200, 300, 500];

export function highestMilestone(orderCount: number): number {
  let highest = 0;
  for (const m of LADDER_BASE) if (m <= orderCount) highest = m;
  if (orderCount >= 600) highest = Math.floor(orderCount / 100) * 100;
  return highest;
}

export default function OrderMilestoneCelebration({
  orderCount,
  storeKey,
}: {
  /** All-time order count (paid + pending-confirmation). */
  orderCount: number;
  /** Stable per-store key (slug) so multi-account devices don't cross wires. */
  storeKey: string;
}) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = Dimensions.get("window");
  const [celebrating, setCelebrating] = useState<number | null>(null);
  const [bursts, setBursts] = useState<number[]>([]);

  useEffect(() => {
    if (!storeKey) return;
    let cancelled = false;
    const key = `orderly:milestone-celebrated:${storeKey}`;
    const highest = highestMilestone(orderCount);

    AsyncStorage.getItem(key)
      .then((raw) => {
        if (cancelled) return;
        const stored = raw == null ? null : Number(raw);
        if (stored == null || Number.isNaN(stored)) {
          // First sighting on this device — baseline silently.
          AsyncStorage.setItem(key, String(highest)).catch(() => {});
          return;
        }
        if (highest > stored) {
          AsyncStorage.setItem(key, String(highest)).catch(() => {});
          setCelebrating(highest);
          if (Platform.OS === "ios") {
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success
            ).catch(() => {});
          }
          let count = 0;
          const interval = setInterval(() => {
            setBursts((p) => [...p, Date.now() + Math.random()]);
            count += 1;
            if (count >= 3) clearInterval(interval);
          }, 700);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [orderCount, storeKey]);

  if (celebrating == null) return null;
  const isFirst = celebrating === 1;

  return (
    <>
      <Modal
        isVisible
        onBackdropPress={() => setCelebrating(null)}
        onBackButtonPress={() => setCelebrating(null)}
        useNativeDriver
        style={{ justifyContent: "center", margin: 24 }}
      >
        <View className="bg-white rounded-3xl p-7 items-center">
          <View className="w-16 h-16 rounded-2xl bg-amber-50 items-center justify-center mb-4">
            <Ionicons
              name={isFirst ? "gift-outline" : "trophy-outline"}
              size={30}
              color="#f59e0b"
            />
          </View>

          <Text
            className="text-gray-900 text-center"
            style={{
              fontFamily: "PlusJakartaSans_700Bold",
              fontSize: 21,
              letterSpacing: -0.4,
            }}
          >
            {isFirst
              ? "Your first order is in!"
              : `${celebrating.toLocaleString()} orders!`}
          </Text>
          <Text className="text-gray-500 text-[13px] mt-1.5 text-center leading-[19px]">
            {isFirst
              ? "Someone just chose your store. Your business is officially real — go make that first delivery count."
              : "Real customers, choosing your business again and again. Take a bow — then keep going."}
          </Text>

          <Pressable
            onPress={() => {
              setCelebrating(null);
              navigation.navigate("Orders");
            }}
            className="h-12 w-full mt-6 rounded-2xl bg-blue-600 items-center justify-center flex-row"
            style={{
              gap: 8,
              shadowColor: "#2563eb",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text className="text-white font-bold text-[14.5px]">
              {isFirst ? "View your order" : "See your orders"}
            </Text>
            <Ionicons name="arrow-forward" size={15} color="white" />
          </Pressable>

          <Pressable onPress={() => setCelebrating(null)} className="py-3">
            <Text
              className="text-gray-400 text-[12.5px]"
              style={{ fontFamily: "PlusJakartaSans_600SemiBold" }}
            >
              Keep working
            </Text>
          </Pressable>
        </View>

        {/* Confetti lives INSIDE the modal tree — rendered as a sibling
            in Home it would fall behind the modal backdrop. */}
        {bursts.map((bKey) => (
          <ConfettiCannon
            key={String(bKey)}
            count={40}
            origin={{ x: width / 2, y: 0 }}
            fadeOut
            autoStart
            fallSpeed={3000}
          />
        ))}
      </Modal>
    </>
  );
}
