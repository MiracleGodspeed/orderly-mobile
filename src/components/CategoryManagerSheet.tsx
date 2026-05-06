import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import KeyboardScreen from "./KeyboardScreen";
import { useEffect, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useToast } from "react-native-toast-notifications";

import { BottomSheet } from "./BottomSheet";
import {
  createCatalogCategory,
  deleteCatalogCategory,
  getCatalogCategories,
  renameCatalogCategory,
} from "../api/vendor/vendor.api";
import { CatalogCategory } from "../api/vendor/vendor.types";

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Fires after any create/rename/delete succeeds so the parent can
   *  refresh its own copy of the categories list. */
  onChanged?: () => void;
}

const haptic = () => {
  if (Platform.OS === "ios") {
    Haptics.selectionAsync().catch(() => {});
  }
};

export function CategoryManagerSheet({ visible, onClose, onChanged }: Props) {
  const toast = useToast();

  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [loading, setLoading] = useState(false);

  // Add form
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit state per row — we only allow one open editor at a time
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const data = await getCatalogCategories();
      setCategories(data);
    } catch (err: any) {
      console.error("Failed to load categories:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchAll();
      // Reset transient state when reopening
      setNewName("");
      setNewDescription("");
      setEditingId(null);
      setEditingName("");
    }
  }, [visible]);

  const notifyParent = () => {
    onChanged?.();
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) {
      toast.show("Give the category a name", { type: "danger" });
      return;
    }
    if (creating) return;
    try {
      setCreating(true);
      await createCatalogCategory({
        name,
        description: newDescription.trim() || undefined,
      });
      toast.show(`"${name}" created`, { type: "success" });
      setNewName("");
      setNewDescription("");
      await fetchAll();
      notifyParent();
    } catch (err: any) {
      toast.show(err?.message || "Couldn't create category", {
        type: "danger",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleStartEdit = (category: CatalogCategory) => {
    haptic();
    setEditingId(category.id);
    setEditingName(category.name);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const handleSaveEdit = async () => {
    if (editingId == null) return;
    const name = editingName.trim();
    if (!name) {
      toast.show("Name can't be empty", { type: "danger" });
      return;
    }
    if (renaming) return;
    try {
      setRenaming(true);
      await renameCatalogCategory(editingId, name);
      toast.show("Category renamed", { type: "success" });
      handleCancelEdit();
      await fetchAll();
      notifyParent();
    } catch (err: any) {
      toast.show(err?.message || "Couldn't rename category", {
        type: "danger",
      });
    } finally {
      setRenaming(false);
    }
  };

  const handleDelete = (category: CatalogCategory) => {
    if (deletingId != null) return;
    Alert.alert(
      "Delete category?",
      `"${category.name}" will be removed. Products in it will stay, just uncategorized.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingId(category.id);
              await deleteCatalogCategory(category.id);
              toast.show("Category deleted", { type: "success" });
              await fetchAll();
              notifyParent();
            } catch (err: any) {
              toast.show(err?.message || "Couldn't delete category", {
                type: "danger",
              });
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Manage categories"
      subtitle="Group products into your own collections"
      height="85%"
    >
      <KeyboardScreen
        contentContainerStyle={{ paddingHorizontal: 20 }}
        bottomPadding={32}
      >
        {/* Add new */}
        <View className="mt-4 mb-5 rounded-3xl border border-gray-100 bg-white p-4"
          style={{
            shadowColor: "#0f172a",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 12,
            elevation: 2,
          }}
        >
          <Text className="text-[11px] font-extrabold text-gray-400 uppercase tracking-[1.2px] mb-3">
            New category
          </Text>

          <Text className="text-[12.5px] font-semibold text-gray-700 mb-1.5">
            Name
          </Text>
          <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 mb-3">
            <Ionicons name="pricetag-outline" size={16} color="#9ca3af" />
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. Summer Collection"
              placeholderTextColor="#9ca3af"
              className="flex-1 ml-2 py-3 text-[14.5px] text-gray-900"
              maxLength={48}
            />
          </View>

          <Text className="text-[12.5px] font-semibold text-gray-700 mb-1.5">
            Description (optional)
          </Text>
          <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 mb-3">
            <Ionicons name="document-text-outline" size={16} color="#9ca3af" />
            <TextInput
              value={newDescription}
              onChangeText={setNewDescription}
              placeholder="A note for yourself"
              placeholderTextColor="#9ca3af"
              className="flex-1 ml-2 py-3 text-[14.5px] text-gray-900"
              maxLength={120}
            />
          </View>

          <Pressable
            onPress={handleCreate}
            disabled={creating || !newName.trim()}
            className={`h-11 rounded-2xl flex-row items-center justify-center gap-2 ${
              creating || !newName.trim() ? "bg-blue-300" : "bg-blue-600"
            }`}
            style={{
              shadowColor: "#2563eb",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: creating || !newName.trim() ? 0 : 0.22,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            {creating ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="add-circle-outline" size={16} color="white" />
            )}
            <Text className="text-white font-bold text-[14px]">
              {creating ? "Adding…" : "Add category"}
            </Text>
          </Pressable>
        </View>

        {/* Existing list */}
        <Text className="text-[11px] font-extrabold text-gray-400 uppercase tracking-[1.2px] mb-3">
          Your categories · {categories.length}
        </Text>

        {loading ? (
          <View className="items-center py-10">
            <ActivityIndicator size="small" color="#2563eb" />
            <Text className="text-[12.5px] text-gray-500 mt-2 font-semibold">
              Loading…
            </Text>
          </View>
        ) : categories.length === 0 ? (
          <View className="items-center py-10 bg-white rounded-3xl border border-gray-100">
            <View className="w-12 h-12 rounded-2xl bg-blue-50 items-center justify-center mb-2">
              <Ionicons name="albums-outline" size={20} color="#2563eb" />
            </View>
            <Text className="text-[14px] font-extrabold text-gray-900">
              No categories yet
            </Text>
            <Text className="text-[12px] text-gray-500 mt-1 text-center max-w-[260px]">
              Create your first category above to start grouping products.
            </Text>
          </View>
        ) : (
          <View
            className="bg-white rounded-3xl border border-gray-100 overflow-hidden"
            style={{
              shadowColor: "#0f172a",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 12,
              elevation: 2,
            }}
          >
            {categories.map((category, idx) => {
              const isEditing = editingId === category.id;
              const isDeleting = deletingId === category.id;
              const isLast = idx === categories.length - 1;
              return (
                <View
                  key={category.id}
                  className={`px-4 py-3 ${
                    isLast ? "" : "border-b border-gray-50"
                  }`}
                >
                  {isEditing ? (
                    <View>
                      <View className="flex-row items-center bg-gray-50 border border-blue-300 rounded-2xl px-4 mb-2">
                        <Ionicons
                          name="create-outline"
                          size={16}
                          color="#2563eb"
                        />
                        <TextInput
                          value={editingName}
                          onChangeText={setEditingName}
                          autoFocus
                          className="flex-1 ml-2 py-3 text-[14.5px] text-gray-900"
                          maxLength={48}
                        />
                      </View>
                      <View className="flex-row gap-2">
                        <Pressable
                          onPress={handleCancelEdit}
                          disabled={renaming}
                          className="flex-1 h-10 rounded-2xl border border-gray-200 bg-white items-center justify-center"
                        >
                          <Text className="text-[13px] font-bold text-gray-700">
                            Cancel
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={handleSaveEdit}
                          disabled={renaming || !editingName.trim()}
                          className={`flex-1 h-10 rounded-2xl items-center justify-center flex-row gap-1.5 ${
                            renaming || !editingName.trim()
                              ? "bg-blue-300"
                              : "bg-blue-600"
                          }`}
                        >
                          {renaming ? (
                            <ActivityIndicator size="small" color="white" />
                          ) : (
                            <Ionicons
                              name="checkmark"
                              size={14}
                              color="white"
                            />
                          )}
                          <Text className="text-white text-[13px] font-bold">
                            {renaming ? "Saving…" : "Save"}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <View className="flex-row items-center">
                      <View
                        className="w-9 h-9 rounded-xl bg-blue-50 items-center justify-center"
                      >
                        <Ionicons name="pricetag" size={15} color="#2563eb" />
                      </View>
                      <View className="flex-1 min-w-0 ml-3">
                        <Text
                          className="text-[14px] font-extrabold text-gray-900"
                          numberOfLines={1}
                        >
                          {category.name}
                        </Text>
                        {!!category.description && (
                          <Text
                            className="text-[12px] text-gray-500 mt-0.5"
                            numberOfLines={1}
                          >
                            {category.description}
                          </Text>
                        )}
                      </View>
                      <Pressable
                        onPress={() => handleStartEdit(category)}
                        disabled={isDeleting}
                        className="w-9 h-9 rounded-full items-center justify-center bg-gray-50 active:bg-gray-100 mr-1.5"
                        hitSlop={6}
                      >
                        <Ionicons name="pencil" size={14} color="#374151" />
                      </Pressable>
                      <Pressable
                        onPress={() => handleDelete(category)}
                        disabled={isDeleting}
                        className="w-9 h-9 rounded-full items-center justify-center bg-rose-50 active:bg-rose-100"
                        hitSlop={6}
                      >
                        {isDeleting ? (
                          <ActivityIndicator size="small" color="#dc2626" />
                        ) : (
                          <Ionicons
                            name="trash-outline"
                            size={14}
                            color="#dc2626"
                          />
                        )}
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </KeyboardScreen>
    </BottomSheet>
  );
}
