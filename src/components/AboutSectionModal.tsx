import { View, Text, ScrollView } from "react-native";
import { useState, useEffect, useRef } from "react";
import { useVendor } from "../../context/VendorContext";
import { RichEditor, RichToolbar, actions } from "react-native-pell-rich-editor";
import { BottomSheet, BottomSheetFooter } from "./BottomSheet";

interface Props {
  visible: boolean;
  onClose: () => void;
  initialTitle?: string;
  initialBody?: string;
}

export default function AboutSectionModal({
  visible,
  onClose,
  initialTitle,
  initialBody,
}: Props) {
  const { updateVendorSettings, storeData, loading } = useVendor();
  const [heading, setHeading] = useState("");
  const [subheading, setSubheading] = useState("");

  const richTextHeading = useRef<RichEditor>(null);
  const richTextSubheading = useRef<RichEditor>(null);
  const [activeEditor, setActiveEditor] = useState<"heading" | "subheading">(
    "heading"
  );

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

  const activeRef =
    activeEditor === "heading" ? richTextHeading : richTextSubheading;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="About Us Content"
      subtitle="Tell your story — visitors trust stores that feel human"
      height="92%"
    >
      {/* Keyboard handling lives in BottomSheet; the outer sheet lifts
          everything above the keyboard so we don't need a local KAV. */}
      <View style={{ flex: 1 }}>
        {/* Rich-text toolbar */}
        <View className="bg-gray-50 border-b border-gray-100">
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
            style={{ backgroundColor: "transparent" }}
          />
          <View className="bg-blue-50 px-4 py-1.5 border-t border-gray-100 items-center">
            <Text className="text-[10px] font-bold text-blue-600 uppercase tracking-[1.5px]">
              Formatting · {activeEditor === "heading" ? "Heading" : "Description"}
            </Text>
          </View>
        </View>

        <ScrollView
          className="flex-1 px-5 pt-4"
          keyboardShouldPersistTaps="handled"
        >
          <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-[1.2px] mb-2">
            Heading
          </Text>
          <View
            className="border border-gray-100 rounded-2xl overflow-hidden bg-white mb-5"
            style={{
              shadowColor: "#0f172a",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
              elevation: 1,
            }}
          >
            <RichEditor
              ref={richTextHeading}
              initialContentHTML={heading}
              onChange={setHeading}
              placeholder="A bold one-liner about who you are…"
              initialHeight={80}
              style={{ minHeight: 80 }}
              onFocus={() => setActiveEditor("heading")}
            />
          </View>

          <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-[1.2px] mb-2">
            Description
          </Text>
          <View
            className="border border-gray-100 rounded-2xl overflow-hidden bg-white mb-6"
            style={{
              shadowColor: "#0f172a",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
              elevation: 1,
            }}
          >
            <RichEditor
              ref={richTextSubheading}
              initialContentHTML={subheading}
              onChange={setSubheading}
              placeholder="Tell your story — your craft, your customers, your mission."
              initialHeight={250}
              style={{ minHeight: 250 }}
              onFocus={() => setActiveEditor("subheading")}
            />
          </View>
        </ScrollView>

        <BottomSheetFooter
          onCancel={onClose}
          onSave={handleSave}
          loading={loading}
        />
      </View>
    </BottomSheet>
  );
}
