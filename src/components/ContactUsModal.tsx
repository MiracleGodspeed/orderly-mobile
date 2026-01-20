import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AntDesign from '@expo/vector-icons/AntDesign';
import { useVendor, WorkingHours } from "../../context/VendorContext";
import BusinessHoursModal from "./BusinessHoursModal";

interface Props {
  visible: boolean;
  onClose: () => void;
  initialContact?: string; // Kept for interface compatibility but largely unused now as we pull from storeData
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
        workingDaysHours: workingHours
      });
      onClose();
    } catch (e) {
      console.error("Failed to save contact section:", e);
    }
  };

  const handleWorkingHoursSave = (updatedHours: WorkingHours[]) => {
    setWorkingHours(updatedHours);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
    >
      <View className="flex-1 bg-black/40 justify-end">
        <View className="bg-white rounded-t-3xl h-[85%]">

          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200">
            <Text className="text-base font-semibold">Contact Information</Text>
            <Pressable onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#000" />
            </Pressable>
          </View>

          <ScrollView className="flex-1 px-4 pt-6">

            {/* Contact Number */}
            <Text className="text-sm text-gray-700 mb-2">WhatsApp Number</Text>
            <TextInput
              value={contactNumber}
              onChangeText={setContactNumber}
              className="border border-gray-300 rounded-lg px-3 py-3 mb-4 text-base bg-white"
              placeholder="08123456789"
              keyboardType="phone-pad"
            />

            {/* Email Address - Read Only */}
            <Text className="text-sm text-gray-700 mb-2">Email Address</Text>
            <View className="border border-gray-200 bg-gray-100 rounded-lg px-3 py-3 mb-4">
              <Text className="text-base text-gray-500">{email}</Text>
            </View>

            {/* Business Address */}
            <Text className="text-sm text-gray-700 mb-2">Business Address</Text>
            <TextInput
              value={businessAddress}
              onChangeText={setBusinessAddress}
              className="border border-gray-300 rounded-lg px-3 py-3 mb-6 text-base bg-white min-h-[80px]"
              placeholder="Enter business address"
              multiline
              textAlignVertical="top"
            />

            {/* Business Hours Section */}
            <View className="mt-2">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-2">
                  <AntDesign name="clockcircleo" size={18} color="#FF6B6B" />
                  <Text className="text-base font-medium text-gray-900">Business Hours</Text>
                </View>
                <Pressable
                  onPress={() => setShowHoursModal(true)}
                  className="border border-red-100 bg-red-50 px-3 py-1.5 rounded-lg flex-row items-center"
                >
                  <MaterialIcons name="edit" size={14} color="#FF6B6B" style={{ marginRight: 4 }} />
                  <Text className="text-[#FF6B6B] text-xs font-medium">Manage Hours</Text>
                </Pressable>
              </View>
              <Text className="text-gray-400 text-xs mt-1">
                Set your store's opening and closing hours.
              </Text>
            </View>

          </ScrollView>

          <View className="flex-row items-center px-4 py-4 border-t border-gray-200 mb-6 bg-white">
            <Pressable
              onPress={onClose}
              className="flex-1 py-4 items-center justify-center rounded-full border border-gray-300 mr-3"
            >
              <Text className="text-gray-900 font-medium text-base">Cancel</Text>
            </Pressable>

            <Pressable
              onPress={handleSave}
              disabled={loading}
              className={`flex-1 py-4 items-center justify-center rounded-full ${loading ? 'bg-blue-300' : 'bg-blue-600'}`}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-medium text-base">Save Changes</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>

      <BusinessHoursModal
        visible={showHoursModal}
        onClose={() => setShowHoursModal(false)}
        initialHours={workingHours}
        onSave={handleWorkingHoursSave}
      />
    </Modal>
  );
}