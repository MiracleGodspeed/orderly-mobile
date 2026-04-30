import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Text,
  Dimensions,
  FlatList,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { BrandLoader } from '../components/BrandLoader';
import MenuOverlay from '../components/MenuOverlay';
import StoreSetupProgress from '../components/StoreSetupProgress';
import { StoreSetupModal, type SetupStepId } from '../components/StoreSetupModal';
import { setupProgressPct } from '../lib/setupProgress';
import { CustomDateRangeModal } from '../components/CustomDateRangeModal';
import { DurationPickerModal } from '../components/DurationPickerModal';
import { Ionicons, Feather, MaterialIcons, Octicons } from '@expo/vector-icons';
import Modal from 'react-native-modal';
import * as Haptics from 'expo-haptics';

import { useVendor } from '../../context/VendorContext';
import { useOrders } from '../hooks/useOrders';
import { useProducts } from '../hooks/useProducts';
import { useStorePerformance } from '../hooks/useStorePerformance';
import { AppImage } from '../components/AppImage';
import { TrendBadge } from '../components/TrendBadge';
import { formatNaira, getGreeting, computeTrend } from '../lib/format';
import { FeaturePaywallSheet } from '../components/FeaturePaywallSheet';
import { useFeatures } from '../hooks/useFeatures';
import { FEATURES, FeatureKey } from '../lib/features';

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;

// Static slide content — moved out of render to avoid re-creating require()
// objects on every render.
const SLIDES = [
  {
    title: 'Get your store live today',
    subtitle: 'Just 3 more steps to publish your online store',
    buttonText: 'Continue setup',
    color: '#FFFFFF',
    image: require('../../assets/magic.png'),
  },
  {
    title: 'Special Discount Alert!',
    subtitle: '20% off on featured products this week',
    buttonText: 'View Offers',
    color: '#7C3AED',
    image: require('../../assets/magic.png'),
  },
  {
    title: 'New Feature Released',
    subtitle: 'Check out our latest analytics dashboard',
    buttonText: 'Learn More',
    color: '#059669',
    image: require('../../assets/magic.png'),
  },
];

const HOURGLASS = require('../../assets/hourglass.png');

