import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { useToast } from "react-native-toast-notifications";

import { BottomSheet } from "./BottomSheet";
import {
  searchDomains,
  initiateDomainPurchase,
  getMyDomains,
  DomainAvailability,
  MyDomain,
} from "../api/vendor/vendor.api";
import { verifyPayment } from "../api/vendor/vendor.api";

interface Props {
  visible: boolean;
  onClose: () => void;
}

const haptic = () => {
  if (Platform.OS === "ios") {
    Haptics.selectionAsync().catch(() => {});
  }
};

// Mirrors the subscription Paystack callback pattern — the web bounce page
// (https://orderlystores.com/app-callback) flips the HTTPS redirect into our
// custom URL scheme, which the in-app browser session catches and resolves.
const WEB_CALLBACK_URL = "https://orderlystores.com/app-callback";
const APP_DEEPLINK_PREFIX = "orderly://billing/callback";

const getRefFromUrl = (url: string): string | null => {
  try {
    const u = new URL(url);
    return (
      u.searchParams.get("reference") ??
      u.searchParams.get("trxref") ??
      null
    );
  } catch {
    return null;
  }
};

const formatNgn = (amount: number) => `₦${amount.toLocaleString()}`;

export function CustomDomainModal({ visible, onClose }: Props) {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<DomainAvailability[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [buyingTld, setBuyingTld] = useState<string | null>(null);
  const [myDomains, setMyDomains] = useState<MyDomain[]>([]);
  const [myDomainsLoading, setMyDomainsLoading] = useState(false);

  // Debounce the search input — 400ms feels responsive without spamming
  // the registrar on every keystroke.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query.trim().toLowerCase());
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Fire the actual search whenever the debounced query settles.
  useEffect(() => {
    if (!visible) return;
    const sld = debouncedQuery.replace(/\..*$/, ""); // strip any pasted TLD
    if (!sld || sld.length < 2) {
      setResults([]);
      setSearchError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setSearching(true);
        setSearchError(null);
        const res = await searchDomains(sld);
        if (!cancelled) setResults(res.results);
      } catch (err: any) {
        if (!cancelled) setSearchError(err?.message || "Search failed");
      } finally {
        if (!cancelled) setSearching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, visible]);

  // Refresh "my domains" each time the sheet opens so the just-purchased
  // entry shows up after the WebBrowser session returns.
  useEffect(() => {
    if (!visible) {
      setQuery("");
      setResults([]);
      setSearchError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setMyDomainsLoading(true);
        const list = await getMyDomains();
        if (!cancelled) setMyDomains(list);
      } catch {
        // Silent — the section just stays empty if it fails.
      } finally {
        if (!cancelled) setMyDomainsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const refreshMyDomains = async () => {
    try {
      setMyDomainsLoading(true);
      const list = await getMyDomains();
      setMyDomains(list);
    } catch {
      // ignore
    } finally {
      setMyDomainsLoading(false);
    }
  };

  const handleBuy = async (item: DomainAvailability) => {
    if (buyingTld) return;
    if (!item.available || item.priceNgn == null) return;
    haptic();
    try {
      setBuyingTld(item.tld);
      const sld = item.domainName.replace(`.${item.tld}`, "");
      const init = await initiateDomainPurchase({
        domainName: sld,
        tld: item.tld,
        years: 1,
        callbackUrl: WEB_CALLBACK_URL,
      });

      const result = await WebBrowser.openAuthSessionAsync(
        init.authorizationUrl,
        APP_DEEPLINK_PREFIX
      );

      if (result.type !== "success" || !result.url) {
        // User dismissed the sheet — treat as cancel, no toast.
        setBuyingTld(null);
        return;
      }

      const reference = getRefFromUrl(result.url) ?? init.paymentReference;
      const verify = await verifyPayment(reference);
      if (verify.status === "success") {
        toast.show(`${init.domainName} secured! Provisioning…`, {
          type: "success",
        });
        if (Platform.OS === "ios") {
          Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success
          ).catch(() => {});
        }
        await refreshMyDomains();
        // Drop the user's search hits since this domain is now theirs.
        setResults([]);
        setQuery("");
      } else {
        toast.show("Payment didn't complete. You can try again.", {
          type: "warning",
        });
      }
    } catch (err: any) {
      toast.show(err?.message || "Couldn't complete purchase", {
        type: "danger",
      });
    } finally {
      setBuyingTld(null);
    }
  };

  const orderedResults = useMemo(() => {
    // Available results first, then by price ascending so the cheapest
    // available TLD is most prominent.
    const arr = [...results];
    arr.sort((a, b) => {
      if (a.available !== b.available) return a.available ? -1 : 1;
      const ap = a.priceNgn ?? Number.POSITIVE_INFINITY;
      const bp = b.priceNgn ?? Number.POSITIVE_INFINITY;
      return ap - bp;
    });
    return arr;
  }, [results]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Custom domain"
      subtitle="Find and own your storefront's web address"
      height="92%"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36 }}
      >
        {/* Hero search */}
        <View
          className="mt-3 rounded-3xl overflow-hidden border border-blue-100"
          style={{
            shadowColor: "#1d4ed8",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.1,
            shadowRadius: 18,
            elevation: 4,
          }}
        >
          <View
            className="px-5 pt-5 pb-4"
            style={{ backgroundColor: "#194eb8" }}
          >
            <View className="flex-row items-center gap-2 mb-2">
              <Ionicons name="globe-outline" size={16} color="white" />
              <Text className="text-white/80 text-[11px] font-extrabold uppercase tracking-[1.4px]">
                Find your domain
              </Text>
            </View>
            <Text className="text-white text-[19px] font-extrabold tracking-tight leading-[24px] mb-3">
              Stand out with your own .com, .ng or .com.ng
            </Text>

            <View className="bg-white rounded-2xl flex-row items-center px-4 h-12">
              <Ionicons name="search" size={18} color="#9ca3af" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="myshop"
                placeholderTextColor="#9ca3af"
                autoCorrect={false}
                autoCapitalize="none"
                className="flex-1 ml-3 text-[15px] text-gray-900 h-full"
              />
              {query.length > 0 && (
                <Pressable
                  onPress={() => setQuery("")}
                  hitSlop={8}
                  className="p-1"
                >
                  <Ionicons name="close-circle" size={16} color="#cbd5e1" />
                </Pressable>
              )}
            </View>
            <Text className="text-white/70 text-[11px] mt-2">
              Letters, numbers & hyphens. We'll show every TLD we support.
            </Text>
          </View>
        </View>

        {/* Search results */}
        <View className="mt-5">
          {!debouncedQuery || debouncedQuery.length < 2 ? (
            <View className="items-center py-10 bg-white rounded-3xl border border-gray-100 mt-1">
              <View className="w-14 h-14 rounded-2xl bg-blue-50 items-center justify-center mb-3 border border-blue-100/70">
                <Ionicons name="search" size={20} color="#2563eb" />
              </View>
              <Text className="text-[14px] font-extrabold text-gray-900">
                Start typing to search
              </Text>
              <Text className="text-[12px] text-gray-500 mt-1 text-center max-w-[260px]">
                Try your store name. We'll check availability and pricing
                across every TLD.
              </Text>
            </View>
          ) : searching ? (
            <View className="items-center py-10">
              <ActivityIndicator size="small" color="#2563eb" />
              <Text className="text-[12.5px] text-gray-500 mt-3 font-semibold">
                Checking availability…
              </Text>
            </View>
          ) : searchError ? (
            <View className="items-center py-10 bg-rose-50 rounded-3xl border border-rose-100">
              <Ionicons name="alert-circle" size={22} color="#dc2626" />
              <Text className="text-[13.5px] text-rose-700 font-bold mt-2">
                Couldn't search right now
              </Text>
              <Text className="text-[12px] text-rose-600 mt-1 text-center max-w-[260px]">
                {searchError}
              </Text>
            </View>
          ) : orderedResults.length === 0 ? (
            <View className="items-center py-10 bg-white rounded-3xl border border-gray-100">
              <Text className="text-[13px] font-bold text-gray-700">
                No results
              </Text>
              <Text className="text-[12px] text-gray-500 mt-1">
                Try a different name.
              </Text>
            </View>
          ) : (
            <>
              <Text className="text-[10.5px] font-extrabold text-gray-400 uppercase tracking-[1.4px] mb-2 px-1">
                Results · {orderedResults.length}
              </Text>
              <View className="gap-2">
                {orderedResults.map((item) => {
                  const isBuying = buyingTld === item.tld;
                  return (
                    <View
                      key={item.tld}
                      className="bg-white rounded-2xl border border-gray-100 p-3.5"
                      style={{
                        shadowColor: "#0f172a",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.04,
                        shadowRadius: 10,
                        elevation: 2,
                      }}
                    >
                      <View className="flex-row items-center">
                        <View
                          className={`w-9 h-9 rounded-xl items-center justify-center ${
                            item.available ? "bg-emerald-50" : "bg-gray-100"
                          }`}
                        >
                          <Ionicons
                            name={item.available ? "checkmark-circle" : "close-circle"}
                            size={16}
                            color={item.available ? "#059669" : "#9ca3af"}
                          />
                        </View>
                        <View className="flex-1 min-w-0 ml-3">
                          <Text
                            className="text-[14.5px] font-extrabold text-gray-900 tracking-tight"
                            numberOfLines={1}
                          >
                            {item.domainName}
                          </Text>
                          {item.available ? (
                            <Text className="text-[11.5px] font-bold text-emerald-700 mt-0.5">
                              Available · {item.priceNgn != null ? formatNgn(item.priceNgn) : "—"} / yr
                            </Text>
                          ) : (
                            <Text className="text-[11.5px] text-gray-500 mt-0.5">
                              {item.unavailableReason ?? "Already taken"}
                            </Text>
                          )}
                        </View>
                        {item.available && (
                          <Pressable
                            onPress={() => handleBuy(item)}
                            disabled={isBuying || buyingTld != null}
                            className={`h-9 px-3.5 rounded-xl items-center justify-center flex-row gap-1.5 ${
                              buyingTld != null && !isBuying
                                ? "bg-blue-300"
                                : "bg-blue-600"
                            }`}
                          >
                            {isBuying ? (
                              <ActivityIndicator size="small" color="white" />
                            ) : (
                              <Ionicons name="cart" size={13} color="white" />
                            )}
                            <Text className="text-white text-[12.5px] font-extrabold">
                              {isBuying ? "Opening…" : "Buy"}
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </View>

        {/* My domains — always visible (helps vendors track post-purchase status) */}
        <View className="mt-7">
          <View className="flex-row items-center justify-between mb-2 px-1">
            <Text className="text-[10.5px] font-extrabold text-gray-400 uppercase tracking-[1.4px]">
              Your domains
            </Text>
            {myDomains.length > 0 && (
              <Text className="text-[11px] font-bold text-gray-500">
                {myDomains.length}
              </Text>
            )}
          </View>

          {myDomainsLoading ? (
            <View className="items-center py-6">
              <ActivityIndicator size="small" color="#2563eb" />
            </View>
          ) : myDomains.length === 0 ? (
            <View className="items-center py-6 bg-white rounded-2xl border border-gray-100">
              <Ionicons name="bookmark-outline" size={18} color="#9ca3af" />
              <Text className="text-[12.5px] font-bold text-gray-700 mt-1.5">
                No domains yet
              </Text>
              <Text className="text-[11.5px] text-gray-500 mt-0.5 text-center max-w-[260px]">
                Buy your first domain above. We'll connect it to your storefront.
              </Text>
            </View>
          ) : (
            <View className="gap-2">
              {myDomains.map((d) => {
                const tone =
                  d.status === "Active"
                    ? { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100" }
                    : d.status === "Failed"
                    ? { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-100" }
                    : { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100" };
                return (
                  <View
                    key={d.id}
                    className="bg-white rounded-2xl border border-gray-100 px-3.5 py-3 flex-row items-center"
                  >
                    <View className="w-9 h-9 rounded-xl bg-blue-50 items-center justify-center">
                      <Ionicons name="globe" size={15} color="#2563eb" />
                    </View>
                    <View className="flex-1 min-w-0 ml-3">
                      <Text
                        className="text-[14px] font-extrabold text-gray-900"
                        numberOfLines={1}
                      >
                        {d.domainName}
                      </Text>
                      <Text className="text-[11px] text-gray-500 mt-0.5">
                        Purchased {new Date(d.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <View
                      className={`px-2 py-0.5 rounded-md ${tone.bg} border ${tone.border}`}
                    >
                      <Text className={`text-[10px] font-extrabold ${tone.text}`}>
                        {d.status}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View className="bg-blue-50/60 border border-blue-100 rounded-2xl px-4 py-3 flex-row items-start gap-3 mt-5">
          <Ionicons name="information-circle" size={16} color="#2563eb" />
          <Text className="text-[12px] text-blue-800 leading-[17px] flex-1">
            Domains take a few minutes to provision after payment. We'll notify
            you when yours is ready and connect it to your storefront automatically.
          </Text>
        </View>
      </ScrollView>
    </BottomSheet>
  );
}
