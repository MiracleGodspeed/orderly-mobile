import {
  View,
  Text,
  Pressable,
  TextInput,
  Platform,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import KeyboardScreen from "../components/KeyboardScreen";
import NIGERIA_STATES from "../utils/nigeriaLocations";

/**
 * Delivery areas. Kept in lock-step with the web `LocationsClient`.
 *
 * The vendor's mental model is two levels deep, no jargon:
 *
 *   State  →  the areas *they* name  →  a fee per area
 *
 * Local governments are no longer offered during setup — vendors
 * didn't recognise LGA names as "the places I deliver to", so they
 * now type their own. Areas picked from the old LGA list still load,
 * still render by their proper name (`resolveAreaName` falls back to
 * the NIGERIA_STATES table), and stay editable and removable. We
 * stopped offering LGAs, not reading them.
 */

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

const ngn = (n: number) => `₦${n.toLocaleString("en-NG")}`;

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeName = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

const digitsOnly = (value: string) => value.replace(/[^\d]/g, "");

export default function LocationManagement() {
  const { storeData, updateVendorSettings, loading } = useVendor();
  const toast = useToast();

  // Core state — shape matches the API payload exactly
  const [selectedLocations, setSelectedLocations] = useState<
    SelectedLocation[]
  >([]);
  const [deliveryCharges, setDeliveryCharges] = useState<DeliveryCharge[]>([]);
  const [customLocations, setCustomLocations] = useState<
    VendorCustomLocations[]
  >([]);

  // UI state
  const [statePickerOpen, setStatePickerOpen] = useState(false);
  const [bulkFeeFor, setBulkFeeFor] = useState<string | null>(null);
  const [bulkFeeValue, setBulkFeeValue] = useState("");
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  // Which state card has its "add an area" form open. A freshly added
  // state opens automatically — that empty card used to be a dead end.
  const [addFormFor, setAddFormFor] = useState<string | null>(null);
  const [addName, setAddName] = useState("");
  const [addFee, setAddFee] = useState("");
  const [stateSearch, setStateSearch] = useState("");
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  // Cards open on arrival only for the first state. A vendor covering
  // ten states was otherwise met with a wall of area rows and had to
  // scroll past all of them to reach the one they came to edit.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const seededExpandedRef = useRef(false);

  // Hydrate from storeData
  useEffect(() => {
    if (!storeData) return;
    const locations =
      (storeData.vendor_locations as VendorLocation[] | null) ?? [];
    setSelectedLocations(locations);
    // Seed once — later storeData refreshes (a save, a focus refetch)
    // must not slam the vendor's open cards shut.
    if (!seededExpandedRef.current) {
      seededExpandedRef.current = true;
      setExpanded(new Set(locations.length > 0 ? [locations[0].stateId] : []));
    }
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

  /** Vendor-typed name first; falls back to the LGA table so areas
   *  set up before we dropped LGAs keep reading properly. */
  const resolveAreaName = (stateId: string, areaId: string) => {
    const own = customLocations.find((c) => c.id === areaId);
    if (own) return own.name;
    const state = NIGERIA_STATES.find((s) => s.id === stateId);
    return state?.localGovernments.find((lg) => lg.id === areaId)?.name || areaId;
  };

  const getCharge = (areaId: string) =>
    deliveryCharges.find((c) => c.localGovernmentId === areaId)?.charge ?? 0;

  const areaIdsOf = (stateId: string) =>
    selectedLocations.find((s) => s.stateId === stateId)?.localGovernmentIds ??
    [];

  const filteredStates = useMemo(() => {
    const term = stateSearch.trim().toLowerCase();
    if (!term) return selectedLocations;
    return selectedLocations.filter((l) =>
      getStateName(l.stateId).toLowerCase().includes(term)
    );
  }, [selectedLocations, stateSearch]);

  // Progressive rendering for vendors with many delivery states. We render
  // the first STATES_PAGE_SIZE cards on mount and reveal more in batches as
  // the user scrolls near the bottom. Cards now arrive collapsed — a header
  // strip each — so a batch is far cheaper than it was when every card
  // eager-mounted its area rows and their TextInputs.
  const STATES_PAGE_SIZE = 6;
  const [visibleStateCount, setVisibleStateCount] = useState(STATES_PAGE_SIZE);
  // Reset the window when the search/list changes — otherwise switching from
  // a 30-state filter to a 5-state filter would leave the count stuck.
  useEffect(() => {
    setVisibleStateCount(STATES_PAGE_SIZE);
  }, [stateSearch]);
  const visibleStates = useMemo(
    () => filteredStates.slice(0, visibleStateCount),
    [filteredStates, visibleStateCount]
  );
  const hasMoreStates = visibleStateCount < filteredStates.length;
  const fetchingMoreRef = useRef(false);
  const handleListScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const distanceFromBottom =
        contentSize.height - (contentOffset.y + layoutMeasurement.height);
      if (
        distanceFromBottom < 400 &&
        hasMoreStates &&
        !fetchingMoreRef.current
      ) {
        fetchingMoreRef.current = true;
        // setTimeout gives RN a frame to commit the current scroll before we
        // mount another batch — keeps the scroll smooth.
        setTimeout(() => {
          setVisibleStateCount((prev) =>
            Math.min(prev + STATES_PAGE_SIZE, filteredStates.length)
          );
          fetchingMoreRef.current = false;
        }, 0);
      }
    },
    [hasMoreStates, filteredStates.length]
  );

  const totalAreas = useMemo(
    () =>
      selectedLocations.reduce(
        (sum, s) => sum + s.localGovernmentIds.length,
        0
      ),
    [selectedLocations]
  );

  const noFeeCount = useMemo(
    () =>
      selectedLocations.reduce(
        (sum, s) =>
          sum + s.localGovernmentIds.filter((id) => getCharge(id) === 0).length,
        0
      ),
    [selectedLocations, deliveryCharges]
  );

  const emptyStateCount = useMemo(
    () =>
      selectedLocations.filter((s) => s.localGovernmentIds.length === 0).length,
    [selectedLocations]
  );

  const availableStateOptions = useMemo(
    () =>
      NIGERIA_STATES.filter(
        (s) => !selectedLocations.some((a) => a.stateId === s.id)
      ).map((s) => ({ value: s.id, label: s.name })),
    [selectedLocations]
  );

  // ===== Mutations =====
  const toggleExpanded = (stateId: string) => {
    haptic();
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(stateId)) next.delete(stateId);
      else next.add(stateId);
      return next;
    });
  };

  const expand = (stateId: string) =>
    setExpanded((prev) => new Set(prev).add(stateId));

  const openAddForm = (stateId: string) => {
    setAddFormFor(stateId);
    setAddName("");
    setAddFee("");
    setBulkFeeFor(null);
    setConfirmRemove(null);
    // Any action that opens a form has to open the card it lives in.
    expand(stateId);
  };

  const handleAddState = (stateId: string) => {
    // Newest first: the state they just picked is the one they're about
    // to fill in, so it shouldn't be buried under the others — and on
    // this screen only the first couple of cards are rendered up front,
    // so appending would leave the new card off-screen entirely.
    setSelectedLocations((prev) =>
      prev.some((l) => l.stateId === stateId)
        ? prev
        : [{ stateId, localGovernmentIds: [] }, ...prev]
    );
    setStateSearch("");
    // Land the vendor straight in the "name your area" field — the
    // whole point of the redesign.
    openAddForm(stateId);
  };

  /** Ids already spoken for anywhere in this state — vendor-typed
   *  areas, legacy LGA picks, and the full LGA table (so a new area
   *  can never collide with a legacy id and silently share its fee). */
  const takenIdsIn = (stateId: string) => {
    const lgaIds =
      NIGERIA_STATES.find((s) => s.id === stateId)?.localGovernments.map(
        (lg) => lg.id
      ) ?? [];
    return new Set<string>([
      ...lgaIds,
      ...customLocations.map((c) => c.id),
      ...deliveryCharges.map((c) => c.localGovernmentId),
      ...areaIdsOf(stateId),
    ]);
  };

  const addArea = (stateId: string) => {
    const name = addName.trim();
    if (!name) {
      toast.show("Type the name of the area first", { type: "warning" });
      return;
    }
    const duplicate = areaIdsOf(stateId).some(
      (id) => normalizeName(resolveAreaName(stateId, id)) === normalizeName(name)
    );
    if (duplicate) {
      toast.show(`${name} is already on your ${getStateName(stateId)} list`, {
        type: "warning",
      });
      return;
    }

    // State-prefixed so the same area name in two states keeps two
    // separate fees — `vendor_delivery_charges` is a flat id → fee map.
    const taken = takenIdsIn(stateId);
    const base = `${stateId}-${slugify(name)}`;
    let id = base;
    let n = 2;
    while (taken.has(id)) id = `${base}-${n++}`;

    const fee = parseInt(addFee || "0", 10) || 0;

    setCustomLocations((prev) => [
      ...prev,
      { id, name, stateId, deliveryCharge: String(fee) },
    ]);
    setSelectedLocations((prev) => {
      if (!prev.some((l) => l.stateId === stateId)) {
        return [...prev, { stateId, localGovernmentIds: [id] }];
      }
      return prev.map((l) =>
        l.stateId === stateId
          ? { ...l, localGovernmentIds: [...l.localGovernmentIds, id] }
          : l
      );
    });
    setDeliveryCharges((prev) => [...prev, { localGovernmentId: id, charge: fee }]);

    haptic();
    // Vendors add areas in runs, so keep the form open and cleared
    // rather than making them re-open it for every single one.
    setAddName("");
    setAddFee("");
  };

  const removeArea = (stateId: string, areaId: string) => {
    setSelectedLocations((prev) =>
      prev.map((l) =>
        l.stateId === stateId
          ? {
              ...l,
              localGovernmentIds: l.localGovernmentIds.filter(
                (id) => id !== areaId
              ),
            }
          : l
      )
    );
    setDeliveryCharges((prev) =>
      prev.filter((c) => c.localGovernmentId !== areaId)
    );
    setCustomLocations((prev) => prev.filter((c) => c.id !== areaId));
  };

  const removeState = (stateId: string) => {
    haptic();
    const ids = new Set(areaIdsOf(stateId));
    setSelectedLocations((prev) => prev.filter((l) => l.stateId !== stateId));
    setDeliveryCharges((prev) =>
      prev.filter((c) => !ids.has(c.localGovernmentId))
    );
    setCustomLocations((prev) => prev.filter((c) => c.stateId !== stateId));
    setConfirmRemove(null);
    if (addFormFor === stateId) setAddFormFor(null);
  };

  const updateCharge = (areaId: string, raw: string) => {
    const parsed = raw === "" ? 0 : parseInt(raw, 10);
    const charge = isNaN(parsed) ? 0 : Math.max(0, parsed);
    setDeliveryCharges((prev) => {
      const existing = prev.find((c) => c.localGovernmentId === areaId);
      if (existing) {
        return prev.map((c) =>
          c.localGovernmentId === areaId ? { ...c, charge } : c
        );
      }
      // Legacy rows sometimes arrive without a charge entry at all —
      // insert instead of silently dropping the vendor's typing.
      return [...prev, { localGovernmentId: areaId, charge }];
    });
  };

  const applyBulkFee = (stateId: string) => {
    const parsed = parseInt(bulkFeeValue || "", 10);
    if (isNaN(parsed) || parsed < 0) return;
    const ids = new Set(areaIdsOf(stateId));
    setDeliveryCharges((prev) => {
      const updated = prev.map((c) =>
        ids.has(c.localGovernmentId) ? { ...c, charge: parsed } : c
      );
      const known = new Set(updated.map((c) => c.localGovernmentId));
      const missing = [...ids]
        .filter((id) => !known.has(id))
        .map((id) => ({ localGovernmentId: id, charge: parsed }));
      return [...updated, ...missing];
    });
    setBulkFeeFor(null);
    setBulkFeeValue("");
    toast.show(`${ngn(parsed)} set for every area in ${getStateName(stateId)}`, {
      type: "success",
    });
  };

  const save = async () => {
    const ready = selectedLocations.filter(
      (s) => s.localGovernmentIds.length > 0
    );
    if (ready.length === 0) {
      toast.show("Add at least one area before saving", { type: "warning" });
      return;
    }
    // States with no areas would be a dead end at checkout — the buyer
    // picks the state, then finds nothing to pick. Drop them; the card
    // already says they aren't live.
    const liveIds = new Set(ready.flatMap((s) => s.localGovernmentIds));
    setSaveStatus("saving");
    try {
      await updateVendorSettings({
        vendor_locations: ready,
        vendor_delivery_charges: deliveryCharges
          .filter((c) => liveIds.has(c.localGovernmentId))
          .map((c) => ({
            localGovernmentId: c.localGovernmentId,
            charge: c.charge,
          })) as VendorDelivery[],
        // Keep each area's own copy of the fee in step with the charges
        // map, otherwise later edits leave it stale.
        vendor_custom_locations: customLocations
          .filter((c) => liveIds.has(c.id))
          .map((c) => ({ ...c, deliveryCharge: String(getCharge(c.id)) })),
      });
      const dropped = selectedLocations.filter(
        (s) => s.localGovernmentIds.length === 0
      );
      setSelectedLocations(ready);
      setSaveStatus("saved");
      if (dropped.length > 0) {
        toast.show(
          `${dropped.map((s) => getStateName(s.stateId)).join(", ")} ${
            dropped.length === 1 ? "wasn't" : "weren't"
          } saved. No areas added yet`,
          { type: "warning" }
        );
      }
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
    const areaIds = loc.localGovernmentIds;
    const fees = areaIds.map(getCharge);
    const priced = fees.filter((f) => f > 0);
    const addFormOpen = addFormFor === loc.stateId;
    const bulkOpen = bulkFeeFor === loc.stateId;
    const confirming = confirmRemove === loc.stateId;
    const isOpen = expanded.has(loc.stateId);
    const unpriced = areaIds.length - priced.length;

    // A collapsed card has to say everything that matters about the
    // state, otherwise collapsing just hides problems.
    const summary = (() => {
      if (areaIds.length === 0) return "No areas yet";
      const count = `${areaIds.length} area${areaIds.length === 1 ? "" : "s"}`;
      if (priced.length === 0) return `${count} · no fees set`;
      const min = Math.min(...priced);
      const max = Math.max(...priced);
      const range = min === max ? ngn(min) : `${ngn(min)} – ${ngn(max)}`;
      return unpriced > 0
        ? `${count} · ${range} · ${unpriced} with no fee`
        : `${count} · ${range}`;
    })();
    const needsAttention = areaIds.length === 0 || unpriced > 0;

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
        {/* Header — the whole strip toggles the card open and shut */}
        <View
          className={`flex-row items-center justify-between pr-2 ${
            isOpen ? "border-b border-gray-100" : ""
          }`}
        >
          <Pressable
            onPress={() => toggleExpanded(loc.stateId)}
            className="flex-row items-center gap-3 flex-1 min-w-0 px-4 py-3.5 active:bg-gray-50"
          >
            <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center">
              <Ionicons name="location" size={18} color="#2563eb" />
            </View>
            <View className="flex-1 min-w-0">
              <Text
                className="font-extrabold text-gray-900 text-[15px]"
                numberOfLines={1}
              >
                {stateName}
              </Text>
              <Text
                className={`text-[11.5px] mt-0.5 ${
                  needsAttention
                    ? "text-amber-700 font-semibold"
                    : "text-gray-500"
                }`}
                numberOfLines={1}
              >
                {summary}
              </Text>
            </View>
            <Ionicons
              name={isOpen ? "chevron-up" : "chevron-down"}
              size={16}
              color="#9ca3af"
            />
          </Pressable>
          <Pressable
            onPress={() => {
              setConfirmRemove(loc.stateId);
              setAddFormFor(null);
              setBulkFeeFor(null);
              expand(loc.stateId);
            }}
            className="w-8 h-8 rounded-full items-center justify-center active:bg-rose-50"
            hitSlop={6}
          >
            <Ionicons name="trash-outline" size={16} color="#9ca3af" />
          </Pressable>
        </View>

        {/* Inline remove confirmation */}
        {isOpen && confirming && (
          <View className="px-4 py-3 bg-rose-50 border-b border-rose-100">
            <Text className="text-[12.5px] font-bold text-rose-900">
              Remove {stateName}?
            </Text>
            <Text className="text-[11.5px] text-rose-700 mt-0.5">
              Its {areaIds.length} area{areaIds.length === 1 ? "" : "s"} and{" "}
              {areaIds.length === 1 ? "its fee" : "their fees"} will be deleted.
            </Text>
            <View className="flex-row items-center gap-2 mt-2.5">
              <Pressable
                onPress={() => removeState(loc.stateId)}
                className="px-3 h-9 rounded-xl bg-rose-600 items-center justify-center"
              >
                <Text className="text-[12.5px] font-bold text-white">
                  Yes, remove
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setConfirmRemove(null)}
                className="px-3 h-9 rounded-xl items-center justify-center"
              >
                <Text className="text-[12.5px] font-semibold text-gray-700">
                  Keep it
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Not-live warning for a state with nothing under it */}
        {isOpen && areaIds.length === 0 && !confirming && (
          <View className="flex-row items-start gap-2 px-4 py-3 bg-amber-50 border-b border-amber-100">
            <Ionicons
              name="alert-circle"
              size={13}
              color="#d97706"
              style={{ marginTop: 1 }}
            />
            <Text className="flex-1 text-[11.5px] text-amber-800 leading-[16px]">
              Customers can't choose {stateName} yet. Add at least one area
              below.
            </Text>
          </View>
        )}

        {/* Area rows */}
        {isOpen &&
          areaIds.map((areaId, idx) => {
          const charge = getCharge(areaId);
          const noFee = charge === 0;
          return (
            <View
              key={areaId}
              className={`flex-row items-center gap-3 px-4 py-3 ${
                idx > 0 ? "border-t border-gray-50" : ""
              }`}
            >
              <View className="flex-1 min-w-0">
                <Text
                  className="text-[14px] font-semibold text-gray-900"
                  numberOfLines={1}
                >
                  {resolveAreaName(loc.stateId, areaId)}
                </Text>
                {noFee && (
                  <Text className="text-[11px] text-amber-700 font-semibold mt-0.5">
                    No fee set, shows as free delivery
                  </Text>
                )}
              </View>

              <View className="flex-row items-center gap-1.5">
                <View
                  className={`flex-row items-center bg-gray-50 border rounded-xl overflow-hidden ${
                    noFee ? "border-amber-200" : "border-gray-200"
                  }`}
                >
                  <Text className="px-2 text-[13px] font-semibold text-gray-500">
                    ₦
                  </Text>
                  <TextInput
                    value={charge === 0 ? "" : String(charge)}
                    onChangeText={(t) => updateCharge(areaId, digitsOnly(t))}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor="#cbd5e1"
                    className="text-[13px] font-semibold text-gray-900 py-2 pr-2"
                    style={{ width: 70 }}
                  />
                </View>
                <Pressable
                  onPress={() => removeArea(loc.stateId, areaId)}
                  className="w-7 h-7 rounded-full items-center justify-center active:bg-gray-100"
                  hitSlop={4}
                >
                  <Ionicons name="close" size={15} color="#9ca3af" />
                </Pressable>
              </View>
            </View>
          );
        })}

        {/* Add-an-area form — the primary action, always one tap away */}
        {!isOpen ? null : addFormOpen ? (
          <View className="px-4 py-3.5 bg-blue-50 border-t border-blue-100">
            <Text className="text-[12px] font-bold text-gray-700 mb-2">
              Add an area in {stateName}
            </Text>
            <View className="gap-2">
              <TextInput
                autoFocus
                value={addName}
                onChangeText={setAddName}
                placeholder="Area name, e.g. Lekki Phase 2"
                placeholderTextColor="#9ca3af"
                returnKeyType="next"
                className="bg-white border border-gray-200 rounded-xl px-3 h-11 text-[13.5px] text-gray-900"
              />
              <View className="flex-row items-center gap-2">
                <View className="flex-1 flex-row items-center bg-white border border-gray-200 rounded-xl overflow-hidden h-11">
                  <Text className="px-3 text-[13px] font-semibold text-gray-500">
                    ₦
                  </Text>
                  <TextInput
                    value={addFee}
                    onChangeText={(t) => setAddFee(digitsOnly(t))}
                    keyboardType="number-pad"
                    placeholder="Delivery fee"
                    placeholderTextColor="#9ca3af"
                    returnKeyType="done"
                    onSubmitEditing={() => addArea(loc.stateId)}
                    className="flex-1 pr-3 text-[13.5px] font-semibold text-gray-900"
                  />
                </View>
                <Pressable
                  onPress={() => addArea(loc.stateId)}
                  className="px-5 h-11 rounded-xl bg-blue-600 items-center justify-center"
                >
                  <Text className="text-[13px] font-bold text-white">Add</Text>
                </Pressable>
              </View>
            </View>
            <View className="flex-row items-center justify-between gap-3 mt-2">
              <Text className="flex-1 text-[11px] text-gray-500 leading-[15px]">
                Leave the fee empty for free delivery. Add as many areas as you
                like.
              </Text>
              <Pressable
                onPress={() => setAddFormFor(null)}
                className="px-2 py-1"
                hitSlop={6}
              >
                <Text className="text-[12px] font-bold text-gray-600">Done</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => {
              haptic();
              openAddForm(loc.stateId);
            }}
            className="flex-row items-center gap-2 px-4 py-3 border-t border-gray-100 active:bg-blue-50"
          >
            <View className="w-6 h-6 rounded-full bg-blue-50 items-center justify-center">
              <Ionicons name="add" size={14} color="#1d4ed8" />
            </View>
            <Text className="text-[13px] font-bold text-blue-700">
              Add an area in {stateName}
            </Text>
          </Pressable>
        )}

        {/* One fee for every area */}
        {isOpen && bulkOpen && (
          <View className="px-4 py-3 bg-amber-50 border-t border-amber-100">
            <Text className="text-[12px] font-semibold text-gray-700 mb-2">
              Charge the same fee for all {areaIds.length} areas in {stateName}
            </Text>
            <View className="flex-row items-center gap-2">
              <View className="flex-1 flex-row items-center bg-white border border-gray-200 rounded-xl overflow-hidden max-w-[160px] h-10">
                <Text className="px-3 text-[13px] font-semibold text-gray-500">
                  ₦
                </Text>
                <TextInput
                  autoFocus
                  value={bulkFeeValue}
                  onChangeText={(t) => setBulkFeeValue(digitsOnly(t))}
                  keyboardType="number-pad"
                  placeholder="e.g. 1500"
                  placeholderTextColor="#9ca3af"
                  returnKeyType="done"
                  onSubmitEditing={() => applyBulkFee(loc.stateId)}
                  className="flex-1 pr-3 text-[13px] font-semibold text-gray-900"
                />
              </View>
              <Pressable
                onPress={() => applyBulkFee(loc.stateId)}
                disabled={!bulkFeeValue}
                className={`px-3 h-10 rounded-xl items-center justify-center ${
                  !bulkFeeValue ? "bg-gray-200" : "bg-blue-600"
                }`}
              >
                <Text
                  className={`text-[12.5px] font-bold ${
                    !bulkFeeValue ? "text-gray-400" : "text-white"
                  }`}
                >
                  Apply to all
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setBulkFeeFor(null);
                  setBulkFeeValue("");
                }}
                className="px-2 h-10 items-center justify-center"
              >
                <Text className="text-[12.5px] font-semibold text-gray-700">
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {isOpen && areaIds.length > 1 && !bulkOpen && (
          <View className="flex-row items-center gap-2 px-4 py-2.5 bg-gray-50 border-t border-gray-100">
            <Pressable
              onPress={() => {
                haptic();
                setBulkFeeFor(loc.stateId);
                setBulkFeeValue("");
                setAddFormFor(null);
                setConfirmRemove(null);
              }}
              className="flex-row items-center gap-1.5 px-3 h-8 rounded-full bg-white border border-gray-200"
            >
              <Ionicons name="cash-outline" size={13} color="#374151" />
              <Text className="text-[11.5px] font-bold text-gray-700">
                Same fee for all areas
              </Text>
            </Pressable>
            {priced.length === areaIds.length && (
              <View className="flex-row items-center gap-1">
                <Ionicons name="checkmark-circle" size={13} color="#047857" />
                <Text className="text-[11.5px] font-semibold text-emerald-700">
                  Every area priced
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <ScreenHeader title="Delivery Areas" />

      <KeyboardScreen
        className="flex-1"
        // Generous cushion above the keyboard top — the fee/area inputs
        // are nested deep in stacked state cards, often near the bottom
        // of a long list. Default 24px puts the focused input right at
        // the keyboard edge, which reads as "covered" even when it
        // technically isn't. 120 keeps it clearly in view.
        extraScrollHeight={120}
        // Reserve room at the bottom of the scroll content for the
        // sticky save bar (~110px) plus a comfort margin so the last
        // card isn't sitting under the bar after auto-scroll.
        bottomPadding={140}
        onScroll={handleListScroll}
        scrollEventThrottle={400}
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
              <Text className="text-white/75 text-[12.5px] mt-0.5 leading-[17px]">
                Add the places you deliver to and what you charge. Customers
                pick from this list when they check out.
              </Text>
            </View>
          </View>
        </View>

        <View className="px-5">
          {/* Stats strip */}
          {selectedLocations.length > 0 && (
            <View className="flex-row gap-2 mb-4">
              <View className="flex-1">
                <StatTile
                  label="States"
                  value={String(selectedLocations.length)}
                />
              </View>
              <View className="flex-1">
                <StatTile label="Areas" value={String(totalAreas)} />
              </View>
              <View className="flex-1">
                <StatTile
                  label={noFeeCount > 0 ? "No fee yet" : "All priced"}
                  value={noFeeCount > 0 ? String(noFeeCount) : <CheckGlyph />}
                  tone={noFeeCount > 0 ? "amber" : "emerald"}
                />
              </View>
            </View>
          )}

          {/* Section heading */}
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-[14px] font-extrabold text-gray-900">
              {selectedLocations.length === 0
                ? "Get started"
                : "Your delivery areas"}
            </Text>
            {selectedLocations.length > 0 && (
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
          {selectedLocations.length >= 3 && (
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
          {selectedLocations.length === 0 ? (
            <EmptyState onAdd={() => setStatePickerOpen(true)} />
          ) : filteredStates.length === 0 ? (
            <View className="bg-white rounded-2xl border border-gray-100 px-4 py-6 items-center">
              <Text className="text-[13px] text-gray-600 text-center">
                No states match{" "}
                <Text className="font-bold text-gray-900">"{stateSearch}"</Text>
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
            <>
              {visibleStates.map(renderStateCard)}
              {hasMoreStates && (
                <View className="items-center py-4">
                  <ActivityIndicator size="small" color="#2563eb" />
                  <Text className="text-[12px] text-gray-500 mt-2 font-semibold">
                    Loading more states…
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </KeyboardScreen>

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
              {totalAreas === 0
                ? "Add at least one area to save."
                : `${selectedLocations.length} state${
                    selectedLocations.length === 1 ? "" : "s"
                  } · ${totalAreas} area${totalAreas === 1 ? "" : "s"}`}
            </Text>
            {emptyStateCount > 0 && (
              <Text className="text-[11px] font-semibold text-amber-700 mt-0.5">
                {emptyStateCount} state
                {emptyStateCount === 1 ? " has" : "s have"} no areas yet
              </Text>
            )}
          </View>
          <Pressable
            onPress={save}
            disabled={loading || totalAreas === 0}
            className={`px-5 h-12 rounded-2xl items-center justify-center flex-row gap-2 ${
              saveStatus === "saved"
                ? "bg-emerald-600"
                : saveStatus === "error"
                ? "bg-rose-600"
                : loading || totalAreas === 0
                ? "bg-gray-200"
                : "bg-blue-600"
            }`}
            style={{
              minWidth: 150,
              shadowColor: "#2563eb",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: loading || totalAreas === 0 ? 0 : 0.25,
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
                <Text className="text-white font-bold text-[14px]">Saved</Text>
              </>
            ) : saveStatus === "error" ? (
              <Text className="text-white font-bold text-[14px]">
                Try again
              </Text>
            ) : (
              <Text
                className={`font-bold text-[14px] ${
                  totalAreas === 0 ? "text-gray-400" : "text-white"
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
        title="Which state do you deliver to?"
        searchPlaceholder="Search states..."
        options={availableStateOptions}
        onSelect={(val) => {
          setStatePickerOpen(false);
          handleAddState(val);
        }}
        emptyMessage="You've already added every state."
      />
    </View>
  );
}

// ----- Small helpers -----

function EmptyState({ onAdd }: { onAdd: () => void }) {
  const steps = [
    "Pick a state you deliver to",
    "Add the areas inside it, in your own words",
    "Set what you charge for each one",
  ];
  return (
    <View className="bg-white rounded-3xl border border-dashed border-gray-200 px-6 py-8 items-center">
      <View className="w-14 h-14 rounded-2xl bg-blue-50 items-center justify-center mb-3">
        <Ionicons name="location-outline" size={28} color="#2563eb" />
      </View>
      <Text className="text-[15px] font-extrabold text-gray-900">
        No delivery areas yet
      </Text>
      <Text className="text-[12.5px] text-gray-500 text-center mt-1">
        It takes three steps.
      </Text>
      <View className="w-full mt-4 mb-5 gap-2.5">
        {steps.map((step, i) => (
          <View key={step} className="flex-row items-start gap-2.5">
            <View className="w-5 h-5 rounded-full bg-blue-600 items-center justify-center mt-[1px]">
              <Text className="text-[11px] font-extrabold text-white">
                {i + 1}
              </Text>
            </View>
            <Text className="flex-1 text-[13px] text-gray-700 leading-[18px]">
              {step}
            </Text>
          </View>
        ))}
      </View>
      <Pressable
        onPress={onAdd}
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
          Pick your first state
        </Text>
      </Pressable>
    </View>
  );
}

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
      ? {
          container: "bg-amber-50 border-amber-100",
          label: "text-amber-700",
          value: "text-amber-800",
        }
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
