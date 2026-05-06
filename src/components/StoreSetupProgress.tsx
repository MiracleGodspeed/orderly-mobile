import { useMemo } from 'react';
import { View, Pressable, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useVendor } from '../../context/VendorContext';

interface StoreSetupProgressProps {
  /** Optional override. When omitted, computed from `checklistItems`. */
  progress?: number;
  onContinue: () => void;
}

// "Up next" message uses the title of the first incomplete step so the
// vendor immediately sees what to do — concrete > generic. Falls back to
// a tone-aware default when the checklist isn't yet hydrated.
const PROGRESS_TONE = (pct: number, total: number, completed: number) => {
  if (total === 0) return { eyebrow: 'Setup progress', tone: 'Getting started' };
  if (completed === 0) return { eyebrow: 'Setup progress', tone: "Let's get your store live" };
  if (pct < 50) return { eyebrow: 'Setup progress', tone: 'Nice start — keep going' };
  if (pct < 100) return { eyebrow: 'Setup progress', tone: 'Almost there' };
  return { eyebrow: 'Setup progress', tone: 'All set' };
};

export default function StoreSetupProgress({
  progress: progressOverride,
  onContinue,
}: StoreSetupProgressProps) {
  const { checklistItems } = useVendor();

  const { completed, total, pct, nextStepTitle } = useMemo(() => {
    const total = checklistItems.length;
    const completed = checklistItems.filter((i) => i.completed).length;
    const computed = total === 0 ? 0 : Math.round((completed / total) * 100);
    const pct =
      typeof progressOverride === 'number'
        ? Math.max(0, Math.min(100, Math.round(progressOverride)))
        : computed;
    const nextStepTitle =
      checklistItems.find((i) => !i.completed)?.title ?? null;
    return { completed, total, pct, nextStepTitle };
  }, [checklistItems, progressOverride]);

  const { eyebrow, tone } = PROGRESS_TONE(pct, total, completed);

  return (
    <Pressable
      onPress={onContinue}
      // Glass treatment so the card lives inside the dark blue hero
      // rather than fighting it. Subtle border + tinted background +
      // soft outer shadow — same material the rest of the hero uses
      // for its inner pills/badges.
      style={({ pressed }) => ({
        borderRadius: 18,
        overflow: 'hidden',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.14)',
        opacity: pressed ? 0.88 : 1,
        transform: [{ scale: pressed ? 0.985 : 1 }],
        shadowColor: '#0b1d44',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 14,
        elevation: 4,
      })}
    >
      <View style={{ paddingVertical: 14, paddingHorizontal: 14 }}>
        {/* Top row — eyebrow + step count */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(96, 165, 250, 0.28)',
                borderWidth: 1,
                borderColor: 'rgba(147, 197, 253, 0.4)',
              }}
            >
              <Ionicons name="rocket" size={11} color="#dbeafe" />
            </View>
            <Text
              style={{
                color: 'rgba(219, 234, 254, 0.95)',
                fontSize: 11,
                fontWeight: '800',
                letterSpacing: 1.4,
                textTransform: 'uppercase',
              }}
            >
              {eyebrow}
            </Text>
          </View>

          {/* Step count + a chevron — the chevron mimics the original
              card's "tap to continue" signal so vendors immediately read
              the whole card as tappable, not just decorative. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
              <Text
                style={{
                  color: 'white',
                  fontSize: 13,
                  fontWeight: '800',
                  letterSpacing: -0.2,
                  fontFamily: 'PlusJakartaSans_700Bold',
                }}
              >
                {completed}
              </Text>
              <Text
                style={{
                  color: 'rgba(219, 234, 254, 0.65)',
                  fontSize: 11.5,
                  fontWeight: '600',
                }}
              >
                of {total} done
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={14}
              color="rgba(219, 234, 254, 0.85)"
            />
          </View>
        </View>

        {/* Progress bar — tinted track with a brighter gradient-style
            fill. We layer a slightly-translucent inner band over the
            base bar so the fill feels like it has subtle depth without
            needing a real gradient library. */}
        <View
          style={{
            height: 6,
            borderRadius: 3,
            backgroundColor: 'rgba(255, 255, 255, 0.10)',
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: `${pct}%`,
              height: '100%',
              borderRadius: 3,
              backgroundColor: '#60a5fa',
              shadowColor: '#60a5fa',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 6,
            }}
          >
            {/* Inner highlight stripe so the fill reads as glossy
                rather than flat. */}
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.35)',
                borderTopLeftRadius: 3,
                borderTopRightRadius: 3,
              }}
            />
          </View>
        </View>

        {/* Bottom row — tone or "Up next" tease + arrow CTA */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 10,
          }}
        >
          <View style={{ flex: 1, paddingRight: 10 }}>
            {nextStepTitle ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text
                  style={{
                    color: 'rgba(219, 234, 254, 0.65)',
                    fontSize: 11,
                    fontWeight: '700',
                    letterSpacing: 0.3,
                  }}
                >
                  Up next ·
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    flex: 1,
                    color: 'white',
                    fontSize: 12.5,
                    fontWeight: '700',
                    letterSpacing: -0.1,
                    fontFamily: 'PlusJakartaSans_700Bold',
                  }}
                >
                  {nextStepTitle}
                </Text>
              </View>
            ) : (
              <Text
                style={{
                  color: 'rgba(219, 234, 254, 0.85)',
                  fontSize: 12,
                  fontWeight: '700',
                  letterSpacing: -0.1,
                }}
              >
                {tone}
              </Text>
            )}
          </View>

          {/* Labeled CTA pill — leaves no doubt that the card is
              actionable. The pill is purely decorative (the whole card
              is the tap target via the parent Pressable) but reads as a
              real button to the eye. */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              paddingHorizontal: 10,
              height: 26,
              borderRadius: 13,
              backgroundColor: 'rgba(255, 255, 255, 0.20)',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.26)',
            }}
          >
            <Text
              style={{
                color: 'white',
                fontSize: 11,
                fontWeight: '800',
                letterSpacing: 0.1,
                fontFamily: 'PlusJakartaSans_700Bold',
              }}
            >
              Continue
            </Text>
            <Ionicons name="arrow-forward" size={12} color="white" />
          </View>
        </View>
      </View>
    </Pressable>
  );
}
