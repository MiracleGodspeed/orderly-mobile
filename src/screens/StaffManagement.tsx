import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  TextInput,
  Platform,
  ActivityIndicator,
  Alert,
  Clipboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useToast } from "react-native-toast-notifications";

import { RootStackParamList } from "../navigation/types";
import {
  listStaff,
  inviteStaff,
  updateStaffPermissions,
  suspendStaff,
  reactivateStaff,
  removeStaff,
  resendStaffInvite,
} from "../api/vendor/vendor.api";
import { StaffMember, StaffStatus } from "../api/vendor/vendor.types";
import {
  PERMISSION_GROUPS,
  PERMISSION_PRESETS,
  StaffPermission,
} from "../lib/staffPermissions";
import { formatRelativeTime } from "../lib/format";
import KeyboardScreen from "../components/KeyboardScreen";

type ScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "StaffManagement"
>;

const STATUS_TONE: Record<
  StaffStatus,
  { dot: string; text: string; bg: string; border: string; label: string }
> = {
  Active: {
    dot: "#10b981",
    text: "#047857",
    bg: "#ecfdf5",
    border: "#a7f3d0",
    label: "Active",
  },
  Pending: {
    dot: "#f59e0b",
    text: "#b45309",
    bg: "#fffbeb",
    border: "#fde68a",
    label: "Invited",
  },
  Suspended: {
    dot: "#94a3b8",
    text: "#475569",
    bg: "#f8fafc",
    border: "#e2e8f0",
    label: "Suspended",
  },
  Removed: {
    dot: "#94a3b8",
    text: "#475569",
    bg: "#f8fafc",
    border: "#e2e8f0",
    label: "Removed",
  },
};

const haptic = () => {
  if (Platform.OS === "ios") {
    Haptics.selectionAsync().catch(() => {});
  }
};

const initials = (name: string) =>
  (name || "?").trim().charAt(0).toUpperCase();

