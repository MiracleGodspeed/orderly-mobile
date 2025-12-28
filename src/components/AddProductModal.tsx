import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Image,
  Platform,
  Switch
} from "react-native";
import { useState, useEffect } from "react";
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
  visible: boolean;
  onClose: () => void;
  mode?: 'add' | 'edit';
  productData?: any;
}

interface Variant {
  id: string;
  size: string;
  color: string;
  stock: string;
}

export default function AddProductModal({ visible, onClose, mode = 'add', productData }: Props) {
  const [productImage, setProductImage] = useState<string | null>(null);
  const [productName, setProductName] = useState('');
  const [price, setPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [productDescription, setProductDescription] = useState('');
  const [enableDiscount, setEnableDiscount] = useState(false);
  const [discountPercentage, setDiscountPercentage] = useState('');
  const [productStatus, setProductStatus] = useState<'Active' | 'Draft'>('Active');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      if (Platform.OS !== "web") {
        const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          const request = await ImagePicker.requestMediaLibraryPermissionsAsync();
          setHasPermission(request.status === "granted");
        } else {
          setHasPermission(true);
        }
      }
    })();
  }, []);

  const pickImage = async () => {
    if (hasPermission === false) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets.length > 0) {
      setProductImage(result.assets[0].uri);
    }
  };

  const addVariant = () => {
    const newVariant: Variant = {
      id: Date.now().toString(),
      size: '',
      color: '',
      stock: ''
    };
    setVariants([...variants, newVariant]);
  };

  const removeVariant = (id: string) => {
    setVariants(variants.filter(v => v.id !== id));
  };

  const updateVariant = (id: string, field: keyof Variant, value: string) => {
    setVariants(variants.map(v => 
      v.id === id ? { ...v, [field]: value } : v
    ));
  };

  const handleSave = () => {
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1">
          <View className="px-4 py-4 border-b border-gray-200">
            <View className="w-12 h-1 bg-gray-300 rounded-full self-center mb-4" />
            <Text className="text-xl font-semibold text-gray-900">
              {mode === 'edit' ? 'Edit Product' : 'Add Product'}
            </Text>
          </View>

          <ScrollView className="flex-1 px-4 pt-6">
            <Text className="text-sm text-gray-900 mb-2">Product Image</Text>
            <View className="flex-row items-center mb-6">
              <View className="w-20 h-20 bg-gray-100 rounded-lg items-center justify-center mr-4">
                {productImage ? (
                  <Image 
                    source={{ uri: productImage }} 
                    className="w-full h-full rounded-lg"
                    resizeMode="cover"
                  />
                ) : (
                  <MaterialIcons name="image" size={32} color="#9ca3af" />
                )}
              </View>
              <Pressable 
                onPress={pickImage}
                className="flex-row items-center border border-gray-300 rounded-lg px-4 py-2"
              >
                <MaterialIcons name="upload" size={18} color="#374151" />
                <Text className="text-gray-900 ml-2">Upload Image</Text>
              </Pressable>
            </View>

            <Text className="text-sm text-gray-900 mb-2">
              Product Name <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              value={productName}
              onChangeText={setProductName}
              className="border border-gray-300 rounded-lg px-4 py-3 mb-4"
              placeholder="Enter product name"
              placeholderTextColor="#9ca3af"
            />

            <View className="flex-row mb-4">
              <View className="flex-1 mr-2">
                <Text className="text-sm text-gray-900 mb-2">
                  Price <Text className="text-red-500">*</Text>
                </Text>
                <View className="flex-row items-center border border-gray-300 rounded-lg px-4 py-3">
                  <Text className="text-gray-900 mr-2">₦</Text>
                  <TextInput
                    value={price}
                    onChangeText={setPrice}
                    className="flex-1"
                    placeholder="0.00"
                    placeholderTextColor="#9ca3af"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View className="flex-1 ml-2">
                <Text className="text-sm text-gray-900 mb-2">
                  Stock Quantity <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  value={stockQuantity}
                  onChangeText={setStockQuantity}
                  className="border border-gray-300 rounded-lg px-4 py-3"
                  placeholder="0"
                  placeholderTextColor="#9ca3af"
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View className="flex-row items-center justify-between py-4 mb-4">
              <View className="flex-1">
                <Text className="text-sm text-gray-900 font-medium mb-1">Product Variants</Text>
                <Text className="text-xs text-gray-500">
                  Does this product come in different sizes or colors?
                </Text>
              </View>
              <Switch
                value={hasVariants}
                onValueChange={setHasVariants}
                trackColor={{ false: "#d1d5db", true: "#10b981" }}
                thumbColor="#fff"
              />
            </View>

            {hasVariants && (
              <View className="mb-6">
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-sm text-gray-900 font-medium">Variants</Text>
                  <Pressable 
                    onPress={addVariant}
                    className="bg-green-600 rounded-lg px-4 py-2 flex-row items-center"
                  >
                    <MaterialIcons name="add" size={16} color="#fff" />
                    <Text className="text-white text-sm font-medium ml-1">Add Variant</Text>
                  </Pressable>
                </View>

                {variants.map((variant, index) => (
                  <View key={variant.id} className="bg-gray-50 rounded-lg p-4 mb-4">
                    <View className="flex-row items-center justify-between mb-3">
                      <Text className="text-sm text-gray-900 font-medium">Variant {index + 1}</Text>
                      <Pressable onPress={() => removeVariant(variant.id)}>
                        <Text className="text-red-600 text-sm font-medium">Remove</Text>
                      </Pressable>
                    </View>

                    <View className="flex-row mb-3">
                      <View className="flex-1 mr-2">
                        <Text className="text-xs text-gray-700 mb-2">Size</Text>
                        <TextInput
                          value={variant.size}
                          onChangeText={(value) => updateVariant(variant.id, 'size', value)}
                          className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
                          placeholder="S, M, L..."
                          placeholderTextColor="#9ca3af"
                        />
                      </View>

                      <View className="flex-1 ml-2">
                        <Text className="text-xs text-gray-700 mb-2">Color</Text>
                        <View className="flex-row items-center border border-gray-300 rounded-lg px-3 py-2 bg-white">
                          <View className="w-6 h-6 bg-red-500 rounded mr-2">
                            <MaterialIcons name="colorize" size={16} color="#fff" />
                          </View>
                          <TextInput
                            value={variant.color}
                            onChangeText={(value) => updateVariant(variant.id, 'color', value)}
                            className="flex-1"
                            placeholder="#f70202"
                            placeholderTextColor="#9ca3af"
                          />
                        </View>
                      </View>
                    </View>

                    <View>
                      <Text className="text-xs text-gray-700 mb-2">Stock</Text>
                      <TextInput
                        value={variant.stock}
                        onChangeText={(value) => updateVariant(variant.id, 'stock', value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
                        placeholder="0"
                        placeholderTextColor="#9ca3af"
                        keyboardType="number-pad"
                      />
                    </View>
                  </View>
                ))}
              </View>
            )}

            <Text className="text-sm text-gray-900 mb-2">
              Product Description <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              value={productDescription}
              onChangeText={setProductDescription}
              className="border border-gray-300 rounded-lg px-4 py-3 mb-4"
              placeholder="Enter brief description for this item"
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View className="flex-row items-center justify-between py-4 mb-4">
              <View className="flex-1">
                <Text className="text-sm text-gray-900 font-medium mb-1">Enable Discount</Text>
                <Text className="text-xs text-gray-500">Apply a percentage discount</Text>
              </View>
              <Switch
                value={enableDiscount}
                onValueChange={setEnableDiscount}
                trackColor={{ false: "#d1d5db", true: "#10b981" }}
                thumbColor="#fff"
              />
            </View>

            {enableDiscount && (
              <View className="mb-6">
                <Text className="text-sm text-gray-900 mb-2">
                  Discount Percentage <Text className="text-red-500">*</Text>
                </Text>
                <View className="flex-row items-center border border-gray-300 rounded-lg px-4 py-3">
                  <TextInput
                    value={discountPercentage}
                    onChangeText={setDiscountPercentage}
                    className="flex-1"
                    placeholder="10"
                    placeholderTextColor="#9ca3af"
                    keyboardType="number-pad"
                  />
                  <Text className="text-gray-500 ml-2">%</Text>
                </View>
              </View>
            )}

            <Text className="text-sm text-gray-900 mb-3">Product Status</Text>
            <View className="flex-row mb-8">
              <Pressable
                onPress={() => setProductStatus('Active')}
                className={`flex-1 py-3 rounded-full mr-2 border-2 ${
                  productStatus === 'Active' 
                    ? 'bg-green-50 border-green-600' 
                    : 'bg-white border-gray-300'
                }`}
              >
                <Text className={`text-center font-medium ${
                  productStatus === 'Active' ? 'text-green-600' : 'text-gray-700'
                }`}>
                  Active
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setProductStatus('Draft')}
                className={`flex-1 py-3 rounded-full ml-2 border-2 ${
                  productStatus === 'Draft' 
                    ? 'bg-gray-50 border-gray-600' 
                    : 'bg-white border-gray-300'
                }`}
              >
                <Text className={`text-center font-medium ${
                  productStatus === 'Draft' ? 'text-gray-900' : 'text-gray-700'
                }`}>
                  Draft
                </Text>
              </Pressable>
            </View>
          </ScrollView>

          <View className="flex-row items-center px-4 py-4 border-t border-gray-200 mb-5">
            <Pressable 
              onPress={onClose}
              className="flex-1 py-4 items-center justify-center rounded-xl border border-gray-300 mr-3"
            >
              <Text className="text-gray-900 font-medium text-base">Cancel</Text>
            </Pressable>

            <Pressable 
              onPress={handleSave}
              className="flex-1 py-4 items-center justify-center rounded-xl bg-blue-600"
            >
              <Text className="text-white font-medium text-base">
                {mode === 'edit' ? 'Update Product' : 'Add Product'}
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}