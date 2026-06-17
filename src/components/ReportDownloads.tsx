import { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { useToast } from "react-native-toast-notifications";

import { apiClient } from "../api/client";
import { getAuthToken } from "../api/setAuthToken";

/**
 * Premium report-download control. Choose a report type and period, then
 * tap a format — opens the file in the in-app browser, authenticated via
 * the `?access_token=` the /insights/report endpoints accept (no native
 * file/sharing modules). Designed minimal + classy.
 */

type Period = "weekly" | "monthly";
interface Opt {
  value: string;
  label: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const startOfWeek = (d: Date) => {
  const x = new Date(d);
  const diff = (7 + (x.getDay() - 1)) % 7;
  x.setDate(x.getDate() - diff);
  x.setHours(0, 0, 0, 0);
  return x;
};

const monthOpts = (): Opt[] => {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return {
      value: iso(d),
      label: d.toLocaleDateString(undefined, { month: "short", year: "numeric" }),
    };
  });
};

const weekOpts = (): Opt[] => {
  const monday = startOfWeek(new Date());
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  return Array.from({ length: 8 }, (_, i) => {
    const start = new Date(monday);
    start.setDate(start.getDate() - 7 * i);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { value: iso(start), label: `${fmt(start)} – ${fmt(end)}` };
  });
};

const cardShadow = {
  shadowColor: "#0f172a",
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.06,
  shadowRadius: 14,
  elevation: 2,
} as const;

const brandShadow = {
  shadowColor: "#0080ff",
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.28,
  shadowRadius: 12,
  elevation: 3,
} as const;

function Label({ children }: { children: string }) {
  return (
    <Text className="uppercase text-[11px] font-bold tracking-[2px] text-gray-400 mb-3 ml-0.5">
      {children}
    </Text>
  );
}

export default function ReportDownloads() {
  const toast = useToast();
  const [period, setPeriod] = useState<Period>("monthly");
  const months = useMemo(monthOpts, []);
  const weeks = useMemo(weekOpts, []);
  const [monthVal, setMonthVal] = useState(months[1]?.value ?? months[0]?.value);
  const [weekVal, setWeekVal] = useState(weeks[1]?.value ?? weeks[0]?.value);
  const [busy, setBusy] = useState<"pdf" | "xlsx" | null>(null);

  const opts = period === "monthly" ? months : weeks;
  const selected = period === "monthly" ? monthVal : weekVal;
  const setSelected = period === "monthly" ? setMonthVal : setWeekVal;

  const download = async (format: "pdf" | "xlsx") => {
    const token = getAuthToken();
    if (!token) {
      toast.show("Please sign in again", { type: "warning" });
      return;
    }
    if (Platform.OS === "ios") Haptics.selectionAsync().catch(() => {});
    setBusy(format);
    try {
      const base = apiClient.defaults.baseURL ?? "https://api.orderlystores.com/api";
      const url =
        `${base}/insights/report/${period}/${format}` +
        `?date=${selected}&access_token=${encodeURIComponent(token)}`;
      await WebBrowser.openBrowserAsync(url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        controlsColor: "#0080ff",
      });
    } catch {
      toast.show("Couldn't open the report", { type: "danger" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <View className="px-5">
      {/* Report type */}
      <Label>Report type</Label>
      <View className="flex-row bg-gray-100 rounded-2xl p-1 mb-8">
        {(["weekly", "monthly"] as const).map((p) => {
          const active = period === p;
          return (
            <Pressable
              key={p}
              onPress={() => setPeriod(p)}
              className={`flex-1 items-center py-2.5 rounded-xl ${active ? "bg-white" : ""}`}
              style={active ? cardShadow : undefined}
            >
              <Text
                className={`text-[13.5px] font-bold capitalize ${
                  active ? "text-gray-900" : "text-gray-400"
                }`}
              >
                {p}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Period */}
      <Label>{period === "monthly" ? "Month" : "Week"}</Label>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-8 -mx-5"
        contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}
      >
        {opts.map((o) => {
          const active = o.value === selected;
          return (
            <Pressable
              key={o.value}
              onPress={() => setSelected(o.value)}
              className={`px-4 py-2.5 rounded-2xl ${
                active ? "bg-[#0080ff]" : "bg-white border border-gray-200/80"
              }`}
              style={active ? brandShadow : undefined}
            >
              <Text
                className={`text-[12.5px] font-bold ${active ? "text-white" : "text-gray-600"}`}
              >
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Download as */}
      <Label>Download as</Label>
      <View style={{ gap: 12 }}>
        <FormatRow
          tileBg="bg-blue-50"
          icon="document-text"
          iconColor="#0080ff"
          title="PDF document"
          subtitle="Best for sharing & printing"
          loading={busy === "pdf"}
          dim={busy !== null && busy !== "pdf"}
          onPress={() => download("pdf")}
        />
        <FormatRow
          tileBg="bg-emerald-50"
          icon="grid"
          iconColor="#059669"
          title="Excel spreadsheet"
          subtitle="Best for your own analysis"
          loading={busy === "xlsx"}
          dim={busy !== null && busy !== "xlsx"}
          onPress={() => download("xlsx")}
        />
      </View>
    </View>
  );
}

function FormatRow({
  tileBg,
  icon,
  iconColor,
  title,
  subtitle,
  loading,
  dim,
  onPress,
}: {
  tileBg: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  subtitle: string;
  loading: boolean;
  dim: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading || dim}
      className="flex-row items-center bg-white rounded-2xl border border-gray-100 p-4"
      style={[cardShadow, dim ? { opacity: 0.5 } : null]}
    >
      <View className={`w-11 h-11 rounded-2xl items-center justify-center ${tileBg}`}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View className="flex-1 ml-3.5">
        <Text className="text-[15px] font-extrabold text-gray-900 tracking-tight">
          {title}
        </Text>
        <Text className="text-[12px] text-gray-500 mt-0.5">{subtitle}</Text>
      </View>
      {loading ? (
        <ActivityIndicator size="small" color="#0080ff" />
      ) : (
        <Ionicons name="arrow-down-circle" size={26} color="#cbd5e1" />
      )}
    </Pressable>
  );
}
