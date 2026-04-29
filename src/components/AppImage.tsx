import { Image, ImageProps, ImageContentFit } from "expo-image";
import { StyleProp, ViewStyle } from "react-native";

type Source = ImageProps["source"];

interface AppImageProps extends Omit<ImageProps, "source" | "contentFit"> {
  /**
   * Accepts everything expo-image accepts (URI object, array of URIs, blurhash
   * config, …) plus two conveniences:
   *  - a bare URL string
   *  - the numeric module id returned by `require('./asset.png')`
   */
  source?: Source | string | number | null;
  uri?: string | null;
  contentFit?: ImageContentFit;
  style?: StyleProp<ViewStyle>;
}

/**
 * Thin wrapper around expo-image with the defaults we want everywhere:
 *  - memory + disk caching (same image never re-downloads in a session)
 *  - 200ms fade-in transition
 *  - "cover" fit
 *  - gracefully handles null / undefined / empty-string URIs
 */
export function AppImage({
  source,
  uri,
  contentFit = "cover",
  transition = 200,
  cachePolicy = "memory-disk",
  recyclingKey,
  ...rest
}: AppImageProps) {
  const resolvedUri = uri ?? (typeof source === "string" ? source : undefined);

  let finalSource: Source | undefined;
  if (resolvedUri) {
    finalSource = { uri: resolvedUri };
  } else if (typeof source === "number") {
    // `require('./logo.png')` returns a Metro asset module id (a number).
    // expo-image accepts it directly.
    finalSource = source as unknown as Source;
  } else if (typeof source === "object" && source !== null) {
    finalSource = source;
  }

  return (
    <Image
      source={finalSource}
      contentFit={contentFit}
      transition={transition}
      cachePolicy={cachePolicy}
      recyclingKey={recyclingKey ?? resolvedUri ?? undefined}
      {...rest}
    />
  );
}

/** Warm the disk/memory cache for a URL before it's rendered. */
export function prefetchImage(uri?: string | null) {
  if (!uri) return;
  Image.prefetch(uri).catch(() => {});
}
