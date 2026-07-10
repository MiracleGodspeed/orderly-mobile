import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Platform,
  TouchableOpacity,
} from "react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import LinearGradient from "react-native-linear-gradient";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { RootStackParamList } from "../navigation/types";
import { getStorePerformanceReport } from "../api/vendor/vendor.api";
import { getExpenseRangeSummary } from "../api/vendor/invoice.api";
import { rangeForKey, type RangeKey } from "../lib/dateRanges";
import {
  BestSellingProduct,
  TopCustomer,
  StorePerformanceReportData,
} from "../api/vendor/vendor.types";
import { CustomDateRangeModal } from "../components/CustomDateRangeModal";

type ScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "ReportsAnalytics"
>;

interface Props {
  navigation: ScreenNavigationProp;
}

type AnalyticsView = "sales" | "growth" | "customers";
// Calendar-anchored periods, matching the web Reports screen and the
// mobile Home duration picker. "custom" defers the {from, to} bounds to
// user-picked dates from the date-range modal.
type Period = RangeKey;

const PERIODS: { label: string; value: Period }[] = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "This week", value: "thisweek" },
  { label: "Last week", value: "lastweek" },
  { label: "This month", value: "thismonth" },
  { label: "Last month", value: "lastmonth" },
  { label: "Last year", value: "lastyear" },
  { label: "Custom", value: "custom" },
];

// ---- Formatting helpers ----------------------------------------------------

const formatCurrency = (n: number | null | undefined) =>
  `₦${(n ?? 0).toLocaleString("en-NG")}`;

