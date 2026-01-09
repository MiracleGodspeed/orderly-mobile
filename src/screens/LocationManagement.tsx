import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  TextInput,
  TouchableOpacity,
  Modal
} from "react-native";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface LGA {
  id: string;
  name: string;
  state: string;
}

interface State {
  id: string;
  name: string;
  lgas: LGA[];
}

interface DeliveryCharge {
  locationId: string;
  locationName: string;
  stateName: string;
  price: string;
}

const nigeriaStates: State[] = [
  {
    id: "abia",
    name: "Abia State",
    lgas: [
      { id: "aba-north", name: "Aba North", state: "Abia State" },
      { id: "aba-south", name: "Aba South", state: "Abia State" },
      { id: "arochukwu", name: "Arochukwu", state: "Abia State" },
      { id: "bende", name: "Bende", state: "Abia State" },
      { id: "ikwuano", name: "Ikwuano", state: "Abia State" },
      { id: "isiala-ngwa-north", name: "Isiala Ngwa North", state: "Abia State" },
      { id: "isiala-ngwa-south", name: "Isiala Ngwa South", state: "Abia State" },
    ],
  },
  {
    id: "adamawa",
    name: "Adamawa State",
    lgas: [
      { id: "demsa", name: "Demsa", state: "Adamawa State" },
      { id: "fufore", name: "Fufore", state: "Adamawa State" },
      { id: "ganye", name: "Ganye", state: "Adamawa State" },
    ],
  },
  {
    id: "akwa-ibom",
    name: "Akwa Ibom State",
    lgas: [
      { id: "abak", name: "Abak", state: "Akwa Ibom State" },
      { id: "eastern-obolo", name: "Eastern Obolo", state: "Akwa Ibom State" },
      { id: "eket", name: "Eket", state: "Akwa Ibom State" },
    ],
  },
  {
    id: "anambra",
    name: "Anambra State",
    lgas: [
      { id: "aguata", name: "Aguata", state: "Anambra State" },
      { id: "anambra-east", name: "Anambra East", state: "Anambra State" },
      { id: "anambra-west", name: "Anambra West", state: "Anambra State" },
    ],
  },
  {
    id: "bauchi",
    name: "Bauchi State",
    lgas: [
      { id: "alkaleri", name: "Alkaleri", state: "Bauchi State" },
      { id: "bauchi", name: "Bauchi", state: "Bauchi State" },
      { id: "bogoro", name: "Bogoro", state: "Bauchi State" },
    ],
  },
];

