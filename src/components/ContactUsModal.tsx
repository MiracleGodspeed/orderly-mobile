import { View, Text, Pressable, TextInput } from "react-native";
import KeyboardScreen from "./KeyboardScreen";
import { useState, useEffect } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useVendor, WorkingHours } from "../../context/VendorContext";
import { BottomSheet, BottomSheetFooter } from "./BottomSheet";
import BusinessHoursModal from "./BusinessHoursModal";

interface Props {
  visible: boolean;
  onClose: () => void;
  initialContact?: string;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-[1.2px] mb-2">
      {children}
    </Text>
  );
}

export default function ContactUsSectionModal({ visible, onClose }: Props) {
  const { updateVendorSettings, storeData, loading } = useVendor();

  const [contactNumber, setContactNumber] = useState("");
  const [email, setEmail] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [workingHours, setWorkingHours] = useState<WorkingHours[] | null>(null);

  const [showHoursModal, setShowHoursModal] = useState(false);

  useEffect(() => {
    if (visible && storeData) {
      setContactNumber(storeData.phone || "");
      setEmail(storeData.email || "");
      setBusinessAddress(storeData.address || "");
      setWorkingHours(storeData.workingDaysHours || null);
    }
  }, [visible, storeData]);

  const handleSave = async () => {
    if (!storeData) return;
    try {
      await updateVendorSettings({
        phone: contactNumber,
        address: businessAddress,
        workingDaysHours: workingHours,
      });
      onClose();
    } catch (e) {
      console.error("Failed to save contact section:", e);
    }
  };

  const handleWorkingHoursSave = (updatedHours: WorkingHours[]) => {
    setWorkingHours(updatedHours);
  };

  const hoursConfigured = !!workingHours && workingHours.length > 0;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Contact Information"
      subtitle="How customers reach you and when you're open"
      height="88%"
    >
      <KeyboardScreen
        contentContainerStyle={{ paddingHorizontal: 20 }}
        bottomPadding={24}
      >
        <View className="mt-4">
          <FieldLabel>WhatsApp Number</FieldLabel>
          <View className="flex-row items-center bg-white border border-gray-200 rounded-2xl px-4 h-12 mb-5">
            <Ionicons name="logo-whatsapp" size={18} color="#16a34a" />
            <TextInput
              value={contactNumber}
              onChangeText={setContactNumber}
              className="flex-1 ml-3 text-[15px] text-gray-900 h-full"
              placeholder="08123456789"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
            />
          </View>

          <FieldLabel>Email Address</FieldLabel>
          <View className="flex-row items-center bg-gray-50 border border-gray-100 rounded-2xl px-4 h-12 mb-1">
            <Ionicons name="mail-outline" size={18} color="#6b7280" />
            <Text className="flex-1 ml-3 text-[15px] text-gray-500" numberOfLines={1}>
              {email || "—"}
            </Text>
            <Ionicons name="lock-closed-outline" size={14} color="#9ca3af" />
          </View>
          <Text className="text-[11px] text-gray-400 mb-5 ml-1">
            Your account email — change it from Personal Details.
          </Text>

          <FieldLabel>Business Address</FieldLabel>
          <View className="bg-white border border-gray-200 rounded-2xl px-4 py-3 mb-5">
            <View className="flex-row items-start">
              <Ionicons
                name="location-outline"
                size={18}
                color="#6b7280"
                style={{ marginTop: 2 }}
              />
              <TextInput
                value={businessAddress}
                onChangeText={setBusinessAddress}
                className="flex-1 ml-3 text-[15px] text-gray-900"
                style={{ minHeight: 60, textAlignVertical: "top" }}
                placeholder="Street, area, city, state"
                placeholderTextColor="#9ca3af"
                multiline
              />
            </View>
          </View>

          {/* Business Hours card */}
          <Pressable
            onPress={() => setShowHoursModal(true)}
            className="bg-white border border-gray-100 rounded-2xl px-4 py-4 flex-row items-center"
            style={{
              shadowColor: "#0f172a",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
              elevation: 1,
            }}
          >
            <View className="w-11 h-11 rounded-xl bg-amber-50 items-center justify-center mr-3">
              <Ionicons name="time-outline" size={20} color="#d97706" />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-2 mb-0.5">
                <Text className="text-[14px] font-bold text-gray-900">
                  Business Hours
                </Text>
                {hoursConfigured ? (
                  <View className="flex-row items-center gap-1 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full">
                    <View className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <Text className="text-[10px] font-bold text-emerald-700">
                      SET
                    </Text>
                  </View>
                ) : (
                  <View className="flex-row items-center gap-1 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded-full">
                    <View className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                    <Text className="text-[10px] font-bold text-gray-500">
                      EMPTY
                    </Text>
                  </View>
                )}
              </View>
              <Text className="text-[12px] text-gray-500">
                Set opening and closing times for each day
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </Pressable>
        </View>
      </KeyboardScreen>

      <BottomSheetFooter
        onCancel={onClose}
        onSave={handleSave}
        loading={loading}
      />

      <BusinessHoursModal
        visible={showHoursModal}
        onClose={() => setShowHoursModal(false)}
        initialHours={workingHours}
        onSave={handleWorkingHoursSave}
      />
    </BottomSheet>
  );
}
