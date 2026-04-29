import { Asset } from "expo-asset";

/**
 * Static assets that need to be on screen the moment the splash screen
 * hides — preloading them here means React Native has already decoded the
 * image into memory by the time the first frame paints, instead of doing
 * it lazily and flashing in 5-10s later.
 *
 * Add anything that is rendered on the first frame the user sees.
 */
const CRITICAL_ASSETS = [
  require("../../assets/blackLogo.png"),
  require("../../assets/orderlySplash.png"),
  require("../../assets/icon.png"),
];

export async function preloadAppAssets(): Promise<void> {
  try {
    await Asset.loadAsync(CRITICAL_ASSETS);
  } catch (err) {
    // Don't block app startup on a single bad asset.
    console.warn("[preloadAppAssets] failed to preload some assets", err);
  }
}
