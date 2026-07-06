import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Text,
  Platform,
  RefreshControl,
  Share,
  Clipboard,
  Pressable,
  StyleSheet,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { AppToast } from '../components/AppToast';
import {
  RangeKey,
  RANGE_LABEL,
  rangeForKey,
  thisMonthRange,
} from '../lib/dateRanges';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { BrandLoader } from '../components/BrandLoader';
import MenuOverlay from '../components/MenuOverlay';
import StoreSetupProgress from '../components/StoreSetupProgress';
import { TrialBanner } from '../components/TrialBanner';
import { TrialWelcomeModal, type TrialWelcomeModalHandle } from '../components/TrialWelcomeModal';
import { SubscriptionStatusBanner } from '../components/SubscriptionStatusBanner';
import {
  useUnreadNotificationCount,
  useInvalidateNotifications,
} from '../hooks/useNotifications';
import { StoreSetupModal, type SetupStepId } from '../components/StoreSetupModal';
import { setupProgressPct } from '../lib/setupProgress';
import { CustomDateRangeModal } from '../components/CustomDateRangeModal';
import { DurationPickerModal } from '../components/DurationPickerModal';
import { Ionicons, Feather, MaterialIcons, Octicons } from '@expo/vector-icons';
import Svg, { Defs, Rect, RadialGradient, Stop } from 'react-native-svg';
import Modal from 'react-native-modal';
import * as Haptics from 'expo-haptics';

import { useVendor } from '../../context/VendorContext';
import { useOrders } from '../hooks/useOrders';
import { useProducts } from '../hooks/useProducts';
import { useStorePerformance } from '../hooks/useStorePerformance';
import { AppImage } from '../components/AppImage';
import { TrendBadge } from '../components/TrendBadge';
import PromoCardCarousel from '../components/PromoCardCarousel';
import InsightsCarousel from '../components/InsightsCarousel';
import { formatNaira, getGreeting, computeTrend, formatRelativeTime } from '../lib/format';
import { FeaturePaywallSheet } from '../components/FeaturePaywallSheet';
import { useFeatures } from '../hooks/useFeatures';
import { FEATURES, FeatureKey } from '../lib/features';
import { useStaffPermissions } from '../hooks/useStaffPermissions';
import { STAFF_PERMISSIONS } from '../lib/staffPermissions';

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const HOURGLASS = require('../../assets/hourglass.png');

// Decorative texture sitting behind the Store Overview card. Renders a
// faded brick-tiled lattice of commerce icons (cart, tag, storefront,
// box, receipt) at ~6% opacity — same idea as WhatsApp's chat
// background but themed for retail. A soft brand-blue radial wash from
// the top-right corner adds depth without competing with the headline
// revenue number above.
//
// react-native-svg does NOT reliably honour `width="100%"`/`height="100%"`
// on the root <Svg> when the parent uses absolute positioning — it
// silently collapses to 0×0 and the gradient vanishes. We measure the
// wrapper and pass numeric dimensions through.
const BACKDROP_ICONS: Array<keyof typeof Ionicons.glyphMap> = [
  'cart-outline',
  'pricetag-outline',
  'storefront-outline',
  'cube-outline',
  'receipt-outline',
  'gift-outline',
  'bag-handle-outline',
  'wallet-outline',
  'card-outline',
  'cash-outline',
  'basket-outline',
  'barcode-outline',
];
const BACKDROP_ROTATIONS = [-14, 9, -6, 16, -3, 11, -10, 4, -18, 7, -2, 13];
// Per-cell size jitter (deterministic) so the denser tiling still reads
// as a natural scatter — without it, the smaller icons + tighter grid
// look like graph paper.
const BACKDROP_SIZE_JITTER = [0, 2, -2, 1, -1, 3, -3, 2];

function StoreOverviewBackdrop() {
  const [size, setSize] = useState({ w: 0, h: 0 });

  const icons = useMemo(() => {
    if (size.w === 0 || size.h === 0) return [];
    // Brick layout — every other row is offset by half a cell so the
    // tiling reads as a deliberate pattern instead of a stiff grid.
    const cellW =90;
    const cellH = 32;
    const baseSize = 30;
    const cols = Math.ceil(size.w / cellW) + 1;
    const rows = Math.ceil(size.h / cellH) + 1;
    const out: Array<{
      key: string;
      x: number;
      y: number;
      icon: keyof typeof Ionicons.glyphMap;
      rotate: number;
      size: number;
    }> = [];
    for (let r = 0; r < rows; r++) {
      const rowOffset = r % 2 === 0 ? 0 : cellW / 2;
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const jitter = BACKDROP_SIZE_JITTER[idx % BACKDROP_SIZE_JITTER.length];
        out.push({
          key: `${r}-${c}`,
          // Negative bleed so the edge icons clip cleanly into the
          // rounded card border instead of stopping flush with it.
          x: c * cellW + rowOffset - 10,
          y: r * cellH - 10,
          icon: BACKDROP_ICONS[idx % BACKDROP_ICONS.length],
          rotate: BACKDROP_ROTATIONS[idx % BACKDROP_ROTATIONS.length],
          size: baseSize + jitter,
        });
      }
    }
    return out;
  }, [size.w, size.h]);

  return (
    <View
      pointerEvents="none"
      onLayout={(e) =>
        setSize({
          w: e.nativeEvent.layout.width,
          h: e.nativeEvent.layout.height,
        })
      }
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      {size.w > 0 && size.h > 0 && (
        <>
          {/* Soft brand-blue wash anchored to the top-right corner. */}
          <Svg
            width={size.w}
            height={size.h}
            style={{ position: 'absolute', top: 0, left: 0 }}
          >
            <Defs>
              {/* <RadialGradient
                id="storeOverviewGlow"
                cx={size.w}
                cy={0}
                rx={size.w * 0.7}
                ry={size.h * 0.9}
                fx={size.w}
                fy={0}
                gradientUnits="userSpaceOnUse"
              >
                <Stop offset="0%" stopColor="#2563eb" stopOpacity={0.1} />
                <Stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
              </RadialGradient> */}
            </Defs>
            <Rect width={size.w} height={size.h} fill="url(#storeOverviewGlow)" />
          </Svg>

          {/* Faded commerce icons — the WhatsApp-style texture. */}
          {icons.map((it) => (
            <View
              key={it.key}
              style={{
                position: 'absolute',
                left: it.x,
                top: it.y,
                transform: [{ rotate: `${it.rotate}deg` }],
              }}
            >
              <Ionicons name={it.icon} size={it.size} color="rgba(15, 23, 42, 0.05)" />
            </View>
          ))}
        </>
      )}
    </View>
  );
}

// How long to suppress a *focus-triggered* storefront refetch after the last
// one. Bounces between tabs (Home⇄Orders⇄Home) within this window reuse the
// data already in context instead of re-firing the heavy aggregate. State-
// changing actions refresh on their own, so the focus refetch is only a
// safety net — 20s is short enough to feel live, long enough to kill churn.
const FOCUS_REFETCH_THROTTLE_MS = 20_000;

