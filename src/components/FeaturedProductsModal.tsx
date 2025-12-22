import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
} from "react-native";
import { useState } from "react";
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AntDesign from '@expo/vector-icons/AntDesign';


interface Props {
  visible: boolean;
  onClose: () => void;
}

interface SelectedProduct {
  id: string;
  name: string;
  price: string;
}

export default function FeaturedProductsModal({ visible, onClose }: Props) {
  const [heading, setHeading] = useState("");
  const [subheading, setSubheading] = useState(
    ""
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([
    { id: "1", name: "Classic T-Shirt", price: "$29.00" },
    { id: "2", name: "Denim Jacket", price: "$89.00" },
  ]);

  const removeProduct = (id: string) => {
    setSelectedProducts(selectedProducts.filter((p) => p.id !== id));
  };

  const handleSave = () => {
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
    >
      <View className="flex-1 bg-black/40 justify-end">
        <View className="bg-white rounded-t-2xl h-[85%]">
         
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200">
                      
          
                                  <Text className="text-base font-semibold">Featured Section</Text>

          
                      <Pressable>
                       <AntDesign name="close" size={24} color="black" onPress={onClose}/>
                      </Pressable>
                    </View>

          <ScrollView className="flex-1 px-4 pt-6">
            <Text className="text-sm text-gray-700 mb-2">Heading</Text>
            <TextInput
              value={heading}
              onChangeText={setHeading}
              className="border border-gray-300 rounded-lg px-3 py-3 mb-4 text-base"
              placeholder="Enter heading"
            />

            <Text className="text-sm text-gray-700 mb-2">Subheading</Text>
            <TextInput
              value={subheading}
              onChangeText={setSubheading}
              className="border border-gray-300 rounded-lg px-3 py-3 mb-6 text-base"
              placeholder="Enter subheading"
              multiline
            />

            <Text className="text-sm text-gray-700 mb-2">Products</Text>
            
            <View className="flex-row items-center border border-gray-300 rounded-lg px-3 py-3 mb-4">
              <MaterialIcons name="search" size={20} color="#9ca3af" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="flex-1 ml-2 text-base"
                placeholder="Search products"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <Text className="text-xs text-gray-500 font-medium mb-3 uppercase tracking-wide">
              SELECTED PRODUCTS
            </Text>

            {selectedProducts.map((product) => (
              <View
                key={product.id}
                className="flex-row items-center bg-gray-50 rounded-lg p-3 mb-3"
              >
                <View className="w-12 h-12 bg-gray-200 rounded mr-3" />

                <View className="flex-1">
                  <Text className="text-base text-gray-900 font-medium">
                    {product.name}
                  </Text>
                  <Text className="text-sm text-gray-500">{product.price}</Text>
                </View>

                <Pressable
                  onPress={() => removeProduct(product.id)}
                  className="p-1"
                >
                  <MaterialIcons name="close" size={20} color="#9ca3af" />
                </Pressable>
              </View>
            ))}

            <Pressable className="border border-blue-500 rounded-lg py-4 items-center mt-2 mb-6">
              <View className="flex-row items-center">
                <Text className="text-blue-600  text-[25px] mr-5 mb-1">
                  +
                </Text>
                <Text className="text-blue-600 font-medium text-base">
                  Browse Products
                </Text>
              </View>
            </Pressable>
            <View className="flex-row items-center px-4 py-4 border-t border-gray-200 mb-10 mt-5">
                        <Pressable 
                          onPress={handleCancel}
                          className="flex-1 py-3 items-center justify-center rounded-lg border border-gray-300 mr-3"
                        >
                          <Text className="text-gray-900 font-medium text-base">Cancel</Text>
                        </Pressable>
            
                        <Pressable 
                          onPress={handleSave}
                          className="flex-1 py-3 items-center justify-center rounded-lg bg-blue-600"
                        >
                          <Text className="text-white font-medium text-base">Save Changes</Text>
                        </Pressable>
                      </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}