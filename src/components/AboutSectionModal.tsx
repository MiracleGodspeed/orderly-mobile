import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  Switch,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useState, useEffect, useRef } from "react";
import AntDesign from '@expo/vector-icons/AntDesign';
import { useVendor } from "../../context/VendorContext";
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';


interface Props {
  visible: boolean;
  onClose: () => void;
  initialTitle?: string;
  initialBody?: string;
}

export default function AboutSectionModal({ visible, onClose, initialTitle, initialBody }: Props) {
  const { updateVendorSettings, storeData, loading } = useVendor();
  const [heading, setHeading] = useState("");
  const [subheading, setSubheading] = useState("");
  
  const richTextHeading = useRef<RichEditor>(null);
  const richTextSubheading = useRef<RichEditor>(null);
  const [activeEditor, setActiveEditor] = useState<'heading' | 'subheading'>('heading');

  useEffect(() => {
    if (visible) {
      setHeading(initialTitle || "");
      setSubheading(initialBody || "");
    }
  }, [visible, initialTitle, initialBody]);

  const handleSave = async () => {
    if (!storeData) return;
    try {
      const updatedStoreFrontJson = {
        ...storeData.storeFrontJson,
        aboutTitle: heading,
        aboutBody: subheading,
      };
      await updateVendorSettings({ storeFrontJson: updatedStoreFrontJson });
      onClose();
    } catch (e) {
      console.error("Failed to save about section:", e);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  const activeRef = activeEditor === 'heading' ? richTextHeading : richTextSubheading;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
    >
      <View className="flex-1 bg-black/40 justify-end">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="bg-white rounded-t-3xl h-[90%]"
        >

          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200">
            <View>
              <Text className="text-lg font-bold">About Us Content</Text>
              <Text className="text-xs text-gray-500">Edit heading and description</Text>
            </View>
            <Pressable onPress={onClose} className="p-2 -mr-2">
              <AntDesign name="close" size={24} color="black" />
            </Pressable>
          </View>

          {/* Fixed Toolbar Area */}
          <View className="bg-gray-50 border-b border-gray-200">
            <RichToolbar
              editor={activeRef}
              actions={[ 
                actions.setBold, 
                actions.setItalic, 
                actions.setUnderline,
                actions.insertBulletsList, 
                actions.insertOrderedList, 
                actions.insertLink,
                actions.undo,
                actions.redo,
              ]}
              iconTint="#4b5563"
              selectedIconTint="#2563eb"
              disabledIconTint="#d1d5db"
              style={{ backgroundColor: 'transparent' }}
            />
            <View className="bg-blue-50 px-4 py-1.5 border-t border-gray-100 items-center">
              <Text className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                Formatting: {activeEditor === 'heading' ? 'Heading' : 'Subheading'}
              </Text>
            </View>
          </View>

          <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled">
            <Text className="text-xs font-bold text-gray-400 uppercase tracking-tighter mb-2">Heading</Text>
            <View className="border border-gray-200 rounded-xl overflow-hidden bg-white mb-6 shadow-sm">
              <RichEditor
                ref={richTextHeading}
                initialContentHTML={heading}
                onChange={setHeading}
                placeholder="Enter heading..."
                initialHeight={80}
                style={{ minHeight: 80 }}
                onFocus={() => {
                  setActiveEditor('heading');
                  if (heading && richTextHeading.current) {
                    richTextHeading.current.setContentHTML(heading);
                  }
                }}
              />
            </View>

            <Text className="text-xs font-bold text-gray-400 uppercase tracking-tighter mb-2">Subheading / Description</Text>
            <View className="border border-gray-200 rounded-xl overflow-hidden bg-white mb-8 shadow-sm">
              <RichEditor
                ref={richTextSubheading}
                initialContentHTML={subheading}
                onChange={setSubheading}
                placeholder="Enter detailed description..."
                initialHeight={250}
                style={{ minHeight: 250 }}
                onFocus={() => {
                  setActiveEditor('subheading');
                  if (subheading && richTextSubheading.current) {
                    richTextSubheading.current.setContentHTML(subheading);
                  }
                }}
              />
            </View>
          </ScrollView>

          <View className="flex-row items-center px-4 py-4 border-t border-gray-200 mb-6 bg-white">
            <Pressable
              onPress={handleCancel}
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
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