export default function Home() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<ScreenNavigationProp>();
  const perms = useStaffPermissions();
  // Owner-only chrome (trial banner, subscription banner, setup
  // progress) is hidden for staff sessions — these are vendor-level
  // concerns the staff member can't act on. Analytics-driven widgets
  // (Store Overview card, Top Sellers) additionally depend on the
  // analytics.view permission, since the underlying performance
  // endpoint is gated on that claim and would 403 otherwise.
  const isOwnerView = !perms.isStaff;
  const canViewAnalytics = perms.has(STAFF_PERMISSIONS.ANALYTICS_VIEW);
  const canViewOrders = perms.has(STAFF_PERMISSIONS.ORDERS_VIEW);
  const trialWelcomeRef = useRef<TrialWelcomeModalHandle>(null);
  // Local state-driven copy confirmation. Avoids the third-party toast
  // queue that was eating the first tap on this screen, and lets us
  // style the pill exactly the way we want.
  const [copyToast, setCopyToast] = useState<{ url: string } | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [trialModalVisible, setTrialModalVisible] = useState(false);
  // Real unread count from the server, polled every 60s in the
  // background so the badge stays current without driving the full
  // notifications list fetch. Defaults to 0 while the first request
  // is in flight (better than hardcoding a fake number).
  const { data: unreadNotificationsCount = 0 } = useUnreadNotificationCount();
  const invalidateNotifications = useInvalidateNotifications();

  const [durationModalVisible, setDurationModalVisible] = useState(false);
  // Calendar-anchored range driven by a preset key. `custom` means the
  // user picked an arbitrary start/end via the date picker. We store the
  // resolved {from, to} alongside so the query stays stable across
  // re-renders without re-deriving on each tick.
  const initialRange = thisMonthRange();
  const [selectedKey, setSelectedKey] =
    useState<RangeKey>('thismonth');
  const [durationLabel, setDurationLabel] = useState(RANGE_LABEL.thismonth);
  const [dateFrom, setDateFrom] = useState<Date>(initialRange.from);
  const [dateTo, setDateTo] = useState<Date>(initialRange.to);
  const [customDateModalVisible, setCustomDateModalVisible] = useState(false);

  const { storeData, checklistItems, fetchVendorData } = useVendor();

  // Tracks user-initiated period changes only — flipped true in the duration
  // handlers below, cleared once the performance refetch settles. Lets the
  // overlay loader appear for explicit toggles WITHOUT showing for silent
  // background refetches (focus refresh, staleTime revalidation, etc).
  const [isPeriodChanging, setIsPeriodChanging] = useState(false);

  // Refetch the storefront record (and with it `vendorOnboardProgressResponse`,
  // which drives the setup checklist) when Home regains focus. Without this,
  // completing a checklist step on another screen — adding a product, setting
  // up bank details, customizing the storefront — could leave the home
  // progress bar stale. Mirrors the implicit "reload the page" pattern the web
  // relies on.
  //
  // THROTTLED: `get-storefront-details` is a heavy aggregate (storefront JSON,
  // locations, subscription, onboarding progress, newest catalog items…), and
  // a bare focus refetch fired it on *every* tab switch — Home⇄Orders⇄Home in
  // a few seconds meant several identical heavy calls. We skip the focus
  // refetch if one ran in the last FOCUS_REFETCH_THROTTLE_MS. This is safe
  // because the state-changing actions (bank, payments, products, profile,
  // subscribe) each call `fetchVendorData()` themselves on success, so the
  // data is already fresh when you come back — the focus refetch is just a
  // safety net for slower round-trips. Explicit refreshes are NOT throttled:
  // pull-to-refresh below and the post-subscribe `refreshAfterPlanChange`
  // always go through.
  const lastFocusFetchRef = useRef(0);
  const focusRefetchVendor = useCallback(
    (force = false) => {
      if (!force) {
        const since = Date.now() - lastFocusFetchRef.current;
        if (since < FOCUS_REFETCH_THROTTLE_MS) return;
      }
      lastFocusFetchRef.current = Date.now();
      fetchVendorData().catch(() => {});
    },
    [fetchVendorData]
  );
  useFocusEffect(
    useCallback(() => {
      focusRefetchVendor();
    }, [focusRefetchVendor])
  );

  // Cached, dedup'd data via TanStack Query — no per-focus re-fetch flicker.
  const {
    data: ordersData,
    refetch: refetchOrders,
    isFetching: ordersFetching,
  } = useOrders({ page: 1 });
  const {
    data: productsData,
    refetch: refetchProducts,
    isFetching: productsFetching,
  } = useProducts({ page: 1 });

  // Always send a precise UTC window — the backend used to compute
  // a rolling N-day window from `UtcNow`, which made "Today" and
  // "Last week" drift with the time of day. The hook treats any
  // change to `from`/`to` as a fresh query key.
  const performanceArgs = useMemo(
    () => ({ from: dateFrom.toISOString(), to: dateTo.toISOString() }),
    [dateFrom, dateTo]
  );
  const {
    data: performanceData,
    refetch: refetchPerformance,
    isFetching: performanceFetching,
  } = useStorePerformance(performanceArgs);

  // Top Sellers is intentionally scoped to the current calendar month
  // and ignores the Store Overview duration picker — it answers "what's
  // hot RIGHT NOW?", not "what's been hot in whatever window the vendor
  // is studying."
  //
  // Cold-start optimisation: when the vendor is on the default
  // 'thismonth' duration (which is most of the time), we reuse
  // `performanceArgs` by reference so this hook hits the same cache
  // entry as the main performance query — zero extra network requests.
  // We only compute a fresh window when the duration is something else
  // (today, lastweek, custom, etc), at which point the second query
  // pays for itself by keeping Top Sellers stable while the rest of
  // the dashboard re-windows.
  const topSellersArgs = useMemo(() => {
    if (selectedKey === 'thismonth') return performanceArgs;
    const r = thisMonthRange();
    return { from: r.from.toISOString(), to: r.to.toISOString() };
  }, [selectedKey, performanceArgs]);
  const { data: topSellersData } = useStorePerformance(topSellersArgs);

  // Manual pull-to-refresh state — only true while the user is dragging
  // through a refresh, NOT during background revalidation. TanStack Query's
  // `staleTime` (60s) already handles "is this fresh enough" silently.
  const [refreshing, setRefreshing] = useState(false);

  // Show the brand-aware loader overlay whenever any of the home-relevant
  // backends are working. Hide it during pull-to-refresh — RefreshControl
  // already shows a spinner up top, two indicators feels noisy. Trigger ONLY
  // for events the vendor explicitly cares about:
  //   1. Cold start — no data on screen yet AND something is being fetched
  //   2. Period change — flipped true by the duration handlers
  // We deliberately do NOT include vendorLoading or focus-driven refetches —
  // navigating back to Home should never flash the overlay.
  // `storeData` and `checklistItems` are part of the initial data set —
  // without them the setup progress card flashes a misleading 25% baseline
  // (because setupProgressPct on an empty checklist returns just the
  // baseline). Holding the overlay until those resolve keeps the first
  // paint correct.
  const hasInitialData =
    !!ordersData &&
    !!productsData &&
    !!performanceData &&
    !!storeData &&
    checklistItems.length > 0;
  const isInitialFetching =
    !hasInitialData &&
    (performanceFetching || ordersFetching || productsFetching);
  const showBrandLoader = (isInitialFetching || isPeriodChanging) && !refreshing;

  // Clear the period-change flag the moment the performance refetch settles.
  // Without this the overlay would linger past the actual state change.
  useEffect(() => {
    if (isPeriodChanging && !performanceFetching) {
      setIsPeriodChanging(false);
    }
  }, [isPeriodChanging, performanceFetching]);

  // Slides auto-advance.
  useEffect(() => {
   
  }, []);

  // Stocks is the vendor's all-time catalog size — fixed regardless of
  // duration so it answers "how many products do I sell?" rather than a
  // window-scoped activity number. Orders, Visits, and Revenue do shift
  // with the duration since they're inherently activity metrics.
  const totalProductCount = productsData?.totalCount ?? 0;
  const totalOrderCount = performanceData?.sales?.totalOrders ?? 0;
  const totalCustomers = performanceData?.sales?.totalCustomers ?? 0;
  const totalVisits = performanceData?.sales?.totalVisits ?? 0;

  // Pick the period pair that best matches the vendor's currently-selected
  // duration so the chip's percentage actually corresponds to the headline
  // revenue number above it. For custom date ranges there's no defensible
  // comparison pair, so we hide the chip rather than mislead.
  const revenueTrend = useMemo(() => {
    const trend = performanceData?.growthTrend;
    if (!trend) return null;

    let current: number | null = null;
    let previous: number | null = null;
    let label: string | null = null;

    // Pick the period pair on the GrowthTrend payload that matches the
    // currently-selected preset so the chip's % actually corresponds to
    // the headline revenue number above it. Custom ranges don't have a
    // defensible comparison pair, so we hide the chip in that case.
    if (selectedKey === 'today') {
      current = trend.today?.totalRevenue ?? 0;
      previous = trend.yesterday?.totalRevenue ?? 0;
      label = 'vs yesterday';
    } else if (selectedKey === 'yesterday') {
      // No "day before yesterday" pair available — fall back to a
      // hidden chip rather than misleading the vendor.
      current = null;
      previous = null;
    } else if (selectedKey === 'thismonth') {
      current = trend.currentMonth?.totalRevenue ?? 0;
      previous = trend.lastMonth?.totalRevenue ?? 0;
      label = 'vs last month';
    } else if (selectedKey === 'lastweek') {
      current = trend.lastWeek?.totalRevenue ?? 0;
      previous = trend.currentWeek?.totalRevenue ?? 0;
      label = 'vs this week';
    } else if (selectedKey === 'lastmonth') {
      current = trend.lastMonth?.totalRevenue ?? 0;
      previous = trend.currentMonth?.totalRevenue ?? 0;
      label = 'vs this month';
    } else if (selectedKey === 'lastyear') {
      current = trend.lastYear?.totalRevenue ?? 0;
      previous = trend.currentYear?.totalRevenue ?? 0;
      label = 'vs this year';
    }

    if (current === null || previous === null) return null;
    return { ...computeTrend(current, previous), label };
  }, [performanceData, selectedKey]);

  const greeting = useMemo(() => getGreeting(), []);
  const firstName = useMemo(() => {
    const name = (storeData as any)?.fullName ?? storeData?.storeName ?? '';
    return typeof name === 'string' ? name.split(' ')[0] : '';
  }, [storeData]);

  // Derived data for the new dashboard sections — kept memoised so they
  // don't re-derive on every render of unrelated state (menu open,
  // duration toggles, etc).

  // Most-recent paid orders for the at-a-glance preview. Limited to 4
  // because the section sits above the fold and we don't want it to
  // dominate the dashboard.
  const recentOrders = useMemo(
    () => (ordersData?.data ?? []).slice(0, 4),
    [ordersData?.data]
  );

  // Out-of-stock count from the first page of products. Page-1 sample is
  // intentional — Home should nudge ("at least one item is empty") not
  // be a perfect inventory audit. Vendors tap through to the full list
  // for the actual tally.
  const outOfStockCount = useMemo(() => {
    const items = productsData?.data ?? [];
    return items.filter((p: any) => (p?.stock ?? 0) === 0).length;
  }, [productsData?.data]);

  // Missing-payout flag — the storefront accepts orders before payouts
  // are configured, so it's a real footgun: a vendor can be racking up
  // sales without a destination bank account. Flag it loudly.
  const payoutsMissing = !storeData?.accountName;

  // Top sellers from the current-month-locked report (see
  // `topSellersArgs` above). Always answers "what's hot this month?"
  // regardless of the duration the vendor has selected for the
  // Store Overview card.
  const topSellers = useMemo(
    () => (topSellersData?.sales?.bestSellingProducts ?? []).slice(0, 3),
    [topSellersData?.sales?.bestSellingProducts]
  );

  // Whether the Needs Attention card has anything to render. Lets us
  // hide the entire section when nothing applies, instead of showing
  // an empty card.
  const hasAttentionItems = outOfStockCount > 0 || payoutsMissing;

  // Single source of truth shared with StoreSetupModal — see lib/setupProgress.
  // Just signing up = 25% baseline; each of the 3 checklist steps adds 25%.
  const progressPercentage = setupProgressPct(checklistItems);
  // Insights only surface once setup is fully complete — keeps a new
  // vendor's home calm and focused on finishing setup first.
  const setupComplete =
    checklistItems.length > 0 && checklistItems.every((i) => i.completed);

  const openSetupModal = useCallback(() => setSetupModalOpen(true), []);
  const closeSetupModal = useCallback(() => setSetupModalOpen(false), []);

  const tap = useCallback(() => {
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync().catch(() => {});
    }
  }, []);

  const handleAddProduct = useCallback(() => {
    tap();
    navigation.navigate('ProductsList', { openAddProduct: true } as any);
  }, [navigation, tap]);

  // Storefront share — opens the OS share sheet so the vendor can fire
  // their store URL into WhatsApp, Instagram, X, Messages, etc. with a
  // pre-filled invite line. RN's built-in `Share` API surfaces every
  // installed app that can handle text/URL, so we don't need to
  // hardcode app-specific deep links.
  const handleShareStore = useCallback(async () => {
    tap();
    const slug = storeData?.slugUrl;
    if (!slug) {
      // Vendor hasn't published yet — share would expose a 404. Better
      // to nudge them to set up the storefront first.
      navigation.navigate('ManageStore');
      return;
    }
    const storeName = storeData?.storeName || 'my store';
    const url = `https://${slug}.orderlystores.com`;
    const message = `Shop at ${storeName} — ${url}`;
    try {
      await Share.share(
        // iOS uses `url` separately so the recipient can save the link;
        // Android collapses to `message` so we include the URL inline
        // there. RN handles both shapes off this single object.
        Platform.OS === 'ios' ? { message, url } : { message },
        { dialogTitle: `Share ${storeName}` }
      );
    } catch {
      // User dismissing the share sheet rejects the promise on iOS — not
      // an error worth surfacing. Real failures (Android) are rare and
      // also non-actionable from the UI.
    }
  }, [storeData?.slugUrl, storeData?.storeName, navigation, tap]);

  // Custom-domain quick action — gated behind STORE_CUSTOM_DOMAIN. Locked
  // vendors get the upgrade sheet instead of the dedicated screen.
  const { has: hasFeature } = useFeatures();
  const canUseCustomDomain = hasFeature(FEATURES.STORE_CUSTOM_DOMAIN);
  // Visitor analytics is a paid feature — locked vendors see the tile
  // with a lock icon and tap-to-upgrade behavior, not the real number.
  const canUseVisits = hasFeature(FEATURES.ANALYTICS_VISITS);
  // The Growth Partner insights carousel rides on the products.low_stock
  // key (free during the 14-day trial). Gate the render so ineligible
  // vendors don't fetch a feed the backend would return empty anyway.
  const canUseInsights = hasFeature(FEATURES.PRODUCTS_LOW_STOCK);
  const [paywallFeature, setPaywallFeature] = useState<FeatureKey | null>(null);
  const handleOpenDomain = useCallback(() => {
    tap();
    if (!canUseCustomDomain) {
      setPaywallFeature(FEATURES.STORE_CUSTOM_DOMAIN);
      return;
    }
    navigation.navigate('CustomDomain');
  }, [canUseCustomDomain, navigation, tap]);

  const handleQuickAction = useCallback(
    (screen: keyof RootStackParamList, params?: any) => {
      tap();
      navigation.navigate(screen as any, params);
    },
    [navigation, tap]
  );



  const onPullRefresh = useCallback(async () => {
    setRefreshing(true);
    // A manual pull is an explicit "give me fresh data" — always fetch, and
    // stamp the throttle clock so the focus refetch doesn't immediately
    // re-fire the same heavy call a beat later.
    lastFocusFetchRef.current = Date.now();
    try {
      await Promise.all([
        refetchOrders(),
        refetchProducts(),
        refetchPerformance(),
        // Pulls fresh `vendorOnboardProgressResponse` so the setup checklist
        // reflects whatever the user just did before opening the app today.
        fetchVendorData(),
      ]);
      // Force the badge to refresh too — the polling tick is 60s, but a
      // pull-to-refresh should give the vendor a fresh count immediately.
      invalidateNotifications();
    } finally {
      setRefreshing(false);
    }
  }, [
    refetchOrders,
    refetchProducts,
    refetchPerformance,
    fetchVendorData,
    invalidateNotifications,
  ]);

  // Step completion is tracked by the server via VendorContext.checklistItems.
  // Tapping a step here just navigates the user to where they finish it; the
  // backend will update vendorOnboardProgressResponse when they actually do
  // the work, and the next fetchVendorData() picks it up.
  const handleSetupStepPress = useCallback(
    (step: SetupStepId) => {
      closeSetupModal();
      if (step === 'add-delivery-locations') {
        navigation.navigate('LocationManagement');
      } else if (step === 'add-product') {
        navigation.navigate('ProductsList', { openAddProduct: true } as any);
      } else if (step === 'setup-payment') {
        navigation.navigate('PayoutSettings');
      }
    },
    [closeSetupModal, navigation]
  );

  const handleCustomRangeBack = useCallback(() => {
    setCustomDateModalVisible(false);
    setTimeout(() => setDurationModalVisible(true), 300);
  }, []);

  const handleDurationSelect = useCallback(
    (key: Exclude<RangeKey, 'custom'>, label: string) => {
      const range = rangeForKey(key);
      setIsPeriodChanging(true);
      setSelectedKey(key);
      setDurationLabel(label);
      setDateFrom(range.from);
      setDateTo(range.to);
      setDurationModalVisible(false);
    },
    []
  );

  const handleDurationCustom = useCallback(() => {
    setDurationModalVisible(false);
    setTimeout(() => setCustomDateModalVisible(true), 300);
  }, []);

  const handleCustomRangeApply = useCallback((nextFrom: Date, nextTo: Date) => {
    const fmt = (d: Date) =>
      d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    // Lock the bounds to start-of-day / end-of-day in local time so a
    // custom range is internally consistent with the calendar presets.
    const from = new Date(nextFrom);
    from.setHours(0, 0, 0, 0);
    const to = new Date(nextTo);
    to.setHours(23, 59, 59, 999);
    setIsPeriodChanging(true);
    setDateFrom(from);
    setDateTo(to);
    setSelectedKey('custom');
    setDurationLabel(`${fmt(nextFrom)} – ${fmt(nextTo)}`);
    setCustomDateModalVisible(false);
  }, []);

  // Dynamic trial-end label for the trial welcome modal below.
  // Previously hard-coded "January 28, 2025" — leftover from the
  // original launch placeholder; rendered a past date by 2026 and
  // read as broken/misleading on review. Now derived from the
  // live subscription's daysRemaining, with a graceful fallback
  // when the trial isn't active or the data hasn't loaded yet.
  const trialEndLabel = (() => {
    const days = storeData?.storeSubscription?.daysRemaining;
    if (typeof days !== 'number' || days <= 0) return null;
    const end = new Date();
    end.setDate(end.getDate() + days);
    return end.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  })();

  return (
    // Top: white safe-area band that lets the Header bleed into the notch.
    // Body: gray scroll area that fills the rest.
    <View className="flex-1 bg-[#f4f4f5]">
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#fff' }}>
        <Header
          onMenuClick={() => setMenuOpen(true)}
          unreadCount={unreadNotificationsCount}
        />
      </SafeAreaView>

      <MenuOverlay isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          // Floor padding lifts last card above the BottomNav (~80px) and
          // accounts for the home indicator on devices with a bottom inset.
          paddingBottom: 120 + insets.bottom,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onPullRefresh}
            tintColor="#2563eb"
          />
        }
      >
        {/* Subscription lifecycle banners — mutually exclusive, only
            one (or none) renders at a time. TrialBanner handles the
            trial window; SubscriptionStatusBanner handles paid expiry,
            grace, and post-grace. Owner-only — staff can't act on
            billing so we hide both for them. */}
        {isOwnerView && (
          <>
            <TrialBanner onPress={() => trialWelcomeRef.current?.open()} />
            <SubscriptionStatusBanner />
          </>
        )}

        {/* Greeting + store identity */}
        <View
          className="mx-4 mt-3 mb-3"
          style={{
            borderRadius: 20,
            backgroundColor: '#143b8f',
            shadowColor: '#1c59ca',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.28,
            shadowRadius: 20,
            elevation: 6,
          }}
        >
          {/* Real diagonal gradient as an absolute-fill background; the
              padded content view below drives the height. Deep brand-blue
              → indigo reads richer than a flat fill, and never clips. */}
          <View style={{ borderRadius: 20, overflow: 'hidden' }}>
            <LinearGradient
              colors={['#2f6ae0', '#1f56c4', '#143b8f']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {/* One legitimate premium detail: a hairline of light on the
                top rim so the surface reads as lit from above. */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 1,
                backgroundColor: 'rgba(255, 255, 255, 0.18)',
              }}
            />
            <View style={{ padding: 16 }}>
          <View className="flex-row items-baseline gap-1.5 mb-3">
            <Text
              className="text-[10px] font-extrabold uppercase tracking-[1.6px] text-blue-200/90"
            >
              {greeting} 👋
            </Text>
            {/* {firstName ? (
              <Text
                className="text-[12px] text-white"
                style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
                numberOfLines={1}
              >
                · {firstName} 👋
              </Text>
            ) : (
              <Text className="text-[12px]">👋</Text>
            )} */}
          </View>

          {isOwnerView && checklistItems.length > 0 && progressPercentage < 100 && (
            <View className="mb-4">
              <StoreSetupProgress
                progress={progressPercentage}
                onContinue={openSetupModal}
              />
            </View>
          )}

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3 flex-1">
             
              <View
                className="w-12 h-12 rounded-2xl items-center justify-center border"
                style={{
                  backgroundColor: 'rgba(96, 165, 250, 0.22)',
                  borderColor: 'rgba(147, 197, 253, 0.35)',
                }}
              >
                <Ionicons name="storefront" size={22} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text
                  className="text-[17px] text-white leading-tight"
                  numberOfLines={1}
                  style={{
                    fontFamily: 'PlusJakartaSans_700Bold',
                    letterSpacing: -0.3,
                  }}
                >
                  {storeData?.storeName || 'My Store'}
                </Text>
                <View className="flex-row items-center gap-1.5 mt-1.5">
                  {/* Live pill — glass treatment with emerald tint so it
                      reads as a status badge belonging to the card, not
                      a sticker pasted over the dark surface. */}
                  {/* <View
                    className="flex-row items-center gap-1 px-2 py-0.5 rounded-full border"
                    style={{
                      backgroundColor: 'rgba(52, 211, 153, 0.18)',
                      borderColor: 'rgba(110, 231, 183, 0.35)',
                    }}
                  >
                    <View
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: '#34d399',
                        shadowColor: '#34d399',
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.8,
                        shadowRadius: 3,
                      }}
                    />
                    <Text className="text-[9.5px] text-emerald-50 font-extrabold uppercase tracking-wide">
                      Live
                    </Text>
                  </View> */}

                  {/* URL pill — neutral glass so it reads as the secondary
                      bit of metadata, not as a competing accent. Tap copies
                      the full URL so the vendor can paste it anywhere. */}
                  <Pressable
                    onPress={() => {
                      if (!storeData?.slugUrl) return;
                      const url = `https://${storeData.slugUrl}.orderlystores.com`;
                      Clipboard.setString(url);
                      if (Platform.OS === 'ios') {
                        Haptics.notificationAsync(
                          Haptics.NotificationFeedbackType.Success
                        ).catch(() => {});
                      }
                      // Re-set with a fresh object even if the same URL,
                      // so a rapid second tap re-triggers the animation.
                      setCopyToast({ url: `${storeData.slugUrl}.orderlystores.com` });
                    }}
                    hitSlop={8}
                    className="flex-row items-center gap-1 px-2 py-0.5 rounded-full border flex-shrink min-w-0 active:opacity-70"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.10)',
                      borderColor: 'rgba(255, 255, 255, 0.15)',
                    }}
                  >
                    <Ionicons name="globe-outline" size={9} color="#bfdbfe" />
                    <Text
                      className="text-[10.5px] text-blue-50 font-semibold"
                      numberOfLines={1}
                    >
                      {storeData?.slugUrl
                        ? `${storeData.slugUrl}.orderlystores.com`
                        : 'store'}
                    </Text>
                    <Ionicons name="copy-outline" size={9} color="#bfdbfe" />
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Glass share button — sits inside the card's visual language
                instead of fighting it like the old white circle did. */}
            <TouchableOpacity
              className="w-10 h-10 rounded-full items-center justify-center border"
              activeOpacity={0.7}
              onPress={handleShareStore}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.14)',
                borderColor: 'rgba(255, 255, 255, 0.22)',
              }}
            >
              <Ionicons name="share-social-outline" size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
            </View>
          </View>
        </View>

        {/* Admin-managed auto-swipe promo strip. Renders nothing
            when no active cards are scheduled — zero footprint on
            quiet dashboards. */}
        {/* <View className="">
          <PromoCardCarousel />
        </View> */}

        {/* Growth Partner insights — calm, comforting advice strip. Each
            slide resolves to exactly what the vendor needs (filtered
            customers, an order list, a product, the reports screen).
            Renders nothing until there's something worth saying. Gated on
            analytics permission so staff without it don't see store
            performance. */}
        {canViewAnalytics && setupComplete && canUseInsights && <InsightsCarousel />}
{/* here */}
        {/* <View className="mx-4 mt-3 mb-4 bg-white rounded-2xl border border-gray-100 p-4 overflow-hidden"
          style={{
            shadowColor: '#0f172a',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 12,
            elevation: 2,
          }}
        >
          <Text className="text-[12.5px] text-gray-500 font-medium mb-3">
            {greeting}
            {firstName ? `, ${firstName}` : ''} 👋
          </Text>

          {isOwnerView && checklistItems.length > 0 && progressPercentage < 100 && (
            <View className="mb-4">
              <StoreSetupProgress
                progress={progressPercentage}
                onContinue={openSetupModal}
              />
            </View>
          )}

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3 flex-1">
              <View className="w-12 h-12 bg-blue-50 rounded-2xl items-center justify-center border border-blue-100">
                <Ionicons name="storefront" size={22} color="#2563eb" />
              </View>
              <View className="flex-1">
                <Text
                  className="text-[17px] text-gray-900 leading-tight"
                  numberOfLines={1}
                  style={{
                    fontFamily: 'PlusJakartaSans_700Bold',
                    letterSpacing: -0.3,
                  }}
                >
                  {storeData?.storeName || 'My Store'}
                </Text>
                <View className="flex-row items-center gap-1.5 mt-1.5">
                  <View className="flex-row items-center gap-1 bg-green-50 px-2 py-0.5 rounded-full">
                    <View className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <Text className="text-[9.5px] text-green-700 font-extrabold uppercase tracking-wide">
                      Live
                    </Text>
                  </View>
                  <View className="bg-blue-50 px-2 py-0.5 rounded-full">
                    <Text className="text-[10.5px] text-blue-700 font-bold" numberOfLines={1}>
                      {storeData?.slugUrl + ".orderlystores.com" || 'store'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <TouchableOpacity
              className="w-10 h-10 bg-white rounded-full items-center justify-center border border-gray-200"
              activeOpacity={0.7}
              onPress={handleShareStore}
              style={{
                shadowColor: '#0f172a',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              <Ionicons name="share-social-outline" size={18} color="#374151" />
            </TouchableOpacity>
          </View>
        </View> */}

        {/* Store overview — only shown for users who can read analytics.
            Staff without analytics.view would 403 the underlying
            performance endpoint, leaving every tile blank. */}
        {canViewAnalytics && (
        <View
          className="mx-4 mb-2 px-4 pt-4 pb-3.5 bg-white rounded-2xl border border-gray-100"
          style={{
            shadowColor: '#0f172a',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 12,
            elevation: 2,
          }}
        >
          {/* Subtle background texture — a faint dot grid plus a barely
              perceptible blue radial wash in the top-right corner. Lives
              inside its own clipped layer so it follows the card's
              rounded corners without affecting the outer shadow. The
              `pointerEvents="none"` keeps taps falling through to the
              real controls above. We measure the wrapper with `onLayout`
              and feed numeric dimensions to <Svg> — react-native-svg
              silently collapses to 0×0 when both width/height are
              percentages and the parent isn't a flex/measured root, so
              the texture wouldn't render at all without this. */}
          <StoreOverviewBackdrop />

          <View className="flex-row items-center justify-between mb-3">
            {/* Eyebrow with a tiny brand accent bar — gives the section
                title a clear anchor instead of floating in space. */}
            <View className="flex-row items-center gap-2">
              <View
                style={{
                  width: 3,
                  height: 12,
                  borderRadius: 2,
                  // backgroundColor: '#2563eb',
                }}
              />
              <Text className="text-[11px] font-extrabold text-gray-500 uppercase tracking-[1.2px]">
                Store Overview
              </Text>
            </View>
            <TouchableOpacity
              className="flex-row items-center gap-1.5 bg-white border border-gray-100 pl-3 pr-2.5 py-1.5 rounded-full"
              activeOpacity={0.7}
              onPress={() => setDurationModalVisible(true)}
              style={{
                shadowColor: '#0f172a',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <Text
                className="text-[12px] text-gray-900 font-semibold"
                style={{ letterSpacing: -0.1 }}
              >
                {durationLabel}
              </Text>
              <View className="w-4 h-4 rounded-full bg-gray-100 items-center justify-center">
                <Feather name="chevron-down" size={10} color="#475569" />
              </View>
            </TouchableOpacity>
          </View>

          <View className="items-center mt-1">
            <Text className="text-[10px] font-extrabold text-gray-400 uppercase tracking-[1.2px] mb-0.5">
              Revenue
            </Text>
            <Text
              className="text-gray-900"
              style={{
                fontFamily: 'PlusJakartaSans_700Bold',
                fontSize: 30,
                letterSpacing: -1.0,
                lineHeight: 36,
              }}
            >
              {formatNaira(performanceData?.sales?.totalRevenue)}
            </Text>
          </View>

          {revenueTrend && revenueTrend.direction !== 'flat' ? (
            <View className="flex-row justify-center mt-2 mb-3">
              <TrendBadge trend={revenueTrend} label={revenueTrend.label ?? undefined} />
            </View>
          ) : (
            <View className="mb-3 mt-2" />
          )}

          {/* Hairline divider between the headline revenue and the
              breakdown tiles — visually signals "summary above,
              breakdown below" without adding a heavy section break. */}
          {/* <View
            style={{
              height: 1,
              backgroundColor: 'rgba(15, 23, 42, 0.06)',
              marginBottom: 11,
              marginHorizontal: -4,
            }}
          /> */}

          <View className="flex-row justify-between gap-2 mt-3">
            {(
              [
                {
                  icon: (
                    <MaterialIcons name="storefront" size={16} color={canUseVisits ? '#2563eb' : '#9ca3af'} />
                  ),
                  tint: canUseVisits ? '#dbeafe' : '#f3f4f6',
                  value: totalVisits,
                  label: 'Visits',
                  locked: !canUseVisits,
                  // Only attach a tap handler when the feature is gated —
                  // unlocked tiles are read-only stats, not buttons.
                  onPress: !canUseVisits
                    ? () => {
                        tap();
                        setPaywallFeature(FEATURES.ANALYTICS_VISITS);
                      }
                    : (undefined as (() => void) | undefined),
                },
                {
                  icon: <Octicons name="stack" size={16} color="#7c3aed" />,
                  tint: '#ede9fe',
                  value: totalProductCount,
                  label: 'Stocks',
                  locked: false,
                  onPress: undefined as (() => void) | undefined,
                },
                {
                  icon: (
                    <Ionicons name="cart-outline" size={16} color="#059669" />
                  ),
                  tint: '#d1fae5',
                  value: totalOrderCount,
                  label: 'Orders',
                  locked: false,
                  onPress: undefined as (() => void) | undefined,
                },
              ]
            ).map((m) => {
              const inner = (
                <>
                  <View
                    className="w-8 h-8 rounded-full items-center justify-center mb-1 relative"
                    style={{ backgroundColor: m.tint }}
                  >
                    {m.icon}
                    {m.locked && (
                      <View
                        className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white items-center justify-center"
                        style={{
                          shadowColor: '#0f172a',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.12,
                          shadowRadius: 2,
                          elevation: 2,
                        }}
                      >
                        <Ionicons name="lock-closed" size={8} color="#6b7280" />
                      </View>
                    )}
                  </View>
                  {m.locked ? (
                    <View className="bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-full mb-0.5">
                      <Text className="text-[9px] font-extrabold text-blue-700 uppercase tracking-wide">
                        Upgrade
                      </Text>
                    </View>
                  ) : (
                    <Text
                      className="text-gray-900 mb-0.5"
                      style={{
                        fontFamily: 'PlusJakartaSans_700Bold',
                        fontSize: 16,
                        letterSpacing: -0.3,
                      }}
                    >
                      {m.value}
                    </Text>
                  )}
                  <Text className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wide">
                    {m.label}
                  </Text>
                </>
              );

              // Polished tile container — white surface + thin border +
              // micro shadow so the breakdown tiles sit forward from the
              // card instead of melting into a gray plate.
              const tileStyle = {
                shadowColor: '#0f172a',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 1,
              } as const;
              const tileClass =
                'flex-1 bg-white border border-gray-100 rounded-2xl py-2.5 items-center';

              if (m.onPress) {
                return (
                  <TouchableOpacity
                    key={m.label}
                    onPress={m.onPress}
                    activeOpacity={0.7}
                    className={tileClass}
                    style={tileStyle}
                  >
                    {inner}
                  </TouchableOpacity>
                );
              }

              return (
                <View key={m.label} className={tileClass} style={tileStyle}>
                  {inner}
                </View>
              );
            })}
          </View>
        </View>
        )}

        {/* Quick actions */}
        <View
          className="mb-2 mx-4 bg-white px-4 pt-4 pb-3 rounded-2xl border border-gray-100"
          style={{
            shadowColor: '#0f172a',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 12,
            elevation: 2,
          }}
        >
          {/* Eyebrow with a brand accent bar — matches the Store Overview
              section header so titles feel paired, not floating. */}
          <View className="flex-row items-center gap-2 mb-4">
            <View
              style={{
                width: 3,
                height: 12,
                borderRadius: 2,
                // backgroundColor: '#7c3aed',
              }}
            />
            <Text className="text-[11px] font-extrabold text-gray-500 uppercase tracking-[1.2px]">
              Quick Actions
            </Text>
          </View>

          {(() => {
            const tiles: Array<{
              key: string;
              label: string;
              icon: keyof typeof Ionicons.glyphMap;
              tint: string;
              iconColor: string;
              badge?: number;
              locked?: boolean;
              onPress: () => void;
            }> = [
              // {
              //   key: 'add-product',
              //   label: 'Add product',
              //   icon: 'add',
              //   tint: '#dbeafe',
              //   iconColor: '#2563eb',
              //   onPress: handleAddProduct,
              // },
              {
                key: 'products',
                label: 'Products',
                icon: 'cube-outline',
                tint: '#e0e7ff',
                iconColor: '#4f46e5',
                badge: totalProductCount,
                onPress: () => handleQuickAction('ProductsList'),
              },
              {
                key: 'orders',
                label: 'Orders',
                icon: 'cart-outline',
                tint: '#fef3c7',
                iconColor: '#d97706',
                badge: totalOrderCount,
                onPress: () => handleQuickAction('Orders'),
              },
              {
                key: 'expenses',
                label: 'Expenses',
                icon: 'wallet-outline',
                tint: '#ede9fe',
                iconColor: '#7c3aed',
                onPress: () => handleQuickAction('Expenses'),
              },
              {
                key: 'customers',
                label: 'Customers',
                icon: 'people-outline',
                tint: '#d1fae5',
                iconColor: '#059669',
                badge: totalCustomers,
                onPress: () => handleQuickAction('Customers'),
              },
              {
                key: 'website',
                label: 'Website',
                icon: 'globe-outline',
                tint: '#cffafe',
                iconColor: '#0891b2',
                onPress: () => handleQuickAction('ManageStore'),
              },
              {
                key: 'domain',
                label: 'Domain',
                icon: 'planet-outline',
                tint: '#fae8ff',
                iconColor: '#a21caf',
                locked: !canUseCustomDomain,
                // locked: false,
                onPress: handleOpenDomain,
              },
              {
                key: 'delivery',
                label: 'Delivery',
                icon: 'car-outline',
                tint: '#ffe4e6',
                iconColor: '#e11d48',
                onPress: () => handleQuickAction('LocationManagement'),
              },
              {
                key: 'settings',
                label: 'Settings',
                icon: 'settings-outline',
                tint: '#f1f5f9',
                iconColor: '#475569',
                onPress: () => handleQuickAction('Profile'),
              },
            ];

            return (
              <View className="flex-row flex-wrap -mx-1">
                {tiles.map((tile) => (
                  <View
                    key={tile.key}
                    style={{ width: '25%' }}
                    className="px-1 mb-3"
                  >
                    <TouchableOpacity
                      className="items-center"
                      activeOpacity={0.7}
                      onPress={tile.onPress}
                    >
                      <View className="relative">
                        <View
                          className="w-[58px] h-[58px] rounded-2xl items-center justify-center mb-1.5"
                          style={{
                            backgroundColor: tile.tint,
                            // Hairline inner ring + tiny soft shadow gives
                            // each tile a touch of depth so the bg colour
                            // reads as a button surface rather than a flat
                            // sticker. Matches the rest of the app's
                            // tinted-icon pattern.
                            borderWidth: 1,
                            borderColor: 'rgba(255, 255, 255, 0.65)',
                            shadowColor: tile.iconColor,
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.10,
                            shadowRadius: 6,
                            elevation: 1,
                          }}
                        >
                          <Ionicons
                            name={tile.icon}
                            size={22}
                            color={tile.iconColor}
                          />
                        </View>
                        {tile.badge && tile.badge > 0 ? (
                          <View
                            className="absolute -top-1 -right-1 bg-red-500 px-1.5 py-0.5 rounded-full items-center justify-center"
                            style={{ minWidth: 20, height: 18 }}
                          >
                            <Text className="text-white text-[10px] font-extrabold">
                              {tile.badge > 99 ? '99+' : tile.badge}
                            </Text>
                          </View>
                        ) : tile.locked ? (
                          <View
                            className="absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full bg-white border border-gray-200 items-center justify-center"
                            style={{
                              shadowColor: '#0f172a',
                              shadowOffset: { width: 0, height: 1 },
                              shadowOpacity: 0.08,
                              shadowRadius: 2,
                              elevation: 1,
                            }}
                          >
                            <Ionicons
                              name="lock-closed"
                              size={9}
                              color="#475569"
                            />
                          </View>
                        ) : null}
                      </View>
                      <Text
                        className="text-[11.5px] text-gray-700 text-center font-semibold"
                        numberOfLines={1}
                      >
                        {tile.label}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            );
          })()}
        </View>


        {/* Needs your attention — only renders when there's actually
            something to flag, so the dashboard never carries an empty
            "all clear" placeholder. Drives behaviour, not just info. */}
        {hasAttentionItems && (
          <View
            className="mx-4 mb-4 bg-white rounded-2xl border border-gray-100 overflow-hidden"
            style={{
              shadowColor: '#0f172a',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 12,
              elevation: 2,
            }}
          >
            <View className="px-5 pt-4 pb-2 flex-row items-center gap-2">
              <View
                style={{
                  width: 3,
                  height: 12,
                  borderRadius: 2,
                  backgroundColor: '#e11d48',
                }}
              />
              <Text className="text-[11px] font-extrabold text-gray-500 uppercase tracking-[1.2px]">
                Needs your attention
              </Text>
            </View>

            <View className="px-2 pb-2">
              {payoutsMissing && (
                <Pressable
                  onPress={() => handleQuickAction('PayoutSettings')}
                  className="flex-row items-center px-3 py-3 rounded-xl active:bg-gray-50"
                >
                  <View
                    className="w-10 h-10 rounded-2xl items-center justify-center mr-3"
                    style={{ backgroundColor: '#fff1f2' }}
                  >
                    <Ionicons name="card-outline" size={18} color="#e11d48" />
                  </View>
                  <View className="flex-1 pr-2">
                    <Text
                      className="text-[13.5px] text-gray-900"
                      style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
                    >
                      Set up payouts
                    </Text>
                    <Text
                      className="text-[12px] text-gray-500 mt-0.5 leading-[16px]"
                      numberOfLines={2}
                    >
                      Connect your bank so you can receive money from sales.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
                </Pressable>
              )}

              {outOfStockCount > 0 && (
                <Pressable
                  onPress={() => handleQuickAction('ProductsList')}
                  className="flex-row items-center px-3 py-3 rounded-xl active:bg-gray-50"
                >
                  <View
                    className="w-10 h-10 rounded-2xl items-center justify-center mr-3"
                    style={{ backgroundColor: '#fff7ed' }}
                  >
                    <Ionicons
                      name="cube-outline"
                      size={18}
                      color="#ea580c"
                    />
                  </View>
                  <View className="flex-1 pr-2">
                    <Text
                      className="text-[13.5px] text-gray-900"
                      style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
                    >
                      Restock {outOfStockCount}{' '}
                      {outOfStockCount === 1 ? 'product' : 'products'}
                    </Text>
                    <Text
                      className="text-[12px] text-gray-500 mt-0.5 leading-[16px]"
                      numberOfLines={2}
                    >
                      Items at zero stock won't show up for customers to buy.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* Top sellers — analytics-derived, hidden for staff without
            analytics.view since the underlying performance endpoint is
            gated on that claim. */}
        {canViewAnalytics && (
        <View
          className="mx-4 mb-4 bg-white rounded-2xl border border-gray-100 overflow-hidden"
          style={{
            shadowColor: '#0f172a',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 12,
            elevation: 2,
          }}
        >
          <View className="px-5 pt-4 pb-3 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View
                style={{
                  width: 3,
                  height: 12,
                  borderRadius: 2,
                  backgroundColor: '#d97706',
                }}
              />
              <Text className="text-[11px] font-extrabold text-gray-500 uppercase tracking-[1.2px]">
                Top sellers
              </Text>
            </View>
            <Text className="text-[10.5px] text-gray-400 font-bold">
              This month
            </Text>
          </View>

          {topSellers.length === 0 ? (
            <View className="px-5 py-8 items-center">
              <View
                className="w-12 h-12 rounded-2xl items-center justify-center mb-3"
                style={{ backgroundColor: '#fef3c7' }}
              >
                <Ionicons name="trophy-outline" size={20} color="#d97706" />
              </View>
              <Text
                className="text-[13.5px] text-gray-700"
                style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
              >
                No sales data yet
              </Text>
              <Text className="text-[12px] text-gray-500 mt-1 text-center max-w-[260px]">
                Once you make sales in this period, your top products will line
                up here.
              </Text>
            </View>
          ) : (
            <View className="px-2 pb-3">
              {topSellers.map((product, i) => {
                // Rank badges — gold/silver/bronze tones for the podium
                // feel without being gaudy.
                const rankTones = [
                  { bg: '#fef3c7', fg: '#b45309' }, // 1st
                  { bg: '#e2e8f0', fg: '#475569' }, // 2nd
                  { bg: '#fce7d6', fg: '#9a3412' }, // 3rd
                ];
                const rank = rankTones[i] ?? rankTones[2];
                return (
                  <View
                    key={product.productId ?? i}
                    className="flex-row items-center px-3 py-2.5"
                  >
                    <View
                      className="w-9 h-9 rounded-2xl items-center justify-center mr-3"
                      style={{ backgroundColor: rank.bg }}
                    >
                      <Text
                        className="text-[13px]"
                        style={{
                          fontFamily: 'PlusJakartaSans_700Bold',
                          color: rank.fg,
                        }}
                      >
                        {i + 1}
                      </Text>
                    </View>

                    <View className="flex-1 pr-2 min-w-0">
                      <Text
                        className="text-[12px] text-gray-900"
                        numberOfLines={1}
                        style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
                      >
                        {product.productName ?? 'Untitled product'}
                      </Text>
                      {product.category ? (
                        <Text
                          className="text-[11.5px] text-gray-500 mt-0.5"
                          numberOfLines={1}
                        >
                          {product.category}
                        </Text>
                      ) : null}
                    </View>

                    <View className="items-end">
                      <Text
                        className="text-[13.5px] text-gray-900"
                        style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
                      >
                        {product.totalQuantitySold ?? 0}
                      </Text>
                      <Text className="text-[9px] text-gray-400 uppercase tracking-wide font-extrabold">
                        sold
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
        )}
        {/* Recent orders — the daily-check section. Vendors tap into the
            app several times a day to see "did anything new come in?";
            this answers that without forcing them to navigate. */}
        <View
          className="mx-4 mb-4 bg-white rounded-2xl border border-gray-100 overflow-hidden"
          style={{
            shadowColor: '#0f172a',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 12,
            elevation: 2,
          }}
        >
          <View className="px-5 pt-4 pb-3 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View
                style={{
                  width: 3,
                  height: 12,
                  borderRadius: 2,
                  backgroundColor: '#059669',
                }}
              />
              <Text className="text-[11px] font-extrabold text-gray-500 uppercase tracking-[1.2px]">
                Recent orders
              </Text>
            </View>
            {recentOrders.length > 0 && (
              <Pressable
                onPress={() => handleQuickAction('Orders')}
                hitSlop={6}
                className="flex-row items-center gap-1 active:opacity-60"
              >
                <Text className="text-[12px] text-blue-600 font-extrabold">
                  See all
                </Text>
                <Ionicons name="arrow-forward" size={12} color="#2563eb" />
              </Pressable>
            )}
          </View>

          {recentOrders.length === 0 ? (
            <View className="px-5 py-8 items-center">
              <View
                className="w-12 h-12 rounded-2xl items-center justify-center mb-3"
                style={{ backgroundColor: '#f1f5f9' }}
              >
                <Ionicons name="bag-handle-outline" size={20} color="#94a3b8" />
              </View>
              <Text
                className="text-[13.5px] text-gray-700"
                style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
              >
                No orders yet
              </Text>
              <Text className="text-[12px] text-gray-500 mt-1 text-center max-w-[240px]">
                Once customers start buying, you'll see their orders pop up here.
              </Text>
            </View>
          ) : (
            <View className="px-2 pb-3">
              {recentOrders.map((order, i) => {
                const statusKey = (order.status ?? '').toLowerCase();
                const tone =
                  statusKey === 'success'
                    ? {
                      bg: '#ecfdf5',
                      text: '#047857',
                      label: 'Paid',
                    }
                    : statusKey === 'shipped'
                      ? {
                        bg: '#f5f3ff',
                        text: '#6d28d9',
                        label: 'Shipped',
                      }
                      : {
                        bg: '#fffbeb',
                        text: '#b45309',
                        label: 'Pending',
                      };
                const initial = (order.buyerName ?? '?')
                  .trim()
                  .charAt(0)
                  .toUpperCase();
                const when = order.paidAt || order.createdAt;
                return (
                  <Pressable
                    key={order.id ?? i}
                    onPress={() =>
                      navigation.navigate('OrderDetails', { order })
                    }
                    className="flex-row items-center px-3 py-2.5 rounded-xl active:bg-gray-50"
                  >
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center mr-3 border border-blue-100"
                      style={{ backgroundColor: '#dbeafe' }}
                    >
                      <Text
                        className="text-[14px] text-blue-700"
                        style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
                      >
                        {initial}
                      </Text>
                    </View>

                    <View className="flex-1 pr-2 min-w-0">
                      <Text
                        className="text-[13.5px] text-gray-900"
                        numberOfLines={1}
                        style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
                      >
                        {order.buyerName || 'Customer'}
                      </Text>
                      <Text
                        className="text-[11.5px] text-gray-500 mt-0.5"
                        numberOfLines={1}
                      >
                        {formatNaira(order.totalPrice ?? order.amountPaid ?? 0)}
                        {when ? ` · ${formatRelativeTime(when)}` : ''}
                      </Text>
                    </View>

                    <View
                      className="px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: tone.bg }}
                    >
                      <Text
                        className="text-[10px] font-extrabold uppercase tracking-wide"
                        style={{ color: tone.text }}
                      >
                        {tone.label}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Setup modal — derives completion state from VendorContext directly */}
      <StoreSetupModal
        visible={setupModalOpen}
        onClose={closeSetupModal}
        onStepPress={handleSetupStepPress}
      />

      {/* Onboarding for trial vendors so they understand the full-access
          window and aren't surprised when features lock after a
          starter-plan purchase. Auto-shows once per store and can be
          re-opened by tapping the trial banner above. */}
      <TrialWelcomeModal ref={trialWelcomeRef} />

      {/* Premium copy-confirmation pill — driven by local state so the
          first tap on the URL chip lands reliably (the toast library
          was eating it on cold start). */}
      <AppToast
        visible={copyToast != null}
        title="Store link copied"
        subtitle={copyToast?.url}
        onHide={() => setCopyToast(null)}
      />

      {/* Trial modal */}
      <Modal
        isVisible={trialModalVisible}
        onBackdropPress={() => setTrialModalVisible(false)}
        useNativeDriver
        hideModalContentWhileAnimating={false}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        animationInTiming={200}
        animationOutTiming={150}
        backdropTransitionInTiming={0}
        backdropTransitionOutTiming={0}
        style={{ justifyContent: 'flex-end', margin: 0 }}
      >
        <View className="bg-white rounded-t-3xl px-5 pt-4 pb-10 py-6">
          <View className="flex-row items-center justify-between mb-4">
            <View />
            <Text className="text-[16px] text-gray-800">Subscription</Text>
            <TouchableOpacity onPress={() => setTrialModalVisible(false)}>
              <Ionicons name="close" size={22} color="#111827" />
            </TouchableOpacity>
          </View>

          <Text className="text-[24px] font-[400] text-gray-900 text-center mb-4">
            Welcome to Your 14-Day{'\n'}Free Trial on us.
          </Text>

          <View className="items-center mb-5">
            <View className="w-48 h-48 bg-[#EBF5FF] rounded-full items-center justify-center">
              <AppImage
                source={HOURGLASS}
                contentFit="contain"
                style={{ width: 144, height: 144 }}
              />
            </View>
          </View>

          <Text className="text-[14px] text-gray-900 text-center font-[300] mb-3 px-2">
            You're all set! Your store is now live in trial mode. Explore all
            premium features, customise your storefront, and start adding your
            products or services.
          </Text>

          <Text className="text-[12px] text-gray-500 text-center mb-8 px-4">
            Full access to every Orderly feature, with no restrictions during
            your trial.
          </Text>

          {trialEndLabel && (
            <Text className="text-sm text-red-500 text-center mb-4">
              Trial Ends: {trialEndLabel}
            </Text>
          )}

          <TouchableOpacity
            activeOpacity={0.8}
            className="bg-blue-600 py-3 rounded-full items-center mb-5"
            onPress={() => setTrialModalVisible(false)}
          >
            <Text className="text-white font-semibold text-base">
              Choose a Plan
            </Text>
          </TouchableOpacity>

          <Text className="text-[12px] text-gray-500 text-center mb-6">
            No charges today. Upgrade anytime to keep your store live after your
            trial.
          </Text>
        </View>
      </Modal>

      {/* Duration modal */}
      <DurationPickerModal
        visible={durationModalVisible}
        onClose={() => setDurationModalVisible(false)}
        selectedKey={selectedKey}
        onSelect={handleDurationSelect}
        onSelectCustom={handleDurationCustom}
      />

      {/* Custom range modal */}
      <CustomDateRangeModal
        visible={customDateModalVisible}
        onClose={() => setCustomDateModalVisible(false)}
        onBack={handleCustomRangeBack}
        initialFrom={dateFrom}
        initialTo={dateTo}
        onApply={handleCustomRangeApply}
      />

      {/* Paywall sheet — opens when a gated quick action is tapped */}
      <FeaturePaywallSheet
        visible={paywallFeature != null}
        onClose={() => setPaywallFeature(null)}
        feature={paywallFeature}
      />
      <BottomNav />

      {/* Brand-aware fetch overlay. Sits at the top of the tree so it floats
          above modals, sheets, and the bottom nav. Self-fades; mounted always. */}
      <BrandLoader visible={showBrandLoader} />
    </View>
  );
}
