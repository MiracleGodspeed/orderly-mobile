import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { useEffect, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useVendor } from "../../context/VendorContext";
import { BottomSheet } from "./BottomSheet";

function SheetFooter({ children }: { children: React.ReactNode }) {
  return (
    <View
      className="px-5 pt-3 pb-7 border-t border-gray-100 bg-white"
      style={{
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 6,
      }}
    >
      {children}
    </View>
  );
}

export interface PromoBar {
  text: string;
  link?: string | null;
}

export interface SocialLinks {
  facebook?: string | null;
  instagram?: string | null;
  twitter?: string | null;
  tiktok?: string | null;
  youtube?: string | null;
  pinterest?: string | null;
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

interface SocialFieldDef {
  key: keyof SocialLinks;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  placeholder: string;
}

const SOCIAL_FIELDS: SocialFieldDef[] = [
  {
    key: "facebook",
    label: "Facebook",
    icon: "logo-facebook",
    iconColor: "#2563eb",
    placeholder: "facebook.com/yourpage",
  },
  {
    key: "instagram",
    label: "Instagram",
    icon: "logo-instagram",
    iconColor: "#db2777",
    placeholder: "instagram.com/yourhandle",
  },
  {
    key: "twitter",
    label: "Twitter / X",
    icon: "logo-twitter",
    iconColor: "#0ea5e9",
    placeholder: "x.com/yourhandle",
  },
  {
    key: "tiktok",
    label: "TikTok",
    icon: "logo-tiktok",
    iconColor: "#0f172a",
    placeholder: "tiktok.com/@yourhandle",
  },
  {
    key: "youtube",
    label: "YouTube",
    icon: "logo-youtube",
    iconColor: "#dc2626",
    placeholder: "youtube.com/@yourchannel",
  },
  {
    key: "pinterest",
    label: "Pinterest",
    icon: "logo-pinterest",
    iconColor: "#dc2626",
    placeholder: "pinterest.com/yourhandle",
  },
];

/**
 * Promo bar + social links editor. The promo bar drives the slim
 * strip at the very top of every storefront page; empty text removes
 * the strip. Social URLs power the footer icons; blanks hide that
 * specific icon.
 */
export default function PromoSocialModal({ visible, onClose }: Props) {
  const { storeData, updateVendorSettings } = useVendor();
  const [promoText, setPromoText] = useState("");
  const [promoLink, setPromoLink] = useState("");
  const [social, setSocial] = useState<SocialLinks>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const json: any = (storeData as any)?.storeFrontJson ?? {};
    const promo: PromoBar = json.promoBar ?? { text: "", link: null };
    const links: SocialLinks = json.socialLinks ?? {};
    setPromoText(promo.text ?? "");
    setPromoLink(promo.link ?? "");
    setSocial({
      facebook: links.facebook ?? "",
      instagram: links.instagram ?? "",
      twitter: links.twitter ?? "",
      tiktok: links.tiktok ?? "",
      youtube: links.youtube ?? "",
      pinterest: links.pinterest ?? "",
    });
  }, [visible, storeData]);

  const setSocialField = (key: keyof SocialLinks, value: string) => {
    setSocial((curr) => ({ ...curr, [key]: value }));
  };

  const handleSave = async () => {
    if (!storeData) return;
    setSaving(true);
    try {
      const merged = {
        ...(storeData as any).storeFrontJson,
        promoBar: {
          text: promoText.trim(),
          link: promoLink.trim() || null,
        },
        socialLinks: {
          facebook: (social.facebook ?? "").trim() || null,
          instagram: (social.instagram ?? "").trim() || null,
          twitter: (social.twitter ?? "").trim() || null,
          tiktok: (social.tiktok ?? "").trim() || null,
          youtube: (social.youtube ?? "").trim() || null,
          pinterest: (social.pinterest ?? "").trim() || null,
        },
      };
      await updateVendorSettings({ storeFrontJson: merged });
      onClose();
    } catch (e) {
      Alert.alert("Couldn't save", "Please try again.");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Promo bar & social"
      subtitle="Top strip and footer social links"
      height="92%"
    >
      {/* Keyboard handling lives in BottomSheet; the outer sheet lifts
          everything above the keyboard. */}
      <View style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Promo bar */}
          <View
            className="bg-white rounded-2xl border border-gray-100 p-4 mb-4"
            style={{
              shadowColor: "#0f172a",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
              elevation: 1,
            }}
          >
            <View className="flex-row items-center gap-2 mb-3">
              <View className="w-8 h-8 rounded-xl bg-pink-50 items-center justify-center">
                <Ionicons name="megaphone" size={15} color="#db2777" />
              </View>
              <View className="flex-1">
                <Text
                  className="text-[13.5px] text-gray-900"
                  style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                >
                  Top promo bar
                </Text>
                <Text className="text-[11.5px] text-gray-500 mt-0.5">
                  Slim strip at the top of every page · leave blank to hide
                </Text>
              </View>
            </View>

            <Field label="Message">
              <TextInput
                value={promoText}
                onChangeText={setPromoText}
                placeholder="Free shipping on orders over ₦20,000"
                placeholderTextColor="#9CA3AF"
                maxLength={120}
                className="h-12 bg-gray-50 border border-gray-200 rounded-xl px-3 text-[14.5px] text-gray-900"
              />
            </Field>

            <Field label="Link (optional)">
              <TextInput
                value={promoLink}
                onChangeText={setPromoLink}
                placeholder="/catalog?tag=sale"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                autoCorrect={false}
                className="h-12 bg-gray-50 border border-gray-200 rounded-xl px-3 text-[14.5px] text-gray-900"
              />
            </Field>
          </View>

          {/* Social */}
          <View
            className="bg-white rounded-2xl border border-gray-100 p-4"
            style={{
              shadowColor: "#0f172a",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
              elevation: 1,
            }}
          >
            <View className="flex-row items-center gap-2 mb-3">
              <View className="w-8 h-8 rounded-xl bg-sky-50 items-center justify-center">
                <Ionicons name="share-social" size={15} color="#0284c7" />
              </View>
              <View className="flex-1">
                <Text
                  className="text-[13.5px] text-gray-900"
                  style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                >
                  Social media links
                </Text>
                <Text className="text-[11.5px] text-gray-500 mt-0.5">
                  Footer icons · leave a field blank to hide that icon
                </Text>
              </View>
            </View>

            {SOCIAL_FIELDS.map(({ key, label, icon, iconColor, placeholder }) => (
              <View key={key} className="mb-3 last:mb-0">
                <View className="flex-row items-center gap-1.5 mb-1.5">
                  <Ionicons name={icon} size={14} color={iconColor} />
                  <Text
                    className="text-[10.5px] font-extrabold text-gray-500 uppercase"
                    style={{ letterSpacing: 1.2 }}
                  >
                    {label}
                  </Text>
                </View>
                <TextInput
                  value={(social[key] as string) ?? ""}
                  onChangeText={(v) => setSocialField(key, v)}
                  placeholder={placeholder}
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="h-12 bg-gray-50 border border-gray-200 rounded-xl px-3 text-[14.5px] text-gray-900"
                />
              </View>
            ))}
          </View>
        </ScrollView>

        <SheetFooter>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            className="h-12 rounded-2xl items-center justify-center flex-row gap-2 bg-blue-600"
            style={{
              shadowColor: "#2563eb",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Ionicons name="checkmark" size={16} color="white" />
            <Text
              className="text-white text-[14.5px]"
              style={{ fontFamily: "PlusJakartaSans_700Bold" }}
            >
              {saving ? "Saving…" : "Save"}
            </Text>
          </Pressable>
        </SheetFooter>
      </View>
    </BottomSheet>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-3">
      <Text
        className="text-[10.5px] font-extrabold text-gray-500 uppercase mb-1.5"
        style={{ letterSpacing: 1.2 }}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}
