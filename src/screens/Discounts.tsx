import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Clipboard,
  Alert,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import Modal from "react-native-modal";
import { useToast } from "react-native-toast-notifications";

import { ScreenHeader } from "../components/ScreenHeader";
import { FeaturePaywallSheet } from "../components/FeaturePaywallSheet";
import { useFeatures } from "../hooks/useFeatures";
import { FEATURES, FeatureKey } from "../lib/features";
import {
  createDiscountCode,
  deleteDiscountCode,
  getDiscountCodes,
  setDiscountCodeActive,
  type DiscountCodeRow,
} from "../api/vendor/vendor.api";

const cardShadow = {
  shadowColor: "#0f172a",
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.05,
  shadowRadius: 14,
  elevation: 2,
} as const;

const haptic = () => {
  if (Platform.OS === "ios") {
    Haptics.selectionAsync().catch(() => {});
  }
};

const naira = (n: number) => `₦${Math.round(n).toLocaleString()}`;

/** Friendly random code — a recognisable prefix plus 4 unambiguous
 *  characters (no O/0/I/1 lookalikes). Mirrors web /vendor/discounts. */
const generateCouponCode = (
  kind: "percent" | "amount",
  value: string
): string => {
  const prefixes = ["SAVE", "DEAL", "SHOP", "GIFT", "VIP", "PROMO", "HELLO"];
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const numValue = Number(value);
  const valuePart =
    kind === "percent" && Number.isFinite(numValue) && numValue > 0
      ? String(Math.round(numValue))
      : "";
  let random = "";
  for (let i = 0; i < 4; i++) {
    random += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `${prefix}${valuePart}${random}`;
};

/**
 * Vendor coupon codes — create discount codes (percent or fixed
 * amount) with usage caps, minimum orders, and expiry; pause, resume,
 * or delete them; watch redemptions tick up. Plan-gated on
 * discounts.codes. Mirrors web /vendor/discounts.
 */
export default function Discounts() {
  const toast = useToast();
  const { has, isReady } = useFeatures();
  const locked = isReady && !has(FEATURES.DISCOUNT_CODES);

  const [rows, setRows] = useState<DiscountCodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState<FeatureKey | null>(null);

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setRows(await getDiscountCodes());
    } catch {
      // Empty state covers it.
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }, [load]);

  const handleToggle = async (row: DiscountCodeRow) => {
    haptic();
    setBusyId(row.id);
    try {
      await setDiscountCodeActive(row.id, !row.isActive);
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, isActive: !row.isActive } : r))
      );
    } catch (err: any) {
      toast.show(err?.message || "Couldn't update the coupon", { type: "danger" });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = (row: DiscountCodeRow) => {
    Alert.alert(
      `Delete ${row.code}?`,
      "Customers will no longer be able to use this code.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setBusyId(row.id);
            try {
              await deleteDiscountCode(row.id);
              setRows((prev) => prev.filter((r) => r.id !== row.id));
              toast.show("Coupon deleted", { type: "success" });
            } catch (err: any) {
              toast.show(err?.message || "Couldn't delete the coupon", {
                type: "danger",
              });
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  };

  const handleCopy = (row: DiscountCodeRow) => {
    haptic();
    Clipboard.setString(row.code);
    toast.show(`${row.code} copied`, { type: "success" });
  };

  return (
    <View className="flex-1 bg-gray-50">
      <ScreenHeader title="Coupons" />

      {locked ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-14 h-14 rounded-2xl bg-blue-50 items-center justify-center mb-4">
            <Ionicons name="lock-closed" size={22} color="#2563eb" />
          </View>
          <Text
            className="text-gray-900 text-[16px] text-center"
            style={{ fontFamily: "PlusJakartaSans_700Bold" }}
          >
            Coupon codes are a plan feature
          </Text>
          <Text className="text-gray-500 text-[13px] mt-1.5 text-center leading-[19px]">
            Create discount codes with your own value, usage limit, and expiry
            — customers apply them at checkout.
          </Text>
          <Pressable
            onPress={() => setPaywallFeature(FEATURES.DISCOUNT_CODES)}
            className="h-10 mt-5 px-5 rounded-full bg-blue-600 items-center justify-center"
          >
            <Text className="text-white font-bold text-[13px]">
              See upgrade options
            </Text>
          </Pressable>
        </View>
      ) : loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {rows.length === 0 ? (
              <View className="items-center px-8 py-20">
                <View className="w-14 h-14 rounded-2xl bg-blue-50 items-center justify-center mb-4">
                  <Ionicons name="pricetag-outline" size={22} color="#2563eb" />
                </View>
                <Text
                  className="text-gray-900 text-[16px] text-center"
                  style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                >
                  No coupons yet
                </Text>
                <Text className="text-gray-500 text-[13px] mt-1.5 text-center leading-[19px]">
                  Create your first code — perfect for launches, loyal
                  customers, and slow weeks.
                </Text>
              </View>
            ) : (
              rows.map((row) => {
                const expired =
                  row.expiresAtUtc != null &&
                  new Date(row.expiresAtUtc).getTime() <= Date.now();
                const exhausted = row.remainingUses === 0;
                const dormant = !row.isActive || expired || exhausted;
                const statusLabel = expired
                  ? "Expired"
                  : exhausted
                  ? "Used up"
                  : row.isActive
                  ? "Active"
                  : "Paused";
                const statusStyle = expired
                  ? "bg-gray-100 text-gray-500"
                  : exhausted
                  ? "bg-amber-50 text-amber-700"
                  : row.isActive
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-gray-100 text-gray-500";
                return (
                  <View
                    key={row.id}
                    className="bg-white rounded-2xl border border-gray-100 p-4 mb-3"
                    style={cardShadow}
                  >
                    <View className="flex-row items-center">
                      <View
                        className={`w-11 h-11 rounded-2xl items-center justify-center mr-3 ${
                          dormant ? "bg-gray-100" : "bg-blue-50"
                        }`}
                      >
                        <Ionicons
                          name="pricetag"
                          size={18}
                          color={dormant ? "#9ca3af" : "#2563eb"}
                        />
                      </View>
                      <View className="flex-1 min-w-0">
                        <View className="flex-row items-center" style={{ gap: 8 }}>
                          <Pressable
                            onPress={() => handleCopy(row)}
                            className="flex-row items-center"
                            style={{ gap: 4 }}
                          >
                            <Text
                              className="text-gray-900 text-[14px] tracking-widest"
                              style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                            >
                              {row.code}
                            </Text>
                            <Ionicons name="copy-outline" size={11} color="#d1d5db" />
                          </Pressable>
                          <View className={`px-2 py-0.5 rounded-full ${statusStyle.split(" ")[0]}`}>
                            <Text
                              className={`text-[9.5px] font-extrabold uppercase tracking-wide ${statusStyle.split(" ")[1]}`}
                            >
                              {statusLabel}
                            </Text>
                          </View>
                        </View>
                        <Text className="text-[11.5px] text-gray-500 mt-0.5">
                          {row.kind === "percent"
                            ? `${row.value}% off`
                            : `${naira(row.value)} off`}
                          {row.minOrderAmount != null &&
                            ` · min ${naira(row.minOrderAmount)}`}
                          {row.maxRedemptions != null
                            ? ` · ${row.redemptionCount}/${row.maxRedemptions} used`
                            : ` · ${row.redemptionCount} used`}
                          {row.expiresAtUtc
                            ? ` · ${expired ? "expired" : "expires"} ${new Date(row.expiresAtUtc).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                            : ""}
                        </Text>
                      </View>
                      <View className="flex-row items-center" style={{ gap: 6 }}>
                        <Pressable
                          onPress={() => handleToggle(row)}
                          disabled={busyId === row.id}
                          className="w-9 h-9 rounded-full border border-gray-200 items-center justify-center active:bg-gray-50"
                        >
                          {busyId === row.id ? (
                            <ActivityIndicator size="small" color="#6b7280" />
                          ) : (
                            <Ionicons
                              name={row.isActive ? "pause" : "play"}
                              size={14}
                              color="#6b7280"
                            />
                          )}
                        </Pressable>
                        <Pressable
                          onPress={() => handleDelete(row)}
                          disabled={busyId === row.id}
                          className="w-9 h-9 rounded-full border border-gray-200 items-center justify-center active:bg-rose-50"
                        >
                          <Ionicons name="trash-outline" size={14} color="#9ca3af" />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Floating create button */}
          <Pressable
            onPress={() => {
              haptic();
              setCreateOpen(true);
            }}
            className="absolute bottom-8 right-5 h-13 rounded-full bg-blue-600 flex-row items-center justify-center px-5"
            style={{
              height: 52,
              gap: 6,
              shadowColor: "#2563eb",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.3,
              shadowRadius: 10,
              elevation: 6,
            }}
          >
            <Ionicons name="add" size={20} color="white" />
            <Text className="text-white font-bold text-[14px]">New coupon</Text>
          </Pressable>
        </>
      )}

      <CreateCouponSheet
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(row) => {
          setRows((prev) => [row, ...prev]);
          setCreateOpen(false);
          toast.show("Coupon created!", { type: "success" });
        }}
      />

      <FeaturePaywallSheet
        visible={paywallFeature != null}
        onClose={() => setPaywallFeature(null)}
        feature={paywallFeature}
      />
    </View>
  );
}

/* ── Create sheet ─────────────────────────────────────────────── */

function CreateCouponSheet({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (row: DiscountCodeRow) => void;
}) {
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<"percent" | "amount">("percent");
  const [value, setValue] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [minOrderAmount, setMinOrderAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setCode("");
    setKind("percent");
    setValue("");
    setMaxRedemptions("");
    setMinOrderAmount("");
    setError(null);
  };

  const handleSubmit = async () => {
    const numValue = Number(value);
    if (code.trim().length < 3) {
      setError("Code must be at least 3 characters.");
      return;
    }
    if (!Number.isFinite(numValue) || numValue <= 0) {
      setError("Enter a discount value.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const row = await createDiscountCode({
        code: code.trim().toUpperCase(),
        kind,
        value: numValue,
        maxRedemptions: maxRedemptions ? Number(maxRedemptions) : null,
        minOrderAmount: minOrderAmount ? Number(minOrderAmount) : null,
      });
      reset();
      onCreated(row);
    } catch (err: any) {
      setError(err?.message || "Couldn't create the coupon.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "bg-white border border-gray-200 rounded-xl px-3.5 py-3 text-[14px] text-gray-900";

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      useNativeDriver
      avoidKeyboard
      style={{ justifyContent: "flex-end", margin: 0 }}
    >
      <View className="bg-gray-50 rounded-t-3xl px-5 pt-5 pb-8">
        <View className="flex-row items-center justify-between mb-4">
          <Text
            className="text-gray-900 text-[17px]"
            style={{ fontFamily: "PlusJakartaSans_700Bold" }}
          >
            New coupon
          </Text>
          <Pressable
            onPress={onClose}
            className="w-8 h-8 rounded-full items-center justify-center active:bg-gray-100"
          >
            <Ionicons name="close" size={18} color="#9ca3af" />
          </Pressable>
        </View>

        <Text className="text-[12px] font-bold text-gray-700 mb-1.5">Code</Text>
        <View className="flex-row" style={{ gap: 8 }}>
          <TextInput
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            maxLength={24}
            autoCapitalize="characters"
            placeholder="e.g. LAUNCH10"
            placeholderTextColor="#9ca3af"
            className={`${inputClass} tracking-widest font-bold flex-1`}
          />
          <Pressable
            onPress={() => {
              haptic();
              setCode(generateCouponCode(kind, value));
            }}
            className="px-3.5 rounded-xl border border-gray-200 bg-white items-center justify-center flex-row active:bg-gray-50"
            style={{ gap: 5 }}
          >
            <Ionicons name="dice-outline" size={15} color="#4b5563" />
            <Text className="text-[12.5px] font-bold text-gray-600">
              Generate
            </Text>
          </Pressable>
        </View>

        <Text className="text-[12px] font-bold text-gray-700 mt-4 mb-1.5">
          Discount type
        </Text>
        <View className="flex-row" style={{ gap: 8 }}>
          {(
            [
              ["percent", "Percent off"],
              ["amount", "Amount off (₦)"],
            ] as const
          ).map(([k, label]) => (
            <Pressable
              key={k}
              onPress={() => setKind(k)}
              className={`flex-1 h-10 rounded-xl border items-center justify-center ${
                kind === k
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <Text
                className={`text-[13px] font-bold ${
                  kind === k ? "text-blue-700" : "text-gray-600"
                }`}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text className="text-[12px] font-bold text-gray-700 mt-4 mb-1.5">
          {kind === "percent" ? "Percent off (1–90)" : "Amount off (₦)"}
        </Text>
        <TextInput
          value={value}
          onChangeText={setValue}
          keyboardType="numeric"
          placeholder={kind === "percent" ? "e.g. 10" : "e.g. 2000"}
          placeholderTextColor="#9ca3af"
          className={inputClass}
        />

        <View className="flex-row mt-4" style={{ gap: 10 }}>
          <View className="flex-1">
            <Text className="text-[12px] font-bold text-gray-700 mb-1.5">
              Usage limit <Text className="text-gray-400 font-normal">(optional)</Text>
            </Text>
            <TextInput
              value={maxRedemptions}
              onChangeText={setMaxRedemptions}
              keyboardType="numeric"
              placeholder="Unlimited"
              placeholderTextColor="#9ca3af"
              className={inputClass}
            />
          </View>
          <View className="flex-1">
            <Text className="text-[12px] font-bold text-gray-700 mb-1.5">
              Min order (₦) <Text className="text-gray-400 font-normal">(optional)</Text>
            </Text>
            <TextInput
              value={minOrderAmount}
              onChangeText={setMinOrderAmount}
              keyboardType="numeric"
              placeholder="None"
              placeholderTextColor="#9ca3af"
              className={inputClass}
            />
          </View>
        </View>

        {error ? (
          <Text className="text-[12.5px] font-semibold text-rose-600 mt-3">
            {error}
          </Text>
        ) : null}

        <Pressable
          onPress={handleSubmit}
          disabled={submitting}
          className="h-12 mt-5 rounded-2xl bg-blue-600 items-center justify-center flex-row"
          style={{
            gap: 8,
            opacity: submitting ? 0.7 : 1,
            shadowColor: "#2563eb",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          {submitting && <ActivityIndicator size="small" color="white" />}
          <Text className="text-white font-bold text-[15px]">
            {submitting ? "Creating…" : "Create coupon"}
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
}