export default function LocationManagement() {
  const navigation = useNavigation<ScreenNavigationProp>();

  const [expandedStates, setExpandedStates] = useState<string[]>([]);
  const [selectedLGAs, setSelectedLGAs] = useState<string[]>([]);
  const [deliveryCharges, setDeliveryCharges] = useState<DeliveryCharge[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [chargeSearchQuery, setChargeSearchQuery] = useState("");
  const [showCustomLocationModal, setShowCustomLocationModal] = useState(false);


  const toggleState = (stateId: string) => {
    if (expandedStates.includes(stateId)) {
      setExpandedStates(expandedStates.filter((id) => id !== stateId));
    } else {
      setExpandedStates([...expandedStates, stateId]);
    }
  };

  const toggleStateSelection = (state: State) => {
    const stateLGAIds = state.lgas.map((lga) => lga.id);
    const allSelected = stateLGAIds.every((id) => selectedLGAs.includes(id));

    if (allSelected) {
      // Deselect all LGAs in this state
      setSelectedLGAs(selectedLGAs.filter((id) => !stateLGAIds.includes(id)));
      setDeliveryCharges(
        deliveryCharges.filter((charge) => !stateLGAIds.includes(charge.locationId))
      );
    } else {
      const newSelectedLGAs = [...selectedLGAs];
      const newDeliveryCharges = [...deliveryCharges];

      state.lgas.forEach((lga) => {
        if (!newSelectedLGAs.includes(lga.id)) {
          newSelectedLGAs.push(lga.id);
          newDeliveryCharges.push({
            locationId: lga.id,
            locationName: lga.name,
            stateName: state.name,
            price: "1500",
          });
        }
      });

      setSelectedLGAs(newSelectedLGAs);
      setDeliveryCharges(newDeliveryCharges);
    }
  };

  const toggleLGA = (lga: LGA, stateName: string) => {
    if (selectedLGAs.includes(lga.id)) {
      setSelectedLGAs(selectedLGAs.filter((id) => id !== lga.id));
      setDeliveryCharges(
        deliveryCharges.filter((charge) => charge.locationId !== lga.id)
      );
    } else {
      setSelectedLGAs([...selectedLGAs, lga.id]);
      setDeliveryCharges([
        ...deliveryCharges,
        {
          locationId: lga.id,
          locationName: lga.name,
          stateName: stateName,
          price: "1500",
        },
      ]);
    }
  };

  const updateDeliveryPrice = (locationId: string, newPrice: string) => {
    setDeliveryCharges(
      deliveryCharges.map((charge) =>
        charge.locationId === locationId
          ? { ...charge, price: newPrice }
          : charge
      )
    );
  };

  const getSelectedLGAsCount = (state: State) => {
    return state.lgas.filter((lga) => selectedLGAs.includes(lga.id)).length;
  };

  const handleSaveConfiguration = () => {
    console.log("Saving delivery charges:", deliveryCharges);
   
  };

  const filteredStates = nigeriaStates.filter((state) =>
    state.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCharges = deliveryCharges.filter(
    (charge) =>
      charge.locationName.toLowerCase().includes(chargeSearchQuery.toLowerCase()) ||
      charge.stateName.toLowerCase().includes(chargeSearchQuery.toLowerCase())
  );

  const selectedAreasCount = selectedLGAs.length;
  const activeStatesCount = new Set(
    deliveryCharges.map((charge) => charge.stateName)
  ).size;

  return (
    <SafeAreaView className="bg-white flex-1" edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />

      <ScrollView className="flex-1">
        {/* Header */}
        <View className="bg-white px-4 py-4 mb-4">
          <View className="flex-row items-center justify-between mb-4">
            <Pressable onPress={() => navigation.goBack()}>
              <MaterialIcons name="arrow-back" size={28} color="#1f2937" />
            </Pressable>
            
            {/* <View className="w-7" /> */}
          </View>
        </View>

        <View className="px-4">
          {/* Location Management Card */}
          <View className="bg-[#194eb8] rounded-2xl p-6 mb-6 shadow-lg">
            <View className="flex-row items-center">
              <View className="w-16 h-16 bg-blue-500/30 rounded-2xl items-center justify-center mr-4">
                <Ionicons name="location-outline" size={32} color="#fff" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-2xl font-bold mb-1">
                  Location Management
                </Text>
                <Text className="text-blue-100 text-sm">
                  Configure your delivery areas and charges
                </Text>
              </View>
            </View>
          </View>

          <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm">
            <View className="flex-row justify-around">
              <View className="flex-1 items-center">
                <View className="w-12 h-12 bg-blue-100 rounded-xl items-center justify-center mb-3">
                  <Ionicons name="location-outline" size={24} color="#2563eb" />
                </View>
                <Text className="text-2xl font-bold text-gray-900 mb-1">
                  {selectedAreasCount}
                </Text>
                <Text className="text-xs text-gray-500 uppercase tracking-wide">
                  Selected Areas
                </Text>
              </View>

              <View className="flex-1 items-center">
                <View className="w-12 h-12 bg-green-100 rounded-xl items-center justify-center mb-3">
                  <Ionicons name="checkmark-circle-outline" size={24} color="#16a34a" />
                </View>
                <Text className="text-2xl font-bold text-gray-900 mb-1">
                  {activeStatesCount}
                </Text>
                <Text className="text-xs text-gray-500 uppercase tracking-wide">
                  Active States
                </Text>
              </View>
            </View>
          </View>

          <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              Select Delivery Areas
            </Text>

            <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 mb-4">
              <Ionicons name="search" size={20} color="#9ca3af" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="flex-1 ml-3 text-base text-gray-900"
                placeholder="Search states or local governments..."
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View>
              {filteredStates.map((state) => {
                const isExpanded = expandedStates.includes(state.id);
                const selectedCount = getSelectedLGAsCount(state);
                const isStateFullySelected =
                  selectedCount === state.lgas.length && selectedCount > 0;

                return (
                  <View key={state.id} className="mb-3">
                    <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
                      <View className="flex-row items-center flex-1">
                        <Pressable
                          onPress={() => toggleState(state.id)}
                          className="mr-3"
                        >
                          <MaterialIcons
                            name={isExpanded ? "keyboard-arrow-down" : "keyboard-arrow-right"}
                            size={24}
                            color="#6b7280"
                          />
                        </Pressable>

                        <Pressable
                          onPress={() => toggleStateSelection(state)}
                          className="mr-3"
                        >
                          <View
                            className={`w-5 h-5 rounded border-2 items-center justify-center ${
                              isStateFullySelected
                                ? "bg-[#2563eb] border-[2563eb]"
                                : "bg-transparent border-[d1d5db]"
                            }`}
                          >
                            {isStateFullySelected && (
                              <MaterialIcons name="check" size={14} color="#fff" />
                            )}
                          </View>
                        </Pressable>

                        <View className="flex-1">
                          <Text className="text-gray-900 font-medium">
                            {state.name}
                          </Text>
                          <Text className="text-gray-500 text-xs">
                            {state.lgas.length} Local Governments
                          </Text>
                        </View>
                      </View>

                      <Text className="text-blue-600 text-sm font-medium">
                        {selectedCount > 0 ? `${selectedCount} selected` : "0 selected"}
                      </Text>
                    </View>

                    {/* LGAs List */}
                    {isExpanded && (
                      <View className="ml-10 mt-2">
                        {state.lgas.map((lga) => {
                          const isSelected = selectedLGAs.includes(lga.id);
                          return (
                            <Pressable
                              key={lga.id}
                              onPress={() => toggleLGA(lga, state.name)}
                              className="flex-row items-center py-2.5"
                            >
                              <View
                                className={`w-5 h-5 rounded border-2 items-center justify-center mr-3 ${
                                  isSelected
                                    ? "bg-blue-600 border-blue-600"
                                    : "border-gray-300"
                                }`}
                              >
                                {isSelected && (
                                  <MaterialIcons name="check" size={14} color="#fff" />
                                )}
                              </View>
                              <Text className="text-gray-700">{lga.name}</Text>
                            </Pressable>
                          );
                        })}

                       <Pressable
                        onPress={() => setShowCustomLocationModal(true)}
                        className="mt-2 mb-2"
                        >
                        <Text className="text-purple-600 text-sm font-medium">
                            + Add custom location
                        </Text>
                        </Pressable>

                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm">
            <Text className="text-lg font-semibold text-gray-900 mb-2">
              Delivery Charges
            </Text>
            <Text className="text-sm text-gray-500 mb-4">
              Set delivery charges for selected areas
            </Text>

            <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 mb-4">
              <TextInput
                value={chargeSearchQuery}
                onChangeText={setChargeSearchQuery}
                className="flex-1 text-base text-gray-900"
                placeholder="Search by location or state"
                placeholderTextColor="#9ca3af"
              />
            </View>

            {filteredCharges.length === 0 ? (
              <View className="items-center py-8">
                <Ionicons name="location-outline" size={48} color="#d1d5db" />
                <Text className="text-gray-500 mt-2">
                  No locations selected yet
                </Text>
                <Text className="text-gray-400 text-sm text-center mt-1">
                  Select delivery areas above to set charges
                </Text>
              </View>
            ) : (
              <View>
                {filteredCharges.map((charge) => (
                  <View
                    key={charge.locationId}
                    className="mb-4 pb-4 border-b border-gray-100"
                  >
                    <Text className="text-gray-900 font-medium mb-1">
                      {charge.locationName}
                    </Text>
                    <Text className="text-gray-500 text-xs mb-3">
                      {charge.stateName}
                    </Text>
                    <View className="flex-row items-center">
                      <Text className="text-gray-600 mr-2">₦</Text>
                      <TextInput
                        value={charge.price}
                        onChangeText={(text) =>
                          updateDeliveryPrice(charge.locationId, text)
                        }
                        keyboardType="numeric"
                        className="flex-1 bg-gray-50 rounded-lg px-4 py-3 text-gray-900"
                        placeholder="Enter amount"
                      />
                    </View>
                  </View>
                ))}
              </View>
            )}

            {deliveryCharges.length > 0 && (
              <Pressable
                onPress={handleSaveConfiguration}
                className="bg-blue-600 rounded-xl py-4 items-center mt-4"
              >
                <Text className="text-white font-bold text-base">
                  Save Configuration
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        <View className="h-6" />
      </ScrollView>
      <Modal
  transparent
  animationType="fade"
  visible={showCustomLocationModal}
  onRequestClose={() => setShowCustomLocationModal(false)}
>
  <View className="flex-1 bg-black/40 items-center justify-center px-5">
    <View className="bg-white w-full rounded-2xl p-5">
      <Text className="text-lg font-semibold text-gray-900 mb-4">
        Add Custom Location
      </Text>

      <TextInput
        placeholder="Location name"
        className="border border-gray-300 rounded-lg px-4 py-3 mb-3"
      />

      <TextInput
        placeholder="Delivery charge"
        keyboardType="numeric"
        className="border border-gray-300 rounded-lg px-4 py-3 mb-4"
      />

      <View className="flex-row justify-end gap-3">
        <Pressable onPress={() => setShowCustomLocationModal(false)}>
          <Text className="text-gray-500">Cancel</Text>
        </Pressable>

        <Pressable className="bg-blue-600 px-4 py-2 rounded-lg">
          <Text className="text-white font-medium">Add</Text>
        </Pressable>
      </View>
    </View>
  </View>
</Modal>

    </SafeAreaView>
  );
}