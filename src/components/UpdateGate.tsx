import { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ActivityIndicator,
} from "react-native";
import { useVersionGate } from "../hooks/useVersionGate";

const BRAND = "#0080ff";

/**
 * Renders the force-update UI on top of the app.
 * - "hard": full-screen, non-dismissable. The user must update to continue.
 * - "soft": dismissable card nudging an update.
 * - "none"/checking: renders nothing.
 * Drop this once near the app root, AFTER the navigator, so it overlays.
 */
export default function UpdateGate() {
  const { action, storeUrl, message, checking } = useVersionGate();
  const [softDismissed, setSoftDismissed] = useState(false);

  const openStore = () => {
    if (storeUrl) Linking.openURL(storeUrl).catch(() => {});
  };

  if (checking) return null;

  if (action === "hard") {
    return (
      <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <Text style={styles.title}>Update required</Text>
            <Text style={styles.body}>
              {message ||
                "This version of Orderly is no longer supported. Please update to keep using the app."}
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={openStore} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Update now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  if (action === "soft" && !softDismissed) {
    return (
      <Modal visible transparent animationType="slide" onRequestClose={() => setSoftDismissed(true)}>
        <View style={styles.softBackdrop}>
          <View style={styles.card}>
            <Text style={styles.title}>Update available</Text>
            <Text style={styles.body}>
              {message ||
                "A new version of Orderly is available with the latest improvements."}
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={openStore} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Update</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setSoftDismissed(true)}>
              <Text style={styles.secondaryBtnText}>Maybe later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(10,61,143,0.96)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  softBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
    padding: 16,
  },
  card: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0b1220",
    marginBottom: 10,
    fontFamily: "PlusJakartaSans_700Bold",
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: "#475569",
    marginBottom: 20,
    fontFamily: "PlusJakartaSans_400Regular",
  },
  primaryBtn: {
    backgroundColor: BRAND,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
  },
  secondaryBtn: {
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: "#64748b",
    fontSize: 15,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
});
