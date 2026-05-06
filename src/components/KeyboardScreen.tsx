import { Platform, ViewStyle, StyleProp } from 'react-native';
import {
  KeyboardAwareScrollView,
  KeyboardAwareScrollViewProps,
} from 'react-native-keyboard-aware-scroll-view';

type Props = Omit<KeyboardAwareScrollViewProps, 'contentContainerStyle'> & {
  children: React.ReactNode;
  /** Extra padding at the bottom of the scroll content. Increase when
   *  the screen has a sticky-footer CTA so the last input isn't sitting
   *  under the bottom action bar after auto-scroll. */
  bottomPadding?: number;
  /** Optional override for the inner content container style. */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Optional className applied to the scroll container itself. */
  className?: string;
};

/**
 * Reliable cross-platform wrapper for any screen with text inputs.
 *
 * Uses ONLY KeyboardAwareScrollView — combining it with
 * KeyboardAvoidingView (the previous pattern here) causes both to
 * react to the same keyboard event and the resulting offset
 * double-applies, leaving inputs covered by the keyboard on iOS or
 * jittering during focus changes.
 *
 * `enableOnAndroid` is required — without it the library no-ops on
 * Android (where `windowSoftInputMode=adjustResize` alone doesn't
 * scroll focused inputs into view, just resizes the layout).
 *
 * Usage: wrap the FORM content only (not screen headers / sticky
 * footers). Anything inside this component will be scrolled.
 */
export default function KeyboardScreen({
  children,
  bottomPadding = 80,
  extraScrollHeight = 24,
  contentContainerStyle,
  className,
  ...rest
}: Props) {
  return (
    <KeyboardAwareScrollView
      className={className}
      style={{ flex: 1 }}
      enableOnAndroid
      keyboardShouldPersistTaps="handled"
      keyboardOpeningTime={Platform.OS === 'ios' ? 250 : 0}
      extraScrollHeight={extraScrollHeight}
      enableResetScrollToCoords={false}
      showsVerticalScrollIndicator={false}
      {...rest}
      contentContainerStyle={[
        { paddingBottom: bottomPadding },
        contentContainerStyle,
      ]}
    >
      {children}
    </KeyboardAwareScrollView>
  );
}
