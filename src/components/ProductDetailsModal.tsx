import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Product } from '../../src/api/vendor/vendor.types';
import { AppImage } from './AppImage';

interface Props {
  visible: boolean;
  onClose: () => void;
  product: Product | null;
  onEdit: () => void;
  onDelete: () => Promise<void>; 
}

export default function ProductDetailsModal({ 
  visible, 
  onClose, 
  product, 
  onEdit, 
  onDelete 
}: Props) {
  
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  
  if (!product) return null;

  
  const handleDeleteClick = () => {
    setShowDeleteConfirmation(true);
  };

 
  const handleConfirmDelete = async () => {
    try {
      setDeleteLoading(true);
      await onDelete(); 
      setShowDeleteConfirmation(false);
     
    } catch (error) {
    
      setDeleteLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView className="flex-1 bg-white">
       
        <View className="px-4 py-4 border-b border-gray-200 flex-row items-center justify-between">
          <Text className="text-xl font-semibold text-gray-900">Product Details</Text>
          <Pressable onPress={onClose}>
            <MaterialIcons name="close" size={24} color="#000" />
          </Pressable>
        </View>

        <ScrollView className="flex-1">
       
          <View className="relative">
            {product.image ? (
              <AppImage
                uri={product.image}
                style={{ width: "100%", height: 320 }}
              />
            ) : (
              <View className="w-full h-80 bg-gray-100 justify-center items-center">
                <MaterialIcons name="image" size={64} color="#9ca3af" />
              </View>
            )}
            {product.badge && (
              <View className="absolute top-4 left-4 bg-red-500 px-3 py-1 rounded-full">
                <Text className="text-white text-sm font-medium">{product.badge}</Text>
              </View>
            )}
          </View>

          <View className="px-4 py-6">
            
            <Text className="text-2xl font-bold text-gray-900 mb-2">
              {product.title}
            </Text>

            {/* <View className="flex-row items-center mb-4">
              <View className="flex-row">
                {[1, 2, 3, 4, 5].map((star) => (
                  <MaterialIcons
                    key={star}
                    name={star <= product.rating ? "star" : "star-border"}
                    size={20}
                    color={star <= product.rating ? "#fbbf24" : "#d1d5db"}
                  />
                ))}
              </View>
            </View> */}

           
            <Text className="text-3xl font-bold text-gray-900 mb-6">
              ₦{product.price.toLocaleString()}
            </Text>

           
            {product.sizeOptions && product.sizeOptions.length > 0 && (
              <View className="mb-6">
                <Text className="text-lg font-semibold text-gray-900 mb-3">
                  Select Size
                </Text>
                <View className="flex-row flex-wrap">
                  {product.sizeOptions.map((size, index) => (
                    <View
                      key={index}
                      className="border border-gray-300 rounded-lg px-6 py-3 mr-3 mb-3"
                    >
                      <Text className="text-gray-900 font-medium">{size}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

           
            {product.colourOptions && product.colourOptions.length > 0 && (
              <View className="mb-6">
                <Text className="text-lg font-semibold text-gray-900 mb-3">
                  Select Color
                </Text>
                <View className="flex-row flex-wrap">
                  {product.colourOptions.map((color, index) => (
                    <View
                      key={index}
                      className="mr-4 mb-3 items-center"
                    >
                      <View
                        className="w-12 h-12 rounded-full border-2 border-gray-300"
                        style={{ backgroundColor: color }}
                      />
                    </View>
                  ))}
                </View>
              </View>
            )}

           
            {product.features && product.features.length > 0 && (
              <View className="mb-6">
                <Text className="text-lg font-semibold text-gray-900 mb-3">
                  Key Features
                </Text>
                {product.features.map((feature, index) => (
                  <View key={index} className="flex-row items-start mb-2">
                    <MaterialIcons name="check" size={20} color="#10b981" />
                    <Text className="text-gray-700 ml-2 flex-1">{feature}</Text>
                  </View>
                ))}
              </View>
            )}

           
            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-900 mb-3">
                Description
              </Text>
              <Text className="text-gray-700 leading-6">
                {product.description}
              </Text>
            </View>

            
            <View className="flex-row mb-6">
              <View className="flex-1">
                <Text className="text-sm text-gray-500 mb-1">SKU</Text>
                <Text className="text-gray-900 font-medium">{product.sku}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm text-gray-500 mb-1">Stock</Text>
                <Text className="text-gray-900 font-medium">{product.stock} units</Text>
              </View>
            </View>
          </View>
        </ScrollView>

       
        <View className="flex-row items-center px-4 py-4 border-t border-gray-200">
          <Pressable
            onPress={onEdit}
            className="flex-1 py-4 items-center justify-center rounded-xl border border-gray-300 mr-3"
          >
            <Text className="text-gray-900 font-medium text-base">Edit</Text>
          </Pressable>

          <Pressable
            onPress={handleDeleteClick}
            className="flex-1 py-4 items-center justify-center rounded-xl bg-black"
          >
            <Text className="text-white font-medium text-base">Delete</Text>
          </Pressable>
        </View>

       
        {showDeleteConfirmation && (
          <View className="absolute inset-0 bg-black/50 justify-center items-center px-6">
            <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
              
            
              <View className="items-center mb-4">
                <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center">
                  <MaterialIcons name="warning" size={32} color="#ef4444" />
                </View>
              </View>

          
              <Text className="text-xl font-bold text-gray-900 text-center mb-2">
                Delete Product?
              </Text>

             
              <Text className="text-gray-600 text-center mb-6">
                Are you sure you want to delete "{product.title}"? This action cannot be undone.
              </Text>

            
              <View className="flex-row">
             
                <Pressable
                  onPress={() => setShowDeleteConfirmation(false)}
                  disabled={deleteLoading}
                  className="flex-1 py-3 border border-gray-300 rounded-lg mr-2"
                >
                  <Text className="text-center text-gray-700 font-medium">
                    Cancel
                  </Text>
                </Pressable>

               
                <Pressable
                  onPress={handleConfirmDelete}
                  disabled={deleteLoading}
                  className={`flex-1 py-3 rounded-lg ml-2 ${
                    deleteLoading ? 'bg-red-400' : 'bg-red-600'
                  }`}
                >
                  {deleteLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="text-center text-white font-medium">
                      Delete
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}