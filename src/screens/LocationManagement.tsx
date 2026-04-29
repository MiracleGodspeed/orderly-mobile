import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useToast } from "react-native-toast-notifications";

import {
  useVendor,
  VendorLocation,
  VendorDelivery,
  VendorCustomLocations,
} from "../../context/VendorContext";
import { ScreenHeader } from "../components/ScreenHeader";
import { SelectionDrawer } from "../components/SelectionDrawer";
import NIGERIA_STATES from "../utils/nigeriaLocations";

interface SelectedLocation {
  stateId: string;
  localGovernmentIds: string[];
}

interface DeliveryCharge {
  localGovernmentId: string;
  charge: number;
}

const haptic = () => {
  if (Platform.OS === "ios") {
    Haptics.selectionAsync().catch(() => {});
  }
};

export default function LocationManagement() {
  const { storeData, updateVendorSettings, loading } = useVendor();
  const toast = useToast();

  // Core state — shape matches the API payload exactly
  const [selectedLocations, setSelectedLocations] = useState<
    SelectedLocation[]
  >([]);
  const [deliveryCharges, setDeliveryCharges] = useState<DeliveryCharge[]>(
    []
  );
  const [customLocations, setCustomLocations] = useState<
    VendorCustomLocations[]
  >([]);

  // UI state
  const [statePickerOpen, setStatePickerOpen] = useState(false);
  const [lgaPickerStateId, setLgaPickerStateId] = useState<string | null>(
    null
  );
  const [bulkPriceFor, setBulkPriceFor] = useState<string | null>(null);
  const [bulkPriceValue, setBulkPriceValue] = useState("");
  const [customForm, setCustomForm] = useState<{
    stateId: string | null;
    name: string;
    charge: string;
  }>({ stateId: null, name: "", charge: "" });
  const [stateSearch, setStateSearch] = useState("");
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  // Hydrate from storeData
  useEffect(() => {
    if (!storeData) return;
    setSelectedLocations(
      (storeData.vendor_locations as VendorLocation[] | null) ?? []
    );
    setDeliveryCharges(
      ((storeData.vendor_delivery_charges as VendorDelivery[] | null) ?? []).map(
        (c) => ({
          localGovernmentId: c.localGovernmentId,
          charge: Number(c.charge) || 0,
        })
      )
    );
    setCustomLocations(storeData.vendor_custom_locations ?? []);
  }, [storeData]);

  // ===== Helpers =====
  const getStateName = (stateId: string) =>
    NIGERIA_STATES.find((s) => s.id === stateId)?.name || stateId;

  const getLgName = (stateId: string, lgId: string) => {
    const customLoc = customLocations.find((c) => c.id === lgId);
    if (customLoc) return customLoc.name;
    const state = NIGERIA_STATES.find((s) => s.id === stateId);
    return state?.localGovernments.find((lg) => lg.id === lgId)?.name || lgId;
  };

  const getCharge = (lgId: string) =>
    deliveryCharges.find((c) => c.localGovernmentId === lgId)?.charge ?? 0;

  const isCustom = (lgId: string) =>
    customLocations.some((c) => c.id === lgId);

  const stateAllIds = (stateId: string): Set<string> => {
    const state = NIGERIA_STATES.find((s) => s.id === stateId);
    const lgIds = state?.localGovernments.map((lg) => lg.id) || [];
    const customIds = customLocations
      .filter((c) => c.stateId === stateId)
      .map((c) => c.id);
    return new Set([...lgIds, ...customIds]);
  };

  const activeStates = useMemo(
    () => selectedLocations.filter((l) => l.localGovernmentIds.length > 0),
    [selectedLocations]
  );

  const filteredActiveStates = useMemo(() => {
    const term = stateSearch.trim().toLowerCase();
    if (!term) return activeStates;
    return activeStates.filter((l) =>
      getStateName(l.stateId).toLowerCase().includes(term)
    );
  }, [activeStates, stateSearch]);

  const totalAreas = useMemo(
    () =>
      activeStates.reduce((sum, s) => sum + s.localGovernmentIds.length, 0),
    [activeStates]
  );

  const unsetCount = useMemo(
    () =>
      activeStates.reduce(
        (sum, s) =>
          sum + s.localGovernmentIds.filter((id) => getCharge(id) === 0).length,
        0
      ),
    [activeStates, deliveryCharges]
  );

  const availableStateOptions = useMemo(
    () =>
      NIGERIA_STATES.filter(
        (s) => !activeStates.some((a) => a.stateId === s.id)
      ).map((s) => ({ value: s.id, label: s.name })),
    [activeStates]
  );

  const lgaPickerOptions = useMemo(() => {
    if (!lgaPickerStateId) return [];
    const state = NIGERIA_STATES.find((s) => s.id === lgaPickerStateId);
    const stateLgs =
      state?.localGovernments.map((lg) => ({
        value: lg.id,
        label: lg.name,
      })) || [];
    const customForState = customLocations
      .filter((c) => c.stateId === lgaPickerStateId)
      .map((c) => ({ value: c.id, label: `${c.name} (custom)` }));
    return [...stateLgs, ...customForState];
  }, [lgaPickerStateId, customLocations]);

  const lgaPickerSelected =
    selectedLocations.find((l) => l.stateId === lgaPickerStateId)
      ?.localGovernmentIds || [];

  // ===== Mutations =====
  const handleAddState = (stateId: string) => {
    setSelectedLocations((prev) => {
      if (prev.some((l) => l.stateId === stateId)) return prev;
      return [...prev, { stateId, localGovernmentIds: [] }];
    });
    setLgaPickerStateId(stateId);
  };

  const handleApplyLgas = (stateId: string, lgIds: string[]) => {
    setSelectedLocations((prev) => {
      if (!prev.some((l) => l.stateId === stateId)) {
        return [...prev, { stateId, localGovernmentIds: lgIds }];
      }
      return prev.map((l) =>
        l.stateId === stateId ? { ...l, localGovernmentIds: lgIds } : l
      );
    });

    const knownInState = stateAllIds(stateId);
    setDeliveryCharges((prev) => {
      const filtered = prev.filter(
        (c) =>
          !knownInState.has(c.localGovernmentId) ||
          lgIds.includes(c.localGovernmentId)
      );
      const existingIds = new Set(filtered.map((c) => c.localGovernmentId));
      const additions = lgIds
        .filter((id) => !existingIds.has(id))
        .map((id) => ({ localGovernmentId: id, charge: 0 }));
      return [...filtered, ...additions];
    });
  };

  const handleRemoveState = (stateId: string) => {
    haptic();
    const ids = stateAllIds(stateId);
    setSelectedLocations((prev) => prev.filter((l) => l.stateId !== stateId));
    setDeliveryCharges((prev) =>
      prev.filter((c) => !ids.has(c.localGovernmentId))
    );
    setCustomLocations((prev) => prev.filter((c) => c.stateId !== stateId));
  };

  const removeLg = (stateId: string, lgId: string) => {
    setSelectedLocations((prev) =>
      prev.map((l) =>
        l.stateId === stateId
          ? {
              ...l,
              localGovernmentIds: l.localGovernmentIds.filter(
                (id) => id !== lgId
              ),
            }
          : l
      )
    );
    setDeliveryCharges((prev) =>
      prev.filter((c) => c.localGovernmentId !== lgId)
    );
    if (isCustom(lgId)) {
      setCustomLocations((prev) => prev.filter((c) => c.id !== lgId));
    }
  };

  const updateCharge = (lgId: string, raw: string) => {
    const parsed = raw === "" ? 0 : parseInt(raw, 10);
    const charge = isNaN(parsed) ? 0 : Math.max(0, parsed);
    setDeliveryCharges((prev) =>
      prev.map((c) =>
        c.localGovernmentId === lgId ? { ...c, charge } : c
      )
    );
  };

  const applyBulkPrice = (stateId: string) => {
    const parsed = parseInt(bulkPriceValue || "0", 10);
    if (isNaN(parsed) || parsed < 0) return;
    const ids = stateAllIds(stateId);
    setDeliveryCharges((prev) =>
      prev.map((c) =>
        ids.has(c.localGovernmentId) ? { ...c, charge: parsed } : c
      )
    );
    setBulkPriceFor(null);
    setBulkPriceValue("");
  };

  const addCustomLocation = (stateId: string) => {
    const name = customForm.name.trim();
    const charge = parseInt(customForm.charge || "0", 10) || 0;
    if (!name) {
      toast.show("Enter a name for the custom area", { type: "warning" });
      return;
    }
    const id = name.toLowerCase().replace(/\s+/g, "-");
    if (
      customLocations.some((c) => c.stateId === stateId && c.id === id)
    ) {
      toast.show("A custom area with this name already exists", {
        type: "warning",
      });
      return;
    }

    setCustomLocations((prev) => [
      ...prev,
      { id, name, stateId, deliveryCharge: charge.toString() },
    ]);
    setSelectedLocations((prev) => {
      const existing = prev.find((l) => l.stateId === stateId);
      if (existing) {
        return prev.map((l) =>
          l.stateId === stateId
            ? {
                ...l,
                localGovernmentIds: [...l.localGovernmentIds, id],
              }
            : l
        );
      }
      return [...prev, { stateId, localGovernmentIds: [id] }];
    });
    setDeliveryCharges((prev) => [
      ...prev,
      { localGovernmentId: id, charge },
    ]);
    setCustomForm({ stateId: null, name: "", charge: "" });
  };

  const save = async () => {
    if (activeStates.length === 0) {
      toast.show("Add at least one delivery area before saving", {
        type: "warning",
      });
      return;
    }
    setSaveStatus("saving");
    try {
      await updateVendorSettings({
        vendor_locations: selectedLocations,
        vendor_delivery_charges: deliveryCharges.map((c) => ({
          localGovernmentId: c.localGovernmentId,
          charge: c.charge,
        })) as VendorDelivery[],
        vendor_custom_locations: customLocations,
      });
      setSaveStatus("saved");
      if (Platform.OS === "ios") {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        ).catch(() => {});
      }
      setTimeout(() => setSaveStatus("idle"), 2200);
    } catch (e) {
      console.error("Failed to save location settings", e);
      setSaveStatus("error");
      toast.show("Failed to save. Please try again.", { type: "danger" });
      setTimeout(() => setSaveStatus("idle"), 2200);
    }
  };

  // ===== Sub-renders =====
  const renderStateCard = (loc: SelectedLocation) => {
    const stateName = getStateName(loc.stateId);
    const stateLgIds = loc.localGovernmentIds;
    const unset = stateLgIds.filter((id) => getCharge(id) === 0).length;
    const showingCustomForm = customForm.stateId === loc.stateId;
    const showingBulkForm = bulkPriceFor === loc.stateId;

    return (
      <View
        key={loc.stateId}
        className="bg-white rounded-2xl border border-gray-100 mb-3 overflow-hidden"
        style={{
          shadowColor: "#0f172a",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 6,
          elevation: 1,
        }}
      >
        {/* Header */}
        <View className="flex-row items-start justify-between gap-3 px-4 py-3.5 border-b border-gray-100">
          <View className="flex-row items-center gap-3 flex-1 min-w-0">
            <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center">
              <Ionicons name="location" size={18} color="#2563eb" />
            </View>
            <View className="flex-1 min-w-0">
              <Text
                className="font-extrabold text-gray-900 text-[15px]"
                numberOfLines={1}
              >
                {stateName} State
              </Text>
              <Text className="text-[11.5px] text-gray-500 mt-0.5">
                {stateLgIds.length}{" "}
                {stateLgIds.length === 1 ? "area" : "areas"}
                {unset > 0 && (
                  <Text className="text-amber-700 font-semibold">
                    {" · "}
                    {unset} need{unset === 1 ? "s" : ""} pricing
                  </Text>
                )}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => handleRemoveState(loc.stateId)}
            className="w-8 h-8 rounded-full items-center justify-center active:bg-rose-50"
            hitSlop={6}
          >
            <Ionicons name="trash-outline" size={16} color="#9ca3af" />
          </Pressable>
        </View>

        {/* LGA pricing list */}
        {stateLgIds.map((lgId, idx) => {
          const charge = getCharge(lgId);
          const isUnset = charge === 0;
          return (
            <View
              key={lgId}
              className={`flex-row items-center gap-3 px-4 py-3 ${
                idx > 0 ? "border-t border-gray-50" : ""
              }`}
            >
              <View className="flex-1 min-w-0">
                <View className="flex-row items-center gap-1.5">
                  <Text
                    className="text-[14px] font-semibold text-gray-900 flex-shrink"
                    numberOfLines={1}
                  >
                    {getLgName(loc.stateId, lgId)}
                  </Text>
                  {isCustom(lgId) && (
                    <View className="bg-blue-100 px-1.5 py-0.5 rounded">
                      <Text className="text-[9px] font-extrabold text-blue-700 tracking-wide">
                        CUSTOM
                      </Text>
                    </View>
                  )}
                </View>
                {isUnset && (
                  <View className="flex-row items-center gap-1 mt-0.5">
                    <Ionicons
                      name="alert-circle"
                      size={11}
                      color="#d97706"
                    />
                    <Text className="text-[11px] text-amber-700 font-semibold">
                      Set delivery fee
                    </Text>
                  </View>
                )}
              </View>

              <View className="flex-row items-center gap-1.5">
                <View
                  className={`flex-row items-center bg-gray-50 border rounded-xl overflow-hidden ${
                    isUnset ? "border-amber-200" : "border-gray-200"
                  }`}
                >
                  <Text className="px-2 text-[13px] font-semibold text-gray-500">
                    ₦
                  </Text>
                  <TextInput
                    value={charge === 0 ? "" : String(charge)}
                    onChangeText={(t) => updateCharge(lgId, t)}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor="#cbd5e1"
                    className="text-[13px] font-semibold text-gray-900 py-2 pr-2"
                    style={{ width: 70 }}
                  />
                </View>
                <Pressable
                  onPress={() => removeLg(loc.stateId, lgId)}
                  className="w-7 h-7 rounded-full items-center justify-center active:bg-gray-100"
                  hitSlop={4}
                >
                  <Ionicons name="close" size={15} color="#9ca3af" />
                </Pressable>
              </View>
            </View>
          );
        })}

        {/* Bulk price form */}
        {showingBulkForm && (
          <View className="px-4 py-3 bg-amber-50/60 border-t border-amber-100">
            <Text className="text-[12px] font-semibold text-gray-700 mb-2">
              Apply this price to all {stateLgIds.length} areas in {stateName}
            </Text>
            <View className="flex-row items-center gap-2">
              <View className="flex-1 flex-row items-center bg-white border border-gray-200 rounded-xl overflow-hidden max-w-[200px]">
                <Text className="px-3 text-[13px] font-semibold text-gray-500">
                  ₦
                </Text>
                <TextInput
                  autoFocus
                  value={bulkPriceValue}
                  onChangeText={setBulkPriceValue}
                  keyboardType="number-pad"
                  placeholder="e.g. 1500"
                  placeholderTextColor="#9ca3af"
                  className="flex-1 py-2 pr-3 text-[13px] font-semibold text-gray-900"
                />
              </View>
              <Pressable
                onPress={() => applyBulkPrice(loc.stateId)}
                disabled={!bulkPriceValue}
                className={`px-3 h-9 rounded-xl items-center justify-center ${
                  !bulkPriceValue ? "bg-gray-200" : "bg-blue-600"
                }`}
              >
                <Text
                  className={`text-[12.5px] font-bold ${
                    !bulkPriceValue ? "text-gray-400" : "text-white"
                  }`}
                >
                  Apply
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setBulkPriceFor(null);
                  setBulkPriceValue("");
                }}
                className="px-3 h-9 rounded-xl items-center justify-center"
              >
                <Text className="text-[12.5px] font-semibold text-gray-700">
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Custom area form */}
        {showingCustomForm && (
          <View className="px-4 py-3 bg-blue-50/60 border-t border-blue-100">
            <Text className="text-[12px] font-semibold text-gray-700 mb-2">
              Add a custom area in {stateName}
            </Text>
            <View className="gap-2">
              <TextInput
                autoFocus
                value={customForm.name}
                onChangeText={(t) =>
                  setCustomForm((p) => ({ ...p, name: t }))
                }
                placeholder="Area name (e.g. Lekki Phase 2)"
                placeholderTextColor="#9ca3af"
                className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-[13.5px] text-gray-900"
              />
              <View className="flex-row items-center gap-2">
                <View className="flex-1 flex-row items-center bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <Text className="px-3 text-[13px] font-semibold text-gray-500">
                    ₦
                  </Text>
                  <TextInput
                    value={customForm.charge}
                    onChangeText={(t) =>
                      setCustomForm((p) => ({ ...p, charge: t }))
                    }
                    keyboardType="number-pad"
                    placeholder="Delivery fee"
                    placeholderTextColor="#9ca3af"
                    className="flex-1 py-2 pr-3 text-[13.5px] font-semibold text-gray-900"
                  />
                </View>
                <Pressable
                  onPress={() => addCustomLocation(loc.stateId)}
                  className="px-3 h-10 rounded-xl bg-blue-600 items-center justify-center"
                >
                  <Text className="text-[12.5px] font-bold text-white">
                    Add area
                  </Text>
                </Pressable>
              </View>
              <Pressable
                onPress={() =>
                  setCustomForm({ stateId: null, name: "", charge: "" })
                }
                className="self-start px-3 py-1"
              >
                <Text className="text-[12px] font-semibold text-gray-600">
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Action row */}
        <View className="flex-row flex-wrap gap-2 px-4 py-3 bg-gray-50 border-t border-gray-100">
          <Pressable
            onPress={() => {
              haptic();
              setLgaPickerStateId(loc.stateId);
            }}
            className="flex-row items-center gap-1.5 px-3 h-8 rounded-full bg-white border border-gray-200"
          >
            <Ionicons name="create-outline" size={12} color="#374151" />
            <Text className="text-[11.5px] font-bold text-gray-700">
              Manage areas
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              haptic();
              setCustomForm({ stateId: loc.stateId, name: "", charge: "" });
              setBulkPriceFor(null);
            }}
            className="flex-row items-center gap-1.5 px-3 h-8 rounded-full bg-white border border-gray-200"
          >
            <Ionicons name="add" size={12} color="#374151" />
            <Text className="text-[11.5px] font-bold text-gray-700">
              Add custom area
            </Text>
          </Pressable>
          {stateLgIds.length > 1 && (
            <Pressable
              onPress={() => {
                haptic();
                setBulkPriceFor(loc.stateId);
                setBulkPriceValue("");
                setCustomForm({ stateId: null, name: "", charge: "" });
              }}
              className="flex-row items-center gap-1.5 px-3 h-8 rounded-full bg-amber-50 border border-amber-200"
            >
              <Ionicons name="flash" size={12} color="#b45309" />
              <Text className="text-[11.5px] font-bold text-amber-800">
                Set price for all
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <ScreenHeader title="Delivery Locations" />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Branded hero */}
        <View
          className="mx-5 mt-4 mb-4 rounded-3xl overflow-hidden px-5 py-5"
          style={{ backgroundColor: "#194eb8" }}
        >
          <View className="flex-row items-center gap-3">
            <View className="w-12 h-12 rounded-2xl bg-white/15 border border-white/15 items-center justify-center">
              <Ionicons name="location-outline" size={22} color="white" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-[18px] font-extrabold tracking-tight">
                Where you deliver
              </Text>
              <Text className="text-white/75 text-[12.5px] mt-0.5">
                Pick the states and areas, and set how much you charge.
              </Text>
            </View>
          </View>
        </View>

        <View className="px-5">
          {/* Stats strip */}
          {activeStates.length > 0 && (
            <View className="flex-row gap-2 mb-4">
              <SafeAreaView className="flex-1" edges={[]}>
                <StatTile
                  label="States"
                  value={String(activeStates.length)}
                />
              </SafeAreaView>
              <View className="flex-1">
                <StatTile label="Areas" value={String(totalAreas)} />
              </View>
              <View className="flex-1">
                <StatTile
                  label={unsetCount > 0 ? "Need pricing" : "All priced"}
                  value={
                    unsetCount > 0 ? String(unsetCount) : <CheckGlyph />
                  }
                  tone={unsetCount > 0 ? "amber" : "emerald"}
                />
              </View>
            </View>
          )}

          {/* Section heading */}
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-[14px] font-extrabold text-gray-900">
              {activeStates.length === 0
                ? "Get started"
                : "Your delivery areas"}
            </Text>
            {activeStates.length > 0 && (
              <Pressable
                onPress={() => setStatePickerOpen(true)}
                className="flex-row items-center gap-1.5 px-3 h-8 rounded-full bg-blue-50 border border-blue-100 active:bg-blue-100"
              >
                <Ionicons name="add" size={14} color="#1d4ed8" />
                <Text className="text-[12px] font-bold text-blue-700">
                  Add state
                </Text>
              </Pressable>
            )}
          </View>

          {/* Search bar — only when it earns its space */}
          {activeStates.length >= 3 && (
            <View className="flex-row items-center bg-white border border-gray-200 rounded-2xl px-4 h-11 mb-3">
              <Ionicons name="search" size={16} color="#9ca3af" />
              <TextInput
                value={stateSearch}
                onChangeText={setStateSearch}
                placeholder="Search your states..."
                placeholderTextColor="#9ca3af"
                className="flex-1 ml-2 text-[14px] text-gray-900 h-full"
              />
              {stateSearch.length > 0 && (
                <Pressable
                  onPress={() => setStateSearch("")}
                  hitSlop={6}
                  className="p-1"
                >
                  <Ionicons name="close-circle" size={16} color="#cbd5e1" />
                </Pressable>
              )}
            </View>
          )}

          {/* Empty state OR cards */}
          {activeStates.length === 0 ? (
            <View className="bg-white rounded-3xl border border-dashed border-gray-200 px-6 py-10 items-center">
              <View className="w-14 h-14 rounded-2xl bg-blue-50 items-center justify-center mb-3">
                <Ionicons name="cube-outline" size={28} color="#2563eb" />
              </View>
              <Text className="text-[15px] font-extrabold text-gray-900">
                No delivery areas yet
              </Text>
              <Text className="text-[12.5px] text-gray-500 text-center mt-1 mb-4 max-w-xs leading-[18px]">
                Add the states and local governments you deliver to, then set
                how much you charge for each.
              </Text>
              <Pressable
                onPress={() => setStatePickerOpen(true)}
                className="flex-row items-center gap-1.5 px-4 h-11 rounded-2xl bg-blue-600"
                style={{
                  shadowColor: "#2563eb",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <Ionicons name="add" size={16} color="white" />
                <Text className="text-white font-bold text-[13.5px]">
                  Add your first state
                </Text>
              </Pressable>
            </View>
          ) : filteredActiveStates.length === 0 ? (
            <View className="bg-white rounded-2xl border border-gray-100 px-4 py-6 items-center">
              <Text className="text-[13px] text-gray-600 text-center">
                No states match{" "}
                <Text className="font-bold text-gray-900">
                  "{stateSearch}"
                </Text>
                .
              </Text>
              <Pressable
                onPress={() => setStateSearch("")}
                className="mt-2 px-3 py-1.5"
              >
                <Text className="text-[12.5px] font-bold text-blue-700">
                  Clear search
                </Text>
              </Pressable>
            </View>
          ) : (
            filteredActiveStates.map(renderStateCard)
          )}
        </View>
      </ScrollView>

      {/* Sticky save bar */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5 pt-3 pb-7"
        style={{
          shadowColor: "#0f172a",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 12,
        }}
      >
        <View className="flex-row items-center gap-3">
          <View className="flex-1 min-w-0">
            <Text className="text-[11.5px] text-gray-500" numberOfLines={1}>
              {activeStates.length === 0
                ? "Add at least one delivery area to save."
                : `${activeStates.length} state${
                    activeStates.length === 1 ? "" : "s"
                  } · ${totalAreas} area${totalAreas === 1 ? "" : "s"}`}
            </Text>
            {unsetCount > 0 && (
              <Text className="text-[11px] font-semibold text-amber-700 mt-0.5">
                {unsetCount} need{unsetCount === 1 ? "s" : ""} a price
              </Text>
            )}
          </View>
          <Pressable
            onPress={save}
            disabled={loading || activeStates.length === 0}
            className={`px-5 h-12 rounded-2xl items-center justify-center flex-row gap-2 ${
              saveStatus === "saved"
                ? "bg-emerald-600"
                : saveStatus === "error"
                ? "bg-rose-600"
                : loading || activeStates.length === 0
                ? "bg-gray-200"
                : "bg-blue-600"
            }`}
            style={{
              minWidth: 150,
              shadowColor: "#2563eb",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity:
                loading || activeStates.length === 0 ? 0 : 0.25,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            {loading || saveStatus === "saving" ? (
              <>
                <ActivityIndicator size="small" color="white" />
                <Text className="text-white font-bold text-[14px]">
                  Saving…
                </Text>
              </>
            ) : saveStatus === "saved" ? (
              <>
                <Ionicons name="checkmark-circle" size={16} color="white" />
                <Text className="text-white font-bold text-[14px]">
                  Saved
                </Text>
              </>
            ) : saveStatus === "error" ? (
              <Text className="text-white font-bold text-[14px]">
                Try again
              </Text>
            ) : (
              <Text
                className={`font-bold text-[14px] ${
                  activeStates.length === 0
                    ? "text-gray-400"
                    : "text-white"
                }`}
              >
                Save changes
              </Text>
            )}
          </Pressable>
        </View>
      </View>

      {/* State picker (single-select) */}
      <SelectionDrawer
        visible={statePickerOpen}
        onClose={() => setStatePickerOpen(false)}
        title="Add a state"
        searchPlaceholder="Search states..."
        options={availableStateOptions}
        onSelect={(val) => {
          handleAddState(val);
        }}
        emptyMessage="You've already added every state."
      />

      {/* LGA picker (multi-select) */}
      <SelectionDrawer
        visible={!!lgaPickerStateId}
        onClose={() => setLgaPickerStateId(null)}
        title={
          lgaPickerStateId
            ? `Areas in ${getStateName(lgaPickerStateId)}`
            : "Areas"
        }
        searchPlaceholder="Search areas..."
        options={lgaPickerOptions}
        multiSelect
        selectedValues={lgaPickerSelected}
        onApply={(values) =>
          lgaPickerStateId && handleApplyLgas(lgaPickerStateId, values)
        }
        applyLabel="Done"
      />
    </View>
  );
}

// ----- Small helpers -----

function StatTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "amber" | "emerald";
}) {
  const styles =
    tone === "amber"
      ? { container: "bg-amber-50 border-amber-100", label: "text-amber-700", value: "text-amber-800" }
      : tone === "emerald"
      ? {
          container: "bg-emerald-50 border-emerald-100",
          label: "text-emerald-700",
          value: "text-emerald-800",
        }
      : {
          container: "bg-white border-gray-100",
          label: "text-gray-500",
          value: "text-gray-900",
        };

  return (
    <View
      className={`rounded-2xl border px-3 py-2.5 ${styles.container}`}
      style={
        tone === "default"
          ? {
              shadowColor: "#0f172a",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
              elevation: 1,
            }
          : undefined
      }
    >
      <Text
        className={`text-[10px] font-bold uppercase tracking-[1.1px] ${styles.label}`}
      >
        {label}
      </Text>
      <Text className={`text-[18px] font-extrabold mt-0.5 ${styles.value}`}>
        {value}
      </Text>
    </View>
  );
}

function CheckGlyph() {
  return <Ionicons name="checkmark-circle" size={18} color="#047857" />;
}