export default function StaffManagement() {
  const navigation = useNavigation<ScreenNavigationProp>();
  const toast = useToast();

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [seatLimit, setSeatLimit] = useState<number | null>(null);
  const [seatsUsed, setSeatsUsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null);
  // One-shot credentials reveal — populated after Invite / Resend
  // so the vendor can copy / share the password via WhatsApp / SMS
  // even if the email is delayed. Cleared when they tap Done.
  const [issuedCreds, setIssuedCreds] = useState<{
    fullName: string;
    email: string;
    password: string;
    headline: string;
    blurb: string;
  } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await listStaff();
      setStaff(result.staff || []);
      setSeatLimit(result.seatLimit ?? null);
      setSeatsUsed(result.seatsUsed ?? 0);
    } catch (err: any) {
      toast.show(err?.message || "Couldn't load staff list", {
        type: "danger",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const seatsRemaining =
    seatLimit === null ? Infinity : Math.max(0, seatLimit - seatsUsed);
  const canInvite = seatLimit === null || seatsUsed < seatLimit;
  const seatLabel =
    seatLimit === null
      ? `${seatsUsed} active`
      : `${seatsUsed} of ${seatLimit} used`;

  const onSuspend = (s: StaffMember) => {
    Alert.alert(
      "Suspend access?",
      `${s.fullName} won't be able to log in until you reactivate them.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Suspend",
          style: "destructive",
          onPress: async () => {
            try {
              await suspendStaff(s.id);
              toast.show("Staff suspended", { type: "success" });
              setEditTarget(null);
              refresh();
            } catch (err: any) {
              toast.show(err?.message || "Couldn't suspend", { type: "danger" });
            }
          },
        },
      ]
    );
  };

  const onReactivate = async (s: StaffMember) => {
    try {
      await reactivateStaff(s.id);
      toast.show("Staff reactivated", { type: "success" });
      setEditTarget(null);
      refresh();
    } catch (err: any) {
      toast.show(err?.message || "Couldn't reactivate", { type: "danger" });
    }
  };

  /**
   * Regenerates the staff member's password and re-emails the
   * credentials. The previous password is invalidated immediately —
   * backend also refuses when the staff has already signed in
   * (would lock them out of an active session). The freshly-issued
   * password is surfaced via `issuedCreds` so the vendor can copy
   * + share via WhatsApp / SMS if email delivery is slow.
   */
  const onResend = async (s: StaffMember) => {
    try {
      const updated = await resendStaffInvite(s.id);
      setEditTarget(null);
      if (updated.issuedPassword) {
        setIssuedCreds({
          fullName: updated.fullName,
          email: updated.email,
          password: updated.issuedPassword,
          headline: "New password issued",
          blurb:
            "We emailed the new credentials to your teammate. Copy + share them directly if the email hasn't arrived.",
        });
      } else {
        toast.show("Credentials sent", { type: "success" });
      }
      refresh();
    } catch (err: any) {
      toast.show(err?.message || "Couldn't resend invite", { type: "danger" });
    }
  };

  const onRemove = (s: StaffMember) => {
    Alert.alert(
      "Remove teammate?",
      `${s.fullName} loses access immediately. Past actions stay in your audit trail. This can't be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await removeStaff(s.id);
              toast.show("Staff removed", { type: "success" });
              setEditTarget(null);
              refresh();
            } catch (err: any) {
              toast.show(err?.message || "Couldn't remove", { type: "danger" });
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="px-5 pt-3 pb-3 flex-row items-center justify-between">
        <Pressable
          onPress={() => navigation.goBack()}
          className="w-10 h-10 bg-white border border-gray-200 rounded-full items-center justify-center"
        >
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </Pressable>
        <Text
          className="text-[16px] text-gray-900"
          style={{ fontFamily: "PlusJakartaSans_700Bold" }}
        >
          Staff & Permissions
        </Text>
        <View className="w-10 h-10" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5 mt-2">
          <View
            className="bg-white border border-gray-100 rounded-3xl px-5 py-5"
            style={{
              shadowColor: "#0f172a",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 12,
              elevation: 2,
            }}
          >
            <Text
              className="text-[11px] text-gray-400 uppercase mb-1.5"
              style={{
                fontFamily: "PlusJakartaSans_700Bold",
                letterSpacing: 1.2,
              }}
            >
              Seats
            </Text>
            <Text
              className="text-gray-900"
              style={{
                fontFamily: "PlusJakartaSans_700Bold",
                fontSize: 26,
                letterSpacing: -0.6,
              }}
            >
              {seatLabel}
            </Text>
            <Text className="text-[12.5px] text-gray-500 mt-1">
              {seatLimit === null
                ? "Your plan includes unlimited staff seats."
                : `Upgrade your plan to invite more than ${seatLimit}.`}
            </Text>

            <Pressable
              onPress={() => {
                if (!canInvite) {
                  toast.show("You've reached your plan's seat limit", {
                    type: "warning",
                  });
                  return;
                }
                haptic();
                setInviteOpen(true);
              }}
              className={`mt-4 rounded-xl py-3.5 items-center ${
                canInvite ? "bg-gray-900" : "bg-gray-300"
              }`}
            >
              <Text
                className="text-white"
                style={{
                  fontFamily: "PlusJakartaSans_700Bold",
                  fontSize: 14,
                }}
              >
                Invite teammate
              </Text>
            </Pressable>
          </View>
        </View>

        <View className="px-5 mt-5">
          <Text
            className="text-[11px] text-gray-400 uppercase tracking-[1.2px] mb-2 px-1"
            style={{ fontFamily: "PlusJakartaSans_700Bold" }}
          >
            Team
          </Text>

          {loading ? (
            <View className="bg-white rounded-2xl border border-gray-100 py-10 items-center">
              <ActivityIndicator color="#111827" />
            </View>
          ) : staff.length === 0 ? (
            <View className="bg-white rounded-2xl border border-gray-100 py-10 items-center px-6">
              <View
                className="w-12 h-12 rounded-2xl items-center justify-center mb-3"
                style={{ backgroundColor: "#f3f4f6" }}
              >
                <Ionicons name="people-outline" size={22} color="#6b7280" />
              </View>
              <Text
                className="text-[14px] text-gray-900"
                style={{ fontFamily: "PlusJakartaSans_700Bold" }}
              >
                No staff yet
              </Text>
              <Text className="text-[12.5px] text-gray-500 mt-1 text-center">
                Invite a teammate to share the load — confirm orders, manage
                stock, all without sharing your password.
              </Text>
            </View>
          ) : (
            <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {staff.map((s, i) => {
                const tone = STATUS_TONE[s.status];
                // New flow: staff land as Active immediately. Show
                // Resend until they actually sign in (server stamps
                // `acceptedAt` on first login) — after that,
                // regenerating their password would lock them out
                // of an active session.
                const canResend =
                  s.status === "Pending" ||
                  (s.status === "Active" && s.acceptedAt == null);
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => {
                      haptic();
                      setEditTarget(s);
                    }}
                    className={`flex-row items-center px-4 py-3.5 active:bg-gray-50 ${
                      i !== staff.length - 1
                        ? "border-b border-gray-100"
                        : ""
                    }`}
                  >
                    <View
                      className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mr-3"
                    >
                      <Text
                        className="text-blue-600"
                        style={{
                          fontFamily: "PlusJakartaSans_700Bold",
                          fontSize: 16,
                        }}
                      >
                        {initials(s.fullName)}
                      </Text>
                    </View>

                    <View className="flex-1 min-w-0 pr-2">
                      <Text
                        className="text-[14.5px] text-gray-900"
                        style={{
                          fontFamily: "PlusJakartaSans_700Bold",
                          letterSpacing: -0.2,
                        }}
                        numberOfLines={1}
                      >
                        {s.fullName}
                      </Text>
                      <Text
                        className="text-[12px] text-gray-500 mt-0.5"
                        numberOfLines={1}
                      >
                        {s.email}
                      </Text>
                      <View className="flex-row items-center mt-1.5 gap-1.5">
                        <View
                          className="flex-row items-center gap-1 px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: tone.bg,
                            borderWidth: 1,
                            borderColor: tone.border,
                          }}
                        >
                          <View
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: 999,
                              backgroundColor: tone.dot,
                            }}
                          />
                          <Text
                            style={{
                              color: tone.text,
                              fontSize: 10,
                              fontFamily: "PlusJakartaSans_700Bold",
                              letterSpacing: 0.4,
                            }}
                          >
                            {tone.label}
                          </Text>
                        </View>
                        <Text className="text-[10.5px] text-gray-400">
                          {s.permissions.length} permission
                          {s.permissions.length === 1 ? "" : "s"} ·{" "}
                          {formatRelativeTime(s.invitedAt)}
                        </Text>
                      </View>
                    </View>

                    {/* "Send new credentials" pill — shown until
                        the staff actually signs in. Lives inside the
                        row Pressable but stops the tap from
                        bubbling, so it doesn't also open the edit
                        sheet right after the credentials reveal. */}
                    {canResend && (
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          haptic();
                          onResend(s);
                        }}
                        hitSlop={8}
                        className="flex-row items-center gap-1 px-3 py-1.5 rounded-full mr-1 bg-blue-50 active:bg-blue-100"
                      >
                        <Ionicons name="send" size={12} color="#1d4ed8" />
                        <Text
                          style={{
                            color: "#1d4ed8",
                            fontSize: 11.5,
                            fontFamily: "PlusJakartaSans_700Bold",
                          }}
                        >
                          Resend
                        </Text>
                      </Pressable>
                    )}

                    <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <InviteSheet
        visible={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={(created) => {
          setInviteOpen(false);
          if (created.issuedPassword) {
            setIssuedCreds({
              fullName: created.fullName,
              email: created.email,
              password: created.issuedPassword,
              headline: "Teammate added",
              blurb:
                "We emailed sign-in details to your teammate. Copy + share them directly so they can log in even if the email gets delayed.",
            });
          }
          refresh();
        }}
      />

      <CredentialsModal
        visible={issuedCreds != null}
        creds={issuedCreds}
        onClose={() => setIssuedCreds(null)}
      />

      <EditSheet
        target={editTarget}
        onClose={() => setEditTarget(null)}
        onChanged={() => {
          setEditTarget(null);
          refresh();
        }}
        onSuspend={onSuspend}
        onReactivate={onReactivate}
        onRemove={onRemove}
        onResend={onResend}
      />
    </SafeAreaView>
  );
}

// --- Invite sheet ---

function InviteSheet({
  visible,
  onClose,
  onInvited,
}: {
  visible: boolean;
  onClose: () => void;
  onInvited: (created: StaffMember) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [presetId, setPresetId] = useState<string>(PERMISSION_PRESETS[0].id);
  const [customPerms, setCustomPerms] = useState<StaffPermission[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const isCustom = presetId === "custom";
  const selectedPreset = PERMISSION_PRESETS.find((p) => p.id === presetId);
  const effectivePerms: StaffPermission[] = isCustom
    ? customPerms
    : selectedPreset?.permissions ?? [];

  const reset = () => {
    setName("");
    setEmail("");
    setPassword("");
    setPresetId(PERMISSION_PRESETS[0].id);
    setCustomPerms([]);
  };

  // Same client-side charset the server falls back to. Excludes
  // ambiguous glyphs (0/O/1/l/I) so a vendor reading the value off
  // the screen and typing it into WhatsApp doesn't generate typo-
  // driven login failures.
  const generatePassword = () => {
    haptic();
    const alphabet =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let out = "";
    for (let i = 0; i < 8; i++) {
      out += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    setPassword(out);
  };

  const submit = async () => {
    if (!name.trim() || !email.trim()) {
      toast.show("Name and email are required", { type: "warning" });
      return;
    }
    if (effectivePerms.length === 0) {
      toast.show("Pick at least one permission", { type: "warning" });
      return;
    }
    if (password && password.trim().length < 6) {
      toast.show("Password must be at least 6 characters", { type: "warning" });
      return;
    }
    try {
      setSubmitting(true);
      const created = await inviteStaff({
        fullName: name.trim(),
        email: email.trim().toLowerCase(),
        permissions: effectivePerms,
        password: password.trim() || undefined,
      });
      reset();
      onInvited(created);
    } catch (err: any) {
      toast.show(err?.message || "Couldn't add teammate", { type: "danger" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/50">
        <View
          className="bg-white rounded-t-3xl"
          // Definite height (not maxHeight) — the inner KeyboardScreen
          // uses flex: 1, which collapses to zero inside a content-sized
          // parent. Without this, the form fields would be squeezed out
          // and only the header + last button would render.
          style={{ height: "92%" }}
        >
          <View className="pt-2.5 pb-1 items-center">
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 999,
                backgroundColor: "#d1d5db",
              }}
            />
          </View>
          <View className="px-5 pt-3 pb-2 flex-row items-center justify-between border-b border-gray-100">
            <Text
              className="text-[16px] text-gray-900"
              style={{ fontFamily: "PlusJakartaSans_700Bold" }}
            >
              Invite teammate
            </Text>
            <Pressable
              onPress={onClose}
              className="w-9 h-9 items-center justify-center rounded-full bg-gray-50"
            >
              <Ionicons name="close" size={18} color="#374151" />
            </Pressable>
          </View>

          <KeyboardScreen
            className="px-5 py-4"
            bottomPadding={24}
          >
            <Text className="text-[10.5px] text-gray-500 uppercase tracking-[1.2px] mb-1.5"
              style={{ fontFamily: "PlusJakartaSans_700Bold" }}>
              Full name
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Enter teammate's full name"
              placeholderTextColor="#9ca3af"
              className="border border-gray-200 rounded-xl px-3.5 py-3 text-[14.5px] text-gray-900 mb-4"
              autoCapitalize="words"
            />
            <Text className="text-[10.5px] text-gray-500 uppercase tracking-[1.2px] mb-1.5"
              style={{ fontFamily: "PlusJakartaSans_700Bold" }}>
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Where should we send the credentials?"
              placeholderTextColor="#9ca3af"
              className="border border-gray-200 rounded-xl px-3.5 py-3 text-[14.5px] text-gray-900 mb-5"
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-[10.5px] text-gray-500 uppercase tracking-[1.2px]"
                style={{ fontFamily: "PlusJakartaSans_700Bold" }}>
                Password{" "}
                <Text className="text-gray-400" style={{ fontFamily: undefined }}>
                  (optional)
                </Text>
              </Text>
              <Pressable
                onPress={generatePassword}
                hitSlop={8}
              >
                <Text
                  className="text-blue-700"
                  style={{ fontFamily: "PlusJakartaSans_700Bold", fontSize: 11.5 }}
                >
                  Generate
                </Text>
              </Pressable>
            </View>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Leave blank and we'll generate one"
              placeholderTextColor="#9ca3af"
              className="border border-gray-200 rounded-xl px-3.5 py-3 text-[14.5px] text-gray-900 mb-1.5"
              autoCapitalize="none"
              autoCorrect={false}
              style={{ fontFamily: "Menlo", letterSpacing: 0.5 }}
            />
            <Text className="text-[11.5px] text-gray-500 mb-5">
              We&apos;ll email this to your teammate so they can sign in
              right away. Min 6 characters.
            </Text>

            <Text className="text-[10.5px] text-gray-500 uppercase tracking-[1.2px] mb-2"
              style={{ fontFamily: "PlusJakartaSans_700Bold" }}>
              Role preset
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {PERMISSION_PRESETS.map((p) => {
                const active = presetId === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => {
                      haptic();
                      setPresetId(p.id);
                    }}
                    className={`px-3.5 py-2 rounded-full border ${
                      active
                        ? "bg-gray-900 border-gray-900"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <Text
                      className={active ? "text-white" : "text-gray-800"}
                      style={{
                        fontFamily: "PlusJakartaSans_700Bold",
                        fontSize: 12.5,
                      }}
                    >
                      {p.label}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => {
                  haptic();
                  setPresetId("custom");
                  if (customPerms.length === 0) {
                    setCustomPerms([
                      ...(selectedPreset?.permissions ?? []),
                    ]);
                  }
                }}
                className={`px-3.5 py-2 rounded-full border ${
                  isCustom
                    ? "bg-gray-900 border-gray-900"
                    : "bg-white border-gray-200"
                }`}
              >
                <Text
                  className={isCustom ? "text-white" : "text-gray-800"}
                  style={{
                    fontFamily: "PlusJakartaSans_700Bold",
                    fontSize: 12.5,
                  }}
                >
                  Custom
                </Text>
              </Pressable>
            </View>

            {!isCustom && selectedPreset && (
              <View className="bg-gray-50 rounded-xl px-3.5 py-3 mb-4">
                <Text className="text-[12.5px] text-gray-700">
                  {selectedPreset.description}
                </Text>
              </View>
            )}

            {isCustom && (
              <View className="mb-2">
                <PermissionsPicker
                  selected={customPerms}
                  onChange={setCustomPerms}
                />
              </View>
            )}
          </KeyboardScreen>

          <View className="px-5 pt-3 pb-5 border-t border-gray-100">
            <Pressable
              onPress={submit}
              disabled={submitting}
              className={`rounded-xl py-3.5 items-center ${
                submitting ? "bg-gray-400" : "bg-gray-900"
              }`}
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text
                  className="text-white"
                  style={{
                    fontFamily: "PlusJakartaSans_700Bold",
                    fontSize: 14,
                  }}
                >
                  Add teammate
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// --- Edit sheet ---

function EditSheet({
  target,
  onClose,
  onChanged,
  onSuspend,
  onReactivate,
  onRemove,
  onResend,
}: {
  target: StaffMember | null;
  onClose: () => void;
  onChanged: () => void;
  onSuspend: (s: StaffMember) => void;
  onReactivate: (s: StaffMember) => void;
  onRemove: (s: StaffMember) => void;
  onResend: (s: StaffMember) => void;
}) {
  const toast = useToast();
  const [perms, setPerms] = useState<StaffPermission[]>([]);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (target) {
      setPerms(target.permissions as StaffPermission[]);
    }
  }, [target]);

  if (!target) return null;

  const save = async () => {
    try {
      setSaving(true);
      await updateStaffPermissions({
        staffId: target.id,
        permissions: perms,
      });
      toast.show("Permissions updated", { type: "success" });
      onChanged();
    } catch (err: any) {
      toast.show(err?.message || "Couldn't save", { type: "danger" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={!!target}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/50">
        <View
          className="bg-white rounded-t-3xl"
          // Definite height (not maxHeight) — the inner KeyboardScreen
          // uses flex: 1, which collapses to zero inside a content-sized
          // parent. Without this, the form fields would be squeezed out
          // and only the header + last button would render.
          style={{ height: "92%" }}
        >
          <View className="pt-2.5 pb-1 items-center">
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 999,
                backgroundColor: "#d1d5db",
              }}
            />
          </View>
          <View className="px-5 pt-3 pb-3 flex-row items-center justify-between border-b border-gray-100">
            <View className="flex-1 pr-2">
              <Text
                className="text-[16px] text-gray-900"
                style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                numberOfLines={1}
              >
                {target.fullName}
              </Text>
              <Text className="text-[12px] text-gray-500" numberOfLines={1}>
                {target.email}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              className="w-9 h-9 items-center justify-center rounded-full bg-gray-50"
            >
              <Ionicons name="close" size={18} color="#374151" />
            </Pressable>
          </View>

          <ScrollView className="px-5 py-4">
            <PermissionsPicker selected={perms} onChange={setPerms} />

            <View className="mt-6 mb-2 gap-2">
              {/* Show Resend until the staff has actually signed in.
                  Suspended needs Reactivate first; staff who've
                  already signed in would lose their session if we
                  regenerated the password — backend also refuses
                  that case as a hard guard so this is purely UX. */}
              {(target.status === "Pending" ||
                (target.status === "Active" && target.acceptedAt == null)) && (
                <Pressable
                  onPress={() => onResend(target)}
                  className="flex-row items-center justify-center gap-1.5 border border-blue-200 bg-blue-50 rounded-xl py-3"
                >
                  <Ionicons name="send" size={13} color="#1d4ed8" />
                  <Text className="text-blue-700"
                    style={{ fontFamily: "PlusJakartaSans_700Bold", fontSize: 13.5 }}>
                    Send new credentials
                  </Text>
                </Pressable>
              )}
              {target.status === "Suspended" ? (
                <Pressable
                  onPress={() => onReactivate(target)}
                  className="border border-emerald-200 bg-emerald-50 rounded-xl py-3 items-center"
                >
                  <Text className="text-emerald-700"
                    style={{ fontFamily: "PlusJakartaSans_700Bold", fontSize: 13.5 }}>
                    Reactivate access
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => onSuspend(target)}
                  className="border border-gray-200 bg-white rounded-xl py-3 items-center"
                >
                  <Text className="text-gray-700"
                    style={{ fontFamily: "PlusJakartaSans_700Bold", fontSize: 13.5 }}>
                    Suspend access
                  </Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => onRemove(target)}
                className="border border-rose-200 bg-rose-50 rounded-xl py-3 items-center"
              >
                <Text className="text-rose-700"
                  style={{ fontFamily: "PlusJakartaSans_700Bold", fontSize: 13.5 }}>
                  Remove from store
                </Text>
              </Pressable>
            </View>
          </ScrollView>

          <View className="px-5 pt-3 pb-5 border-t border-gray-100">
            <Pressable
              onPress={save}
              disabled={saving}
              className={`rounded-xl py-3.5 items-center ${
                saving ? "bg-gray-400" : "bg-gray-900"
              }`}
            >
              {saving ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text
                  className="text-white"
                  style={{
                    fontFamily: "PlusJakartaSans_700Bold",
                    fontSize: 14,
                  }}
                >
                  Save permissions
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// --- Permissions picker (shared by Invite + Edit sheets) ---

function PermissionsPicker({
  selected,
  onChange,
}: {
  selected: StaffPermission[];
  onChange: (next: StaffPermission[]) => void;
}) {
  const set = useMemo(() => new Set(selected), [selected]);

  const toggle = (key: StaffPermission) => {
    haptic();
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(Array.from(next));
  };

  return (
    <View>
      {PERMISSION_GROUPS.map((g) => (
        <View key={g.label} className="mb-4">
          <Text
            className="text-[10.5px] text-gray-500 uppercase tracking-[1.2px] mb-2 px-1"
            style={{ fontFamily: "PlusJakartaSans_700Bold" }}
          >
            {g.label}
          </Text>
          <View className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            {g.permissions.map((p, i) => {
              const checked = set.has(p.key);
              return (
                <Pressable
                  key={p.key}
                  onPress={() => toggle(p.key)}
                  className={`flex-row items-center px-3.5 py-3 active:bg-gray-50 ${
                    i !== g.permissions.length - 1
                      ? "border-b border-gray-100"
                      : ""
                  }`}
                >
                  <View className="flex-1 pr-3">
                    <Text
                      className="text-[13.5px] text-gray-900"
                      style={{
                        fontFamily: "PlusJakartaSans_700Bold",
                        letterSpacing: -0.1,
                      }}
                    >
                      {p.label}
                    </Text>
                    <Text className="text-[12px] text-gray-500 mt-0.5">
                      {p.description}
                    </Text>
                  </View>
                  <View
                    className={`w-5 h-5 rounded items-center justify-center border ${
                      checked
                        ? "bg-gray-900 border-gray-900"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    {checked && (
                      <Ionicons name="checkmark" size={14} color="white" />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

// --- Credentials reveal ---

interface IssuedCredsShape {
  fullName: string;
  email: string;
  password: string;
  headline: string;
  blurb: string;
}

/**
 * One-shot sheet that surfaces the freshly-issued password right
 * after Invite / Resend, so the vendor can copy + share it via
 * WhatsApp / SMS even if the email gets delayed. Same pattern most
 * platforms use to expose a generated API key: the value isn't
 * recoverable after dismiss, only by regenerating.
 */
function CredentialsModal({
  visible,
  creds,
  onClose,
}: {
  visible: boolean;
  creds: IssuedCredsShape | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const [copied, setCopied] = useState<"email" | "password" | "both" | null>(
    null,
  );

  React.useEffect(() => {
    if (!visible) setCopied(null);
  }, [visible]);

  if (!visible || !creds) return null;

  const copy = (
    kind: "email" | "password" | "both",
    text: string,
  ) => {
    try {
      Clipboard.setString(text);
      haptic();
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.show("Couldn't copy — copy manually instead.", { type: "danger" });
    }
  };

  const both =
    `Sign in to Orderly\n` +
    `Email: ${creds.email}\n` +
    `Password: ${creds.password}`;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/50 px-5">
        <View className="bg-white rounded-3xl w-full max-w-[440px] overflow-hidden">
          <View className="px-5 pt-4 pb-3 border-b border-gray-100">
            <View className="flex-row items-center gap-2">
              <Ionicons name="mail" size={16} color="#2563eb" />
              <Text
                className="text-[14.5px] text-gray-900"
                style={{ fontFamily: "PlusJakartaSans_700Bold" }}
              >
                {creds.headline}
              </Text>
            </View>
            <Text className="text-[12.5px] text-gray-500 mt-1 leading-[17px]">
              {creds.blurb}
            </Text>
          </View>

          <View className="px-5 py-4 gap-3">
            <View>
              <Text
                className="text-[10.5px] text-gray-500 uppercase tracking-[1.2px] mb-1.5"
                style={{ fontFamily: "PlusJakartaSans_700Bold" }}
              >
                Email
              </Text>
              <View className="flex-row items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
                <Text className="flex-1 text-[13.5px] text-gray-900" numberOfLines={1}>
                  {creds.email}
                </Text>
                <Pressable
                  onPress={() => copy("email", creds.email)}
                  hitSlop={6}
                  className="bg-white rounded-md px-2.5 py-1"
                >
                  <Text
                    className="text-gray-700"
                    style={{ fontFamily: "PlusJakartaSans_700Bold", fontSize: 11 }}
                  >
                    {copied === "email" ? "Copied" : "Copy"}
                  </Text>
                </Pressable>
              </View>
            </View>

            <View>
              <Text
                className="text-[10.5px] text-gray-500 uppercase tracking-[1.2px] mb-1.5"
                style={{ fontFamily: "PlusJakartaSans_700Bold" }}
              >
                Password
              </Text>
              <View className="flex-row items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
                <Text
                  className="flex-1 text-[14px] text-gray-900"
                  numberOfLines={1}
                  style={{ fontFamily: "Menlo", letterSpacing: 0.5 }}
                >
                  {creds.password}
                </Text>
                <Pressable
                  onPress={() => copy("password", creds.password)}
                  hitSlop={6}
                  className="bg-white rounded-md px-2.5 py-1"
                >
                  <Text
                    className="text-gray-700"
                    style={{ fontFamily: "PlusJakartaSans_700Bold", fontSize: 11 }}
                  >
                    {copied === "password" ? "Copied" : "Copy"}
                  </Text>
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={() => copy("both", both)}
              className="flex-row items-center justify-center gap-2 bg-gray-900 rounded-xl py-3 active:bg-gray-800"
            >
              <Ionicons name="copy-outline" size={14} color="#ffffff" />
              <Text
                className="text-white"
                style={{ fontFamily: "PlusJakartaSans_700Bold", fontSize: 13.5 }}
              >
                {copied === "both" ? "Copied — share it!" : "Copy email + password"}
              </Text>
            </Pressable>
          </View>

          <View className="px-5 py-3 border-t border-gray-100 bg-gray-50/60 items-end">
            <Pressable
              onPress={onClose}
              className="bg-white rounded-lg px-3.5 py-1.5"
            >
              <Text
                className="text-gray-700"
                style={{ fontFamily: "PlusJakartaSans_700Bold", fontSize: 12.5 }}
              >
                Done
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