const compactCurrency = (n: number | null | undefined): string => {
  const v = n ?? 0;
  if (v >= 1_000_000) return `₦${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `₦${(v / 1_000).toFixed(1)}k`;
  return `₦${v}`;
};

const calculateGrowthPct = (current: number, previous: number): number => {
  if (!isFinite(previous) || previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return ((current - previous) / Math.abs(previous)) * 100;
};

const haptic = () => {
  if (Platform.OS === "ios") {
    Haptics.selectionAsync().catch(() => {});
  }
};

const fmtShortDate = (d: Date) =>
  d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

const periodLabel = (
  p: Period,
  customFrom?: Date | null,
  customTo?: Date | null
): string => {
  if (p === "custom") {
    if (customFrom && customTo) {
      return `${fmtShortDate(customFrom)} – ${fmtShortDate(customTo)}`;
    }
    return "custom range";
  }
  const labels: Record<Exclude<Period, "custom">, string> = {
    today: "today",
    yesterday: "yesterday",
    thisweek: "this week",
    thismonth: "this month",
    lastweek: "last week",
    lastmonth: "last month",
    lastyear: "last year",
  };
  return labels[p];
};

// ---- Screen ----------------------------------------------------------------

export default function ReportsAnalytics({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [activeView, setActiveView] = useState<AnalyticsView>("sales");
  const [period, setPeriod] = useState<Period>("thismonth");
  const [data, setData] = useState<StorePerformanceReportData | null>(null);
  const [expensesTotal, setExpensesTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Custom-range state — only used when `period === "custom"`. Default
  // to a 30-day rolling window so the picker has sensible initial
  // values whenever the user first taps Custom.
  const [customFrom, setCustomFrom] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [customTo, setCustomTo] = useState<Date>(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  });
  const [customModalVisible, setCustomModalVisible] = useState(false);

  // Resolves a calendar preset ("today" / "thismonth" / … / "custom")
  // into the precise `{from, to}` window the backend expects.
  // Centralising this keeps `fetchReport` and `onRefresh` in lockstep —
  // there's no way for the two to drift on, say, end-of-day handling.
  const resolveWindow = useCallback(
    (
      p: Period,
      cFrom: Date,
      cTo: Date
    ): { from: Date; to: Date } => {
      if (p === "custom") {
        // Re-normalise bounds so the picker's date-only selection
        // captures the entire start-day and end-day in local time.
        const from = new Date(cFrom);
        from.setHours(0, 0, 0, 0);
        const to = new Date(cTo);
        to.setHours(23, 59, 59, 999);
        return { from, to };
      }
      // Calendar preset — shared with Home and the web Reports screen.
      return rangeForKey(p);
    },
    []
  );

  const fetchReport = useCallback(
    async (p: Period, cFrom: Date, cTo: Date, isRefresh = false) => {
      if (!isRefresh) setLoading(true);
      try {
        const { from, to } = resolveWindow(p, cFrom, cTo);
        // Revenue report + matching-window expenses in parallel, so the
        // hero can show Revenue → Expenses → Net profit for the SAME
        // period. Expenses failing must not blank out the whole screen.
        const [result, expenseSummary] = await Promise.all([
          getStorePerformanceReport(from.toISOString(), to.toISOString()),
          getExpenseRangeSummary(from.toISOString(), to.toISOString()).catch(
            () => ({ total: 0, byCategory: [] })
          ),
        ]);
        setData(result);
        setExpensesTotal(expenseSummary?.total ?? 0);
      } catch (error) {
        console.error("Failed to fetch report:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [resolveWindow]
  );

  useEffect(() => {
    fetchReport(period, customFrom, customTo);
  }, [period, customFrom, customTo, fetchReport]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReport(period, customFrom, customTo, true);
  }, [period, customFrom, customTo, fetchReport]);

  const handlePeriodTap = (p: Period) => {
    haptic();
    if (p === "custom") {
      // Tapping "Custom" always opens the picker — even if `custom` is
      // already the active preset — so the vendor can adjust the
      // window without first switching to another preset and back.
      setCustomModalVisible(true);
      return;
    }
    if (p === period) return;
    setPeriod(p);
  };

  const handleCustomApply = useCallback((from: Date, to: Date) => {
    haptic();
    setCustomFrom(from);
    setCustomTo(to);
    setPeriod("custom");
    setCustomModalVisible(false);
  }, []);

  // ---- Derived metrics -----------------------------------------------------

  const sales = data?.sales;
  const totalRevenue = sales?.totalRevenue ?? 0;
  const netProfit = totalRevenue - expensesTotal;
  const totalOrders = sales?.totalOrders ?? 0;
  const totalCustomers = sales?.totalCustomers ?? 0;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const revenuePerCustomer =
    totalCustomers > 0 ? Math.round(totalRevenue / totalCustomers) : 0;
  const ordersPerCustomer =
    totalCustomers > 0 ? totalOrders / totalCustomers : 0;
  const totalVisits = sales?.totalVisits ?? 0;

  // Period-over-period revenue delta for the hero — the signature analytics
  // "▲ 12% vs last month" cue. Only presets with a clean immediate predecessor
  // in `growthTrend` qualify; other ranges hide the badge rather than invent a
  // comparison. No extra network cost — this reuses growthTrend.
  const heroDelta = useMemo(() => {
    const t = data?.growthTrend;
    if (!t) return null;
    const pairs: Partial<
      Record<Period, { cur: number; prev: number; label: string }>
    > = {
      today: { cur: t.today.totalRevenue, prev: t.yesterday.totalRevenue, label: "yesterday" },
      thisweek: { cur: t.currentWeek.totalRevenue, prev: t.lastWeek.totalRevenue, label: "last week" },
      thismonth: { cur: t.currentMonth.totalRevenue, prev: t.lastMonth.totalRevenue, label: "last month" },
    };
    const pair = pairs[period];
    if (!pair) return null;
    return { pct: calculateGrowthPct(pair.cur, pair.prev), label: pair.label };
  }, [data?.growthTrend, period]);

  const bestSellers = useMemo<BestSellingProduct[]>(
    () => sales?.bestSellingProducts ?? [],
    [sales?.bestSellingProducts]
  );
  const topProduct = bestSellers[0];

  const topCustomers = useMemo<TopCustomer[]>(
    () => sales?.topCustomers ?? [],
    [sales?.topCustomers]
  );

  // ---- Render --------------------------------------------------------------

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />

      {/* Top bar */}
      <View className="px-6 pt-4 pb-2 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          className="w-10 h-10 bg-white border border-gray-200 rounded-full items-center justify-center"
        >
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <Text
          className="text-[16px] text-gray-900"
          style={{ fontFamily: "PlusJakartaSans_700Bold" }}
        >
          Analytics
        </Text>
        <View className="w-10 h-10" />
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2563eb"
          />
        }
      >
        {/* Hero card — keeps it scannable. The big number is the headline. */}
        <View
          className="mx-5 mt-3 rounded-3xl overflow-hidden"
          style={{ backgroundColor: "#0f172a" }}
        >
          <View
            style={{
              position: "absolute",
              top: -50,
              right: -50,
              width: 180,
              height: 180,
              borderRadius: 90,
              backgroundColor: "rgba(96, 165, 250, 0.18)",
            }}
          />
          <View
            style={{
              position: "absolute",
              bottom: -40,
              left: -30,
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: "rgba(96, 165, 250, 0.10)",
            }}
          />

          <View className="p-5">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-[10.5px] font-extrabold text-blue-200 uppercase tracking-[1.4px]">
                Revenue · {periodLabel(period, customFrom, customTo)}
              </Text>
              <View className="w-9 h-9 rounded-xl bg-blue-500/20 items-center justify-center border border-blue-400/30">
                <Ionicons name="trending-up" size={16} color="#bfdbfe" />
              </View>
            </View>
            <Text
              className="text-white"
              style={{
                fontFamily: "PlusJakartaSans_700Bold",
                fontSize: 32,
                letterSpacing: -1,
              }}
            >
              {loading ? "—" : formatCurrency(totalRevenue)}
            </Text>

            {!loading && heroDelta && (
              <View className="flex-row items-center gap-2 mt-2.5">
                <View
                  className="flex-row items-center gap-1 px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor:
                      heroDelta.pct >= 0 ? "rgba(52,211,153,0.18)" : "rgba(248,113,113,0.18)",
                  }}
                >
                  <Ionicons
                    name={heroDelta.pct >= 0 ? "arrow-up" : "arrow-down"}
                    size={11}
                    color={heroDelta.pct >= 0 ? "#6ee7b7" : "#fca5a5"}
                  />
                  <Text
                    className="text-[11.5px] font-extrabold"
                    style={{ color: heroDelta.pct >= 0 ? "#6ee7b7" : "#fca5a5" }}
                  >
                    {Math.abs(heroDelta.pct).toFixed(1)}%
                  </Text>
                </View>
                <Text className="text-blue-100/60 text-[11.5px]">
                  vs {heroDelta.label}
                </Text>
              </View>
            )}

            <View className="flex-row items-center gap-3 mt-2">
              <Text className="text-blue-100/80 text-[12px]">
                {totalOrders.toLocaleString()} orders
              </Text>
              <Text className="text-blue-100/40 text-[10px]">·</Text>
              <Text className="text-blue-100/80 text-[12px]">
                {totalCustomers.toLocaleString()} customers
              </Text>
            </View>

            {/* Revenue → Expenses → Profit for the selected period, so
                the hero tells the whole money story, not just sales. */}
            <View className="flex-row mt-4 pt-4 border-t border-white/10">
              <HeroMoneyStat
                label="Revenue"
                value={loading ? "—" : formatCurrency(totalRevenue)}
                valueColor="#ffffff"
              />
              <HeroMoneyStat
                label="Expenses"
                value={loading ? "—" : `-${formatCurrency(expensesTotal)}`}
                valueColor="#fcd34d"
              />
              <HeroMoneyStat
                label="Net profit"
                value={loading ? "—" : formatCurrency(netProfit)}
                valueColor={netProfit >= 0 ? "#6ee7b7" : "#fca5a5"}
              />
            </View>
          </View>
        </View>

        {/* Period pills */}
        <View className="mt-4">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
          >
            {PERIODS.map((p) => {
              const isActive = period === p.value;
              return (
                <Pressable
                  key={p.value}
                  onPress={() => handlePeriodTap(p.value)}
                  className={`px-4 py-2 rounded-full border ${
                    isActive
                      ? "bg-gray-900 border-gray-900"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <Text
                    className={`text-[12.5px] font-extrabold ${
                      isActive ? "text-white" : "text-gray-700"
                    }`}
                  >
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Edge fades — let pills dissolve into the background at the
              screen edges instead of hard-cutting against them, so the rail
              keeps the same 20px breathing room the cards respect. */}
          <LinearGradient
            pointerEvents="none"
            colors={["#f9fafb", "rgba(249,250,251,0)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 24 }}
          />
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(249,250,251,0)", "#f9fafb"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 24 }}
          />
        </View>

        {/* Traffic & conversion — a top-level, period-driven metric shown
            above the view tabs so it stays visible on every tab, just like
            the hero. Waits for data so it never flashes an empty funnel. */}
        {!loading && (
          <View className="px-5 mt-4">
            <ConversionCard
              visits={totalVisits}
              orders={totalOrders}
              revenue={totalRevenue}
            />
          </View>
        )}

        {/* View tabs (Sales / Growth / Customers) */}
        <View className="mx-5 mt-4 bg-white rounded-2xl border border-gray-100 p-1 flex-row">
          {(
            [
              { id: "sales", label: "Sales", icon: "cash-outline" as const },
              { id: "growth", label: "Growth", icon: "trending-up-outline" as const },
              {
                id: "customers",
                label: "Customers",
                icon: "people-outline" as const,
              },
            ] as { id: AnalyticsView; label: string; icon: keyof typeof Ionicons.glyphMap }[]
          ).map((tab) => {
            const isActive = activeView === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => {
                  haptic();
                  setActiveView(tab.id);
                }}
                className={`flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl ${
                  isActive ? "bg-blue-600" : ""
                }`}
              >
                <Ionicons
                  name={tab.icon}
                  size={14}
                  color={isActive ? "white" : "#6b7280"}
                />
                <Text
                  className={`text-[12.5px] font-extrabold ${
                    isActive ? "text-white" : "text-gray-600"
                  }`}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Body */}
        <View className="px-5 mt-4">
          {loading ? (
            <View className="bg-white rounded-3xl border border-gray-100 p-12 items-center justify-center">
              <ActivityIndicator size="small" color="#2563eb" />
              <Text className="text-[12.5px] text-gray-500 mt-2 font-semibold">
                Loading your numbers…
              </Text>
            </View>
          ) : (
            <>
              {activeView === "sales" && (
                <SalesView
                  totalRevenue={totalRevenue}
                  expensesTotal={expensesTotal}
                  netProfit={netProfit}
                  totalOrders={totalOrders}
                  totalCustomers={totalCustomers}
                  avgOrderValue={avgOrderValue}
                  topProduct={topProduct}
                  bestSellers={bestSellers}
                  period={period}
                  customFromLabel={customFrom}
                  customToLabel={customTo}
                />
              )}
              {activeView === "growth" && (
                <GrowthView data={data} />
              )}
              {activeView === "customers" && (
                <CustomersView
                  totalCustomers={totalCustomers}
                  revenuePerCustomer={revenuePerCustomer}
                  ordersPerCustomer={ordersPerCustomer}
                  topCustomers={topCustomers}
                  period={period}
                  customFromLabel={customFrom}
                  customToLabel={customTo}
                />
              )}
            </>
          )}
        </View>

      </ScrollView>

      {/* Sticky download CTA — pinned below the scroll so it's on screen
          the moment the page opens. Spelled out in plain words (not just
          an icon) so every vendor knows exactly what it does. */}
      <View
        className="px-5 pt-3 bg-white border-t border-gray-100"
        style={{ paddingBottom: Math.max(insets.bottom, 14) }}
      >
        <TouchableOpacity
          onPress={() => {
            haptic();
            navigation.navigate("ReportDownload");
          }}
          activeOpacity={0.85}
          className="flex-row items-center justify-center gap-2 bg-blue-600 rounded-2xl py-4"
          accessibilityLabel="Download a report"
        >
          <Ionicons name="download-outline" size={18} color="white" />
          <Text
            className="text-white text-[15px]"
            style={{ fontFamily: "PlusJakartaSans_700Bold" }}
          >
            Download a report
          </Text>
        </TouchableOpacity>
        <Text className="text-[11px] text-gray-400 text-center mt-1.5">
          Branded PDF or Excel — any week or month
        </Text>
      </View>

      {/* Custom-range picker — opens when the vendor taps the "Custom"
          period pill (or taps it again to adjust). Re-uses the same
          modal Home uses, so the vendor sees a consistent UI for date
          ranges across the app. */}
      <CustomDateRangeModal
        visible={customModalVisible}
        onClose={() => setCustomModalVisible(false)}
        onBack={() => setCustomModalVisible(false)}
        initialFrom={customFrom}
        initialTo={customTo}
        onApply={handleCustomApply}
      />
    </SafeAreaView>
  );
}

// ---- Views -----------------------------------------------------------------

function SalesView({
  totalRevenue,
  expensesTotal,
  netProfit,
  totalOrders,
  totalCustomers,
  avgOrderValue,
  topProduct,
  bestSellers,
  period,
  customFromLabel,
  customToLabel,
}: {
  totalRevenue: number;
  expensesTotal: number;
  netProfit: number;
  totalOrders: number;
  totalCustomers: number;
  avgOrderValue: number;
  topProduct: BestSellingProduct | undefined;
  bestSellers: BestSellingProduct[];
  period: Period;
  customFromLabel: Date;
  customToLabel: Date;
}) {
  return (
    <View>
      {/* KPI grid */}
      <View className="flex-row gap-3 mb-3">
        <KpiTile
          icon="cash-outline"
          tint="#dbeafe"
          iconColor="#2563eb"
          label="Revenue"
          value={compactCurrency(totalRevenue)}
        />
        <KpiTile
          icon="wallet-outline"
          tint="#fef3c7"
          iconColor="#d97706"
          label="Expenses"
          value={compactCurrency(expensesTotal)}
        />
      </View>
      <View className="flex-row gap-3 mb-3">
        <KpiTile
          icon="trending-up-outline"
          tint={netProfit >= 0 ? "#d1fae5" : "#fee2e2"}
          iconColor={netProfit >= 0 ? "#059669" : "#dc2626"}
          label="Net profit"
          value={compactCurrency(netProfit)}
        />
        <KpiTile
          icon="cart-outline"
          tint="#e0e7ff"
          iconColor="#4f46e5"
          label="Orders"
          value={totalOrders.toLocaleString()}
        />
      </View>
      <View className="flex-row gap-3 mb-4">
        <KpiTile
          icon="people-outline"
          tint="#f3e8ff"
          iconColor="#9333ea"
          label="Customers"
          value={totalCustomers.toLocaleString()}
        />
        <KpiTile
          icon="trophy-outline"
          tint="#ede9fe"
          iconColor="#7c3aed"
          label="Avg order"
          value={compactCurrency(avgOrderValue)}
        />
      </View>

      {/* Top performer hero — only when there's a real winner */}
      {topProduct ? (
        <View
          className="rounded-3xl overflow-hidden mb-4"
          style={{ backgroundColor: "#1e293b" }}
        >
          <View
            style={{
              position: "absolute",
              top: -30,
              right: -30,
              width: 130,
              height: 130,
              borderRadius: 65,
              backgroundColor: "rgba(245, 158, 11, 0.20)",
            }}
          />
          <View className="p-5">
            <View className="flex-row items-start gap-3">
              <View className="w-10 h-10 rounded-xl bg-amber-500/20 items-center justify-center border border-amber-400/40">
                <Ionicons name="trophy" size={18} color="#fbbf24" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-[10.5px] font-extrabold text-amber-300 uppercase tracking-[1.4px]">
                  Top performer
                </Text>
                <Text
                  className="text-white text-[18px] mt-0.5"
                  style={{
                    fontFamily: "PlusJakartaSans_700Bold",
                    letterSpacing: -0.4,
                  }}
                  numberOfLines={1}
                >
                  {topProduct.productName}
                </Text>
                <View className="flex-row items-center gap-2 mt-1.5">
                  <Text className="text-amber-100/85 text-[12px] font-bold">
                    {topProduct.totalQuantitySold} sold
                  </Text>
                  <Text className="text-amber-100/40 text-[10px]">·</Text>
                  <Text className="text-amber-100/85 text-[12px] font-bold">
                    {compactCurrency(
                      topProduct.totalQuantitySold * topProduct.unitPrice
                    )}{" "}
                    revenue
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      ) : null}

      {/* Top products list */}
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
        <View className="px-5 py-4 border-b border-gray-100">
          <Text className="text-[14px] font-extrabold text-gray-900">
            Top products
          </Text>
          <Text className="text-[12px] text-gray-500 mt-0.5">
            Best sellers in {periodLabel(period, customFromLabel, customToLabel)}
          </Text>
        </View>

        {bestSellers.length === 0 ? (
          <View className="px-5 py-12 items-center">
            <View className="w-12 h-12 rounded-2xl bg-gray-50 items-center justify-center mb-2">
              <Ionicons name="cube-outline" size={20} color="#9ca3af" />
            </View>
            <Text className="text-[13px] text-gray-500">
              No sales yet in this period
            </Text>
            <Text className="text-[11.5px] text-gray-400 mt-1 text-center max-w-[240px]">
              Once orders start coming in, your best sellers will show up here.
            </Text>
          </View>
        ) : (
          bestSellers.map((p, i) => (
            <RankedProductRow
              key={p.productId || `${p.productName}-${i}`}
              rank={i + 1}
              product={p}
              isLast={i === bestSellers.length - 1}
            />
          ))
        )}
      </View>
    </View>
  );
}

function GrowthView({
  data,
}: {
  data: StorePerformanceReportData | null;
}) {
  const trend = data?.growthTrend;

  const items = [
    {
      title: "Today vs yesterday",
      icon: "today-outline" as const,
      tint: "#dbeafe",
      iconColor: "#2563eb",
      current: trend?.today?.totalRevenue ?? 0,
      previous: trend?.yesterday?.totalRevenue ?? 0,
    },
    {
      title: "This week vs last week",
      icon: "calendar-outline" as const,
      tint: "#d1fae5",
      iconColor: "#059669",
      current: trend?.currentWeek?.totalRevenue ?? 0,
      previous: trend?.lastWeek?.totalRevenue ?? 0,
    },
    {
      title: "This month vs last month",
      icon: "calendar-clear-outline" as const,
      tint: "#ede9fe",
      iconColor: "#7c3aed",
      current: trend?.currentMonth?.totalRevenue ?? 0,
      previous: trend?.lastMonth?.totalRevenue ?? 0,
    },
    {
      title: "This year vs last year",
      icon: "ribbon-outline" as const,
      tint: "#fef3c7",
      iconColor: "#d97706",
      current: trend?.currentYear?.totalRevenue ?? 0,
      previous: trend?.lastYear?.totalRevenue ?? 0,
    },
  ];

  return (
    <View className="gap-3">
      <View
        className="bg-white rounded-3xl border border-gray-100 p-5 flex-row items-center gap-3"
        style={{
          shadowColor: "#0f172a",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 12,
          elevation: 2,
        }}
      >
        <View className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 items-center justify-center">
          <Ionicons name="trending-up" size={20} color="#2563eb" />
        </View>
        <View className="flex-1 min-w-0">
          <Text
            className="text-[14.5px] text-gray-900"
            style={{ fontFamily: "PlusJakartaSans_700Bold" }}
          >
            Growth & comparisons
          </Text>
          <Text className="text-[12px] text-gray-500 mt-0.5 leading-[18px]">
            How this period compares to the one before — at a glance.
          </Text>
        </View>
      </View>

      {items.map((item) => (
        <GrowthCard key={item.title} {...item} />
      ))}
    </View>
  );
}

function CustomersView({
  totalCustomers,
  revenuePerCustomer,
  ordersPerCustomer,
  topCustomers,
  period,
  customFromLabel,
  customToLabel,
}: {
  totalCustomers: number;
  revenuePerCustomer: number;
  ordersPerCustomer: number;
  topCustomers: TopCustomer[];
  period: Period;
  customFromLabel?: Date | null;
  customToLabel?: Date | null;
}) {
  const topCustomer = topCustomers[0];
  return (
    <View className="gap-3">
      {/* Headline customers card */}
      <View
        className="rounded-3xl overflow-hidden p-5"
        style={{ backgroundColor: "#0c4a6e" }}
      >
        <View
          style={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 140,
            height: 140,
            borderRadius: 70,
            backgroundColor: "rgba(125, 211, 252, 0.18)",
          }}
        />
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-[10.5px] font-extrabold text-cyan-200 uppercase tracking-[1.4px]">
              Customers reached
            </Text>
            <Text
              className="text-white mt-1"
              style={{
                fontFamily: "PlusJakartaSans_700Bold",
                fontSize: 34,
                letterSpacing: -1,
              }}
            >
              {totalCustomers.toLocaleString()}
            </Text>
          </View>
          <View className="w-12 h-12 rounded-2xl bg-cyan-400/20 items-center justify-center border border-cyan-300/30">
            <Ionicons name="people" size={22} color="#bae6fd" />
          </View>
        </View>
      </View>

      {/* Per-customer derived insights */}
      <View className="flex-row gap-3">
        <KpiTile
          icon="cash-outline"
          tint="#dbeafe"
          iconColor="#2563eb"
          label="Revenue / customer"
          value={compactCurrency(revenuePerCustomer)}
        />
        <KpiTile
          icon="cart-outline"
          tint="#fce7f3"
          iconColor="#db2777"
          label="Orders / customer"
          value={ordersPerCustomer.toFixed(1)}
        />
      </View>

      {/* Top customer hero — mirrors the "Top performer" card on the
          Sales view so the two tabs feel like siblings. Only shows when
          there's a real winner to celebrate. */}
      {topCustomer ? (
        <View
          className="rounded-3xl overflow-hidden mt-1"
          style={{ backgroundColor: "#1e293b" }}
        >
          <View
            style={{
              position: "absolute",
              top: -30,
              right: -30,
              width: 130,
              height: 130,
              borderRadius: 65,
              backgroundColor: "rgba(6, 182, 212, 0.20)",
            }}
          />
          <View className="p-5">
            <View className="flex-row items-start gap-3">
              <View className="w-10 h-10 rounded-xl bg-cyan-500/20 items-center justify-center border border-cyan-400/40">
                <Ionicons name="star" size={18} color="#22d3ee" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-[10.5px] font-extrabold text-cyan-300 uppercase tracking-[1.4px]">
                  Top customer
                </Text>
                <Text
                  className="text-white text-[18px] mt-0.5"
                  style={{
                    fontFamily: "PlusJakartaSans_700Bold",
                    letterSpacing: -0.4,
                  }}
                  numberOfLines={1}
                >
                  {(topCustomer.name || "").trim() ||
                    (topCustomer.email || "").trim() ||
                    "N/A"}
                </Text>
                {/* Show a quiet contact line under the headline so the
                    vendor can recognise the customer at a glance. */}
                {(() => {
                  const heroHasName = !!(topCustomer.name || "").trim();
                  const heroHasEmail = !!(topCustomer.email || "").trim();
                  const heroPhone = (topCustomer.phoneNumber || "").trim();
                  const heroParts: string[] = [];
                  if (heroPhone) heroParts.push(heroPhone);
                  if (heroHasName && heroHasEmail) heroParts.push((topCustomer.email || "").trim());
                  if (heroParts.length === 0) return null;
                  return (
                    <Text
                      className="text-cyan-100/70 text-[11.5px] mt-0.5"
                      numberOfLines={1}
                    >
                      {heroParts.join(" · ")}
                    </Text>
                  );
                })()}
                <View className="flex-row items-center gap-2 mt-1.5">
                  <Text className="text-cyan-100/85 text-[12px] font-bold">
                    {topCustomer.totalOrders}{" "}
                    {topCustomer.totalOrders === 1 ? "order" : "orders"}
                  </Text>
                  <Text className="text-cyan-100/40 text-[10px]">·</Text>
                  <Text className="text-cyan-100/85 text-[12px] font-bold">
                    {compactCurrency(topCustomer.totalAmount)} spent
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      ) : null}

      {/* Top customers list — same shape as Top products on Sales tab */}
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
        <View className="px-5 py-4 border-b border-gray-100">
          <Text className="text-[14px] font-extrabold text-gray-900">
            Top customers
          </Text>
          <Text className="text-[12px] text-gray-500 mt-0.5">
            Biggest spenders in {periodLabel(period, customFromLabel, customToLabel)}
          </Text>
        </View>

        {topCustomers.length === 0 ? (
          <View className="px-5 py-12 items-center">
            <View className="w-12 h-12 rounded-2xl bg-gray-50 items-center justify-center mb-2">
              <Ionicons name="people-outline" size={20} color="#9ca3af" />
            </View>
            <Text className="text-[13px] text-gray-500">
              No customers yet in this period
            </Text>
            <Text className="text-[11.5px] text-gray-400 mt-1 text-center max-w-[240px]">
              Once shoppers start placing orders, your top spenders will show up here.
            </Text>
          </View>
        ) : (
          topCustomers.slice(0, 5).map((c, i) => (
            <RankedCustomerRow
              key={`${c.name}-${i}`}
              rank={i + 1}
              customer={c}
              isLast={i === Math.min(topCustomers.length, 5) - 1}
            />
          ))
        )}
      </View>
    </View>
  );
}

// Compact row for the Top customers list. Mirrors RankedProductRow's
// visual rhythm on purpose so the two lists feel like a set.
function RankedCustomerRow({
  rank,
  customer,
  isLast,
}: {
  rank: number;
  customer: TopCustomer;
  isLast: boolean;
}) {
  // Display rules:
  //   - Primary: name when set, else email, else "N/A".
  //   - Sub-line: phone + email when name is the primary; just phone
  //     when email is already the primary (don't repeat it).
  //   - Initials: derived from the primary string. "??" fallback only
  //     hits the truly-anonymous "N/A" case.
  const rawName = (customer.name || "").trim();
  const rawEmail = (customer.email || "").trim();
  const rawPhone = (customer.phoneNumber || "").trim();
  const hasName = rawName.length > 0;
  const hasEmail = rawEmail.length > 0;
  const primary = hasName ? rawName : hasEmail ? rawEmail : "N/A";

  const subParts: string[] = [];
  if (rawPhone) subParts.push(rawPhone);
  if (hasName && hasEmail) subParts.push(rawEmail);
  const subline = subParts.join(" · ");

  const initials = (() => {
    if (!hasName && !hasEmail) return "??";
    if (hasName) {
      const parts = rawName.split(/\s+/).filter(Boolean);
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    // Email primary — first two letters of the local part.
    return rawEmail.slice(0, 2).toUpperCase();
  })();

  // Subtle rank-based tint — gold/silver/bronze for the top three,
  // muted gray for the rest.
  const rankTint =
    rank === 1
      ? { bg: "#fef3c7", color: "#b45309" }
      : rank === 2
      ? { bg: "#e0e7ff", color: "#4338ca" }
      : rank === 3
      ? { bg: "#ffedd5", color: "#c2410c" }
      : { bg: "#f3f4f6", color: "#6b7280" };

  return (
    <View
      className={`flex-row items-center gap-3 px-5 py-3.5 ${
        isLast ? "" : "border-b border-gray-50"
      }`}
    >
      <View
        className="w-7 h-7 rounded-full items-center justify-center"
        style={{ backgroundColor: rankTint.bg }}
      >
        <Text
          className="text-[11px] font-extrabold"
          style={{ color: rankTint.color }}
        >
          {rank}
        </Text>
      </View>
      <View className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center">
        <Text className="text-[12px] font-extrabold text-gray-600">
          {initials}
        </Text>
      </View>
      <View className="flex-1 min-w-0">
        <Text
          className="text-[13.5px] text-gray-900"
          style={{ fontFamily: "PlusJakartaSans_700Bold" }}
          numberOfLines={1}
        >
          {primary}
        </Text>
        {subline ? (
          <Text className="text-[10.5px] text-gray-500 mt-0.5" numberOfLines={1}>
            {subline}
          </Text>
        ) : null}
        <Text className="text-[10.5px] text-gray-400 mt-0.5">
          {customer.totalOrders}{" "}
          {customer.totalOrders === 1 ? "order" : "orders"}
        </Text>
      </View>
      <Text className="text-[13px] font-extrabold text-gray-900">
        {compactCurrency(customer.totalAmount)}
      </Text>
    </View>
  );
}

// ---- Reusable bits ---------------------------------------------------------

/** Small money figure in the dark hero (Revenue / Expenses / Profit). */
function HeroMoneyStat({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor: string;
}) {
  return (
    <View className="flex-1">
      <Text className="text-[9px] font-extrabold text-blue-200/70 uppercase tracking-[1px]">
        {label}
      </Text>
      <Text
        className="mt-1"
        style={{
          fontFamily: "PlusJakartaSans_700Bold",
          fontSize: 14.5,
          letterSpacing: -0.3,
          color: valueColor,
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </View>
  );
}

/**
 * Traffic → orders funnel with a headline conversion rate. Built entirely
 * from real report data (`totalVisits` + `totalOrders` + revenue), so it
 * never fabricates a trend. Self-hides its numbers behind a friendly empty
 * state when no visits were tracked in the period.
 */
function ConversionCard({
  visits,
  orders,
  revenue,
}: {
  visits: number;
  orders: number;
  revenue: number;
}) {
  const conversionRate = visits > 0 ? (orders / visits) * 100 : 0;
  const revenuePerVisit = visits > 0 ? Math.round(revenue / visits) : 0;
  // Keep a sliver visible so a non-zero order count never renders as an
  // invisible bar; cap at 100% for the (rare) orders > visits edge.
  const ordersWidth =
    visits > 0 ? Math.min(Math.max((orders / visits) * 100, 3), 100) : 0;

  return (
    <View
      className="bg-white rounded-3xl border border-gray-100 p-5 mb-4"
      style={{
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
      }}
    >
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-1 pr-3">
          <Text className="text-[14px] font-extrabold text-gray-900">
            Traffic & conversion
          </Text>
          <Text className="text-[12px] text-gray-500 mt-0.5">
            How many visitors became buyers
          </Text>
        </View>
        <View className="w-9 h-9 rounded-xl bg-indigo-50 items-center justify-center">
          <Ionicons name="funnel-outline" size={17} color="#4f46e5" />
        </View>
      </View>

      {visits === 0 ? (
        <View className="py-4 items-center">
          <View className="w-12 h-12 rounded-2xl bg-gray-50 items-center justify-center mb-2">
            <Ionicons name="eye-off-outline" size={20} color="#9ca3af" />
          </View>
          <Text className="text-[13px] text-gray-500">
            No store visits tracked yet
          </Text>
          <Text className="text-[11.5px] text-gray-400 mt-1 text-center max-w-[240px]">
            Traffic to your storefront in this period will show up here.
          </Text>
        </View>
      ) : (
        <>
          <View className="flex-row items-end gap-2 mb-4">
            <Text
              className="text-gray-900"
              style={{
                fontFamily: "PlusJakartaSans_700Bold",
                fontSize: 30,
                letterSpacing: -1,
              }}
            >
              {conversionRate.toFixed(1)}%
            </Text>
            <Text className="text-[12.5px] text-gray-500 mb-1.5">
              of visitors bought
            </Text>
          </View>

          <View className="gap-3">
            <FunnelRow label="Visits" value={visits} width={100} color="#c7d2fe" />
            <FunnelRow label="Orders" value={orders} width={ordersWidth} color="#4f46e5" />
          </View>

          <View className="flex-row mt-4 pt-4 border-t border-gray-100">
            <View className="flex-1">
              <Text className="text-[10px] font-extrabold text-gray-400 uppercase tracking-[1.1px]">
                Store visits
              </Text>
              <Text
                className="text-gray-900 mt-1"
                style={{ fontFamily: "PlusJakartaSans_700Bold", fontSize: 15 }}
              >
                {visits.toLocaleString()}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-[10px] font-extrabold text-gray-400 uppercase tracking-[1.1px]">
                Revenue / visit
              </Text>
              <Text
                className="text-gray-900 mt-1"
                style={{ fontFamily: "PlusJakartaSans_700Bold", fontSize: 15 }}
              >
                {compactCurrency(revenuePerVisit)}
              </Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

/** One labelled bar in the conversion funnel. */
function FunnelRow({
  label,
  value,
  width,
  color,
}: {
  label: string;
  value: number;
  width: number;
  color: string;
}) {
  return (
    <View>
      <View className="flex-row justify-between mb-1">
        <Text className="text-[11.5px] font-bold text-gray-700">{label}</Text>
        <Text className="text-[11.5px] font-extrabold text-gray-900">
          {value.toLocaleString()}
        </Text>
      </View>
      <View className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <View
          className="h-full rounded-full"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </View>
    </View>
  );
}

function KpiTile({
  icon,
  tint,
  iconColor,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  iconColor: string;
  label: string;
  value: string;
}) {
  return (
    <View
      className="flex-1 bg-white rounded-3xl border border-gray-100 p-4"
      style={{
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
      }}
    >
      <View
        className="w-9 h-9 rounded-xl items-center justify-center mb-3"
        style={{ backgroundColor: tint }}
      >
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text className="text-[10.5px] font-extrabold text-gray-400 uppercase tracking-[1.2px] mb-1">
        {label}
      </Text>
      <Text
        className="text-gray-900"
        style={{
          fontFamily: "PlusJakartaSans_700Bold",
          fontSize: 18,
          letterSpacing: -0.4,
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </View>
  );
}

function GrowthCard({
  title,
  icon,
  tint,
  iconColor,
  current,
  previous,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  iconColor: string;
  current: number;
  previous: number;
}) {
  const growth = calculateGrowthPct(current, previous);
  const isPositive = growth >= 0;
  const max = Math.max(current, previous, 1);
  const currentPct = (current / max) * 100;
  const previousPct = (previous / max) * 100;

  return (
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
      <View className="px-5 py-4 border-b border-gray-100 flex-row items-center justify-between gap-3">
        <View className="flex-row items-center gap-2.5 flex-1 min-w-0">
          <View
            className="w-9 h-9 rounded-xl items-center justify-center"
            style={{ backgroundColor: tint }}
          >
            <Ionicons name={icon} size={16} color={iconColor} />
          </View>
          <Text
            className="text-[13.5px] text-gray-900 flex-1"
            style={{ fontFamily: "PlusJakartaSans_700Bold" }}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>

        <View
          className={`flex-row items-center gap-1 px-2.5 py-1 rounded-full ${
            isPositive ? "bg-emerald-50" : "bg-rose-50"
          }`}
        >
          <Ionicons
            name={isPositive ? "arrow-up" : "arrow-down"}
            size={11}
            color={isPositive ? "#059669" : "#dc2626"}
          />
          <Text
            className={`text-[11px] font-extrabold ${
              isPositive ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {Math.abs(growth).toFixed(1)}%
          </Text>
        </View>
      </View>

      <View className="px-5 py-4">
        <Text
          className="text-gray-900"
          style={{
            fontFamily: "PlusJakartaSans_700Bold",
            fontSize: 22,
            letterSpacing: -0.7,
          }}
        >
          {formatCurrency(current)}
        </Text>
        <Text className="text-[11.5px] text-gray-500 mt-0.5">
          vs {formatCurrency(previous)} previous
        </Text>

        {/* Compare bars */}
        <View className="mt-4 gap-2.5">
          <View>
            <View className="flex-row justify-between mb-1">
              <Text className="text-[11px] font-bold text-gray-700">
                Current
              </Text>
              <Text className="text-[11px] font-extrabold text-gray-900">
                {compactCurrency(current)}
              </Text>
            </View>
            <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <View
                className={`h-full rounded-full ${
                  isPositive ? "bg-emerald-500" : "bg-rose-500"
                }`}
                style={{ width: `${currentPct}%` }}
              />
            </View>
          </View>
          <View>
            <View className="flex-row justify-between mb-1">
              <Text className="text-[11px] font-semibold text-gray-500">
                Previous
              </Text>
              <Text className="text-[11px] font-bold text-gray-600">
                {compactCurrency(previous)}
              </Text>
            </View>
            <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <View
                className="h-full rounded-full bg-gray-400"
                style={{ width: `${previousPct}%` }}
              />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

function RankedProductRow({
  rank,
  product,
  isLast,
}: {
  rank: number;
  product: BestSellingProduct;
  isLast: boolean;
}) {
  const rankBadgeStyle =
    rank === 1
      ? { bg: "bg-amber-100", text: "text-amber-700" }
      : rank === 2
      ? { bg: "bg-gray-200", text: "text-gray-700" }
      : rank === 3
      ? { bg: "bg-orange-100", text: "text-orange-700" }
      : { bg: "bg-gray-50", text: "text-gray-600" };

  const productRevenue = product.totalQuantitySold * product.unitPrice;

  return (
    <View
      className={`flex-row items-center gap-3 px-5 py-3.5 ${
        isLast ? "" : "border-b border-gray-50"
      }`}
    >
      <View
        className={`w-8 h-8 rounded-lg items-center justify-center ${rankBadgeStyle.bg}`}
      >
        <Text className={`text-[12px] font-extrabold ${rankBadgeStyle.text}`}>
          {rank}
        </Text>
      </View>

      <View className="flex-1 min-w-0">
        <Text
          className="text-[13.5px] font-extrabold text-gray-900"
          numberOfLines={1}
        >
          {product.productName}
        </Text>
        <Text className="text-[11.5px] text-gray-500 mt-0.5">
          {product.totalQuantitySold} sold · {compactCurrency(product.unitPrice)} each
          {product.category ? ` · ${product.category}` : ""}
        </Text>
      </View>

      <View className="items-end">
        <Text
          className="text-[13.5px] text-gray-900"
          style={{ fontFamily: "PlusJakartaSans_700Bold" }}
        >
          {compactCurrency(productRevenue)}
        </Text>
        <Text className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">
          revenue
        </Text>
      </View>
    </View>
  );
}