export default function Home() {
  const insets = useSafeAreaInsets();
  const currentSlideRef = useRef(0);
  const navigation = useNavigation<ScreenNavigationProp>();
  const flatListRef = useRef<FlatList>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [trialModalVisible, setTrialModalVisible] = useState(false);
  const [unreadNotificationsCount] = useState(2);

  const [durationModalVisible, setDurationModalVisible] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<number | undefined>(30);
  const [durationLabel, setDurationLabel] = useState('Sales this month');

  const [customDateModalVisible, setCustomDateModalVisible] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  );
  const [dateTo, setDateTo] = useState<Date>(new Date());

  const { storeData, checklistItems, fetchVendorData } = useVendor();

  // Tracks user-initiated period changes only — flipped true in the duration
  // handlers below, cleared once the performance refetch settles. Lets the
  // overlay loader appear for explicit toggles WITHOUT showing for silent
  // background refetches (focus refresh, staleTime revalidation, etc).
  const [isPeriodChanging, setIsPeriodChanging] = useState(false);

  // Refetch the storefront record (and with it `vendorOnboardProgressResponse`,
  // which drives the setup checklist) every time Home regains focus. Without
  // this, completing a checklist step on another screen — adding a product,
  // setting up bank details, customizing the storefront — leaves the home
  // progress bar stale until the user fully restarts the app. Mirrors the
  // implicit "reload the page" pattern the web relies on.
  useFocusEffect(
    useCallback(() => {
      fetchVendorData().catch(() => {});
    }, [fetchVendorData])
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

  const performanceArgs = useMemo(
    () =>
      selectedDuration !== undefined
        ? { duration: selectedDuration }
        : { from: dateFrom.toISOString(), to: dateTo.toISOString() },
    [selectedDuration, dateFrom, dateTo]
  );
  const {
    data: performanceData,
    refetch: refetchPerformance,
    isFetching: performanceFetching,
  } = useStorePerformance(performanceArgs);

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
    const timer = setInterval(() => {
      const nextSlide = (currentSlideRef.current + 1) % SLIDES.length;
      currentSlideRef.current = nextSlide;
      setCurrentSlide(nextSlide);
      flatListRef.current?.scrollToIndex({ index: nextSlide, animated: true });
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const totalProductCount = productsData?.totalCount ?? 0;
  const totalOrderCount = ordersData?.totalCount ?? 0;
  const totalCustomers = performanceData?.sales?.totalCustomers ?? 0;
  const totalVisits = performanceData?.sales?.totalVisits ?? 0;

  // Derive a trend chip from currentMonth vs lastMonth (or whichever the
  // selected duration most resembles).
  const revenueTrend = useMemo(() => {
    const trend = performanceData?.growthTrend;
    if (!trend) return null;
    const current = trend.currentMonth?.totalRevenue ?? 0;
    const previous = trend.lastMonth?.totalRevenue ?? 0;
    return computeTrend(current, previous);
  }, [performanceData]);

  const greeting = useMemo(() => getGreeting(), []);
  const firstName = useMemo(() => {
    const name = (storeData as any)?.fullName ?? storeData?.storeName ?? '';
    return typeof name === 'string' ? name.split(' ')[0] : '';
  }, [storeData]);

  // Single source of truth shared with StoreSetupModal — see lib/setupProgress.
  // Just signing up = 25% baseline; each of the 3 checklist steps adds 25%.
  const progressPercentage = setupProgressPct(checklistItems);

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

  // Custom-domain quick action — gated behind STORE_CUSTOM_DOMAIN. Locked
  // vendors get the upgrade sheet instead of the dedicated screen.
  const { has: hasFeature } = useFeatures();
  const canUseCustomDomain = true //hasFeature(FEATURES.STORE_CUSTOM_DOMAIN);
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

  const handleMomentumScrollEnd = (event: any) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / CARD_WIDTH);
    currentSlideRef.current = slideIndex;
    setCurrentSlide(slideIndex);
  };

  const onPullRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchOrders(),
        refetchProducts(),
        refetchPerformance(),
        // Pulls fresh `vendorOnboardProgressResponse` so the setup checklist
        // reflects whatever the user just did before opening the app today.
        fetchVendorData(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchOrders, refetchProducts, refetchPerformance, fetchVendorData]);

  // Step completion is tracked by the server via VendorContext.checklistItems.
  // Tapping a step here just navigates the user to where they finish it; the
  // backend will update vendorOnboardProgressResponse when they actually do
  // the work, and the next fetchVendorData() picks it up.
  const handleSetupStepPress = useCallback(
    (step: SetupStepId) => {
      closeSetupModal();
      if (step === 'customize-store') {
        navigation.navigate('ManageStore');
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

  const handleDurationSelect = useCallback((value: number, label: string) => {
    setIsPeriodChanging(true);
    setSelectedDuration(value);
    setDurationLabel(label);
    setDurationModalVisible(false);
  }, []);

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
    setIsPeriodChanging(true);
    setDateFrom(nextFrom);
    setDateTo(nextTo);
    setSelectedDuration(undefined);
    setDurationLabel(`${fmt(nextFrom)} – ${fmt(nextTo)}`);
    setCustomDateModalVisible(false);
  }, []);

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
        {/* Greeting + store identity */}
        <View className="mx-4 mt-3 mb-4 bg-white rounded-2xl border border-gray-100 p-4 overflow-hidden"
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

          {checklistItems.length > 0 && progressPercentage < 100 && (
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
              onPress={tap}
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
        </View>

        {/* Store overview */}
        <View
          className="mx-4 mb-4 p-5 bg-white rounded-2xl border border-gray-100"
          style={{
            shadowColor: '#0f172a',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 12,
            elevation: 2,
          }}
        >
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-[11px] font-extrabold text-gray-400 uppercase tracking-[1.2px]">
              Store Overview
            </Text>
            <TouchableOpacity
              className="flex-row items-center gap-1 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full"
              activeOpacity={0.7}
              onPress={() => setDurationModalVisible(true)}
            >
              <Text className="text-[12px] text-gray-700 font-bold">
                {durationLabel}
              </Text>
              <Feather name="chevron-down" size={13} color="#374151" />
            </TouchableOpacity>
          </View>

          <View className="items-center mt-2">
            <Text className="text-[10.5px] font-extrabold text-gray-400 uppercase tracking-[1.2px] mb-1">
              Revenue
            </Text>
            <Text
              className="text-gray-900"
              style={{
                fontFamily: 'PlusJakartaSans_700Bold',
                fontSize: 36,
                letterSpacing: -1.2,
                lineHeight: 42,
              }}
            >
              {formatNaira(performanceData?.sales?.totalRevenue)}
            </Text>
          </View>

          {revenueTrend && revenueTrend.direction !== 'flat' ? (
            <View className="flex-row justify-center mt-3 mb-5">
              <TrendBadge trend={revenueTrend} label="vs last month" />
            </View>
          ) : (
            <View className="mb-5 mt-3" />
          )}

          <View className="flex-row justify-between gap-2">
            {[
              {
                icon: (
                  <MaterialIcons name="storefront" size={18} color="#2563eb" />
                ),
                tint: '#dbeafe',
                value: totalVisits,
                label: 'Visits',
              },
              {
                icon: <Octicons name="stack" size={18} color="#7c3aed" />,
                tint: '#ede9fe',
                value: totalProductCount,
                label: 'Stocks',
              },
              {
                icon: (
                  <Ionicons name="cart-outline" size={18} color="#059669" />
                ),
                tint: '#d1fae5',
                value: totalOrderCount,
                label: 'Orders',
              },
            ].map((m) => (
              <View
                key={m.label}
                className="flex-1 bg-gray-50/70 border border-gray-100 rounded-2xl py-3 items-center"
              >
                <View
                  className="w-9 h-9 rounded-full items-center justify-center mb-1.5"
                  style={{ backgroundColor: m.tint }}
                >
                  {m.icon}
                </View>
                <Text
                  className="text-gray-900 mb-0.5"
                  style={{
                    fontFamily: 'PlusJakartaSans_700Bold',
                    fontSize: 18,
                    letterSpacing: -0.3,
                  }}
                >
                  {m.value}
                </Text>
                <Text className="text-[10.5px] text-gray-500 font-extrabold uppercase tracking-wide">
                  {m.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Quick actions */}
        <View
          className="mb-4 mx-4 bg-white px-4 pt-4 pb-3 rounded-2xl border border-gray-100"
          style={{
            shadowColor: '#0f172a',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 12,
            elevation: 2,
          }}
        >
          <Text className="text-[11px] font-extrabold text-gray-400 uppercase tracking-[1.2px] mb-4">
            Quick Actions
          </Text>

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
                key: 'analytics',
                label: 'Reports',
                icon: 'bar-chart-outline',
                tint: '#ede9fe',
                iconColor: '#7c3aed',
                onPress: () => handleQuickAction('ReportsAnalytics'),
              },
              {
                key: 'customers',
                label: 'Customers',
                icon: 'people-outline',
                tint: '#d1fae5',
                iconColor: '#059669',
                badge: totalCustomers,
                onPress: () => handleQuickAction('ManageStore'),
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
                          style={{ backgroundColor: tile.tint }}
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

        {/* Slides */}
        <View className="px-4 mb-5">
          <FlatList
            ref={flatListRef}
            data={SLIDES}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            keyExtractor={(_, index) => index.toString()}
            getItemLayout={(_data, index) => ({
              length: CARD_WIDTH,
              offset: CARD_WIDTH * index,
              index,
            })}
            renderItem={({ item: slide }) => (
              <View
                className="p-6 rounded-2xl flex-row items-center"
                style={{ width: CARD_WIDTH, backgroundColor: '#fff' }}
              >
                <View className="flex-1">
                  <View className="flex-row mb-4 items-center gap-3">
                    <View className="w-20 h-20 rounded-xl overflow-hidden">
                      <AppImage
                        source={slide.image}
                        contentFit="cover"
                        style={{ width: '100%', height: '100%' }}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[#1F2A37] font-[400] text-[16px] mb-1">
                        {slide.title}
                      </Text>
                      <Text className="text-[#6B7280] text-[12px]">
                        {slide.subtitle}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => navigation.navigate('SetupStep1')}
                    className="bg-[#1A56DB] px-6 py-2.5 rounded-full self-start flex-row items-center gap-2"
                    activeOpacity={0.8}
                  >
                    <Text className="text-white font-semibold text-sm">
                      {slide.buttonText}
                    </Text>
                    <Text className="text-white">→</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />

          <View className="flex-row justify-center gap-1.5 mt-3">
            {SLIDES.map((_, index) => (
              <View
                key={index}
                className={`h-1.5 rounded-full ${
                  index === currentSlide ? 'w-6 bg-blue-600' : 'w-1.5 bg-gray-300'
                }`}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Setup modal — derives completion state from VendorContext directly */}
      <StoreSetupModal
        visible={setupModalOpen}
        onClose={closeSetupModal}
        onStepPress={handleSetupStepPress}
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
            Welcome to Your 5-Day{'\n'}Free Trial on us.
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
            Your trial includes unlimited access to the website builder, product
            management, analytics, and customer tools.
          </Text>

          <Text className="text-sm text-red-500 text-center mb-4">
            Trial Ends: January 28, 2025
          </Text>

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
        selectedDuration={selectedDuration}
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
