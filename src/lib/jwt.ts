/**
 * Tiny JWT payload decoder. We only need to read claims off the token —
 * never to verify the signature client-side (the backend does that). So
 * a base64url decode of the middle segment is sufficient.
 *
 * Returns null on any parse failure rather than throwing — call sites
 * fall back to "no claims known" gracefully.
 */
export function decodeJwt<T = Record<string, any>>(token: string | null | undefined): T | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;

  try {
    const payload = parts[1];
    // base64url → base64
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/');
    // pad to multiple of 4
    const padLen = (4 - (padded.length % 4)) % 4;
    const b64 = padded + '='.repeat(padLen);

    // React Native ships atob via Hermes (and via expo-standard-web-crypto
    // in newer SDKs). Fall back to manual decode if it isn't there.
    const decoded =
      typeof globalThis.atob === 'function'
        ? globalThis.atob(b64)
        : manualB64Decode(b64);

    return JSON.parse(decoded) as T;
  } catch {
    return null;
  }
}

function manualB64Decode(input: string): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let str = input.replace(/=+$/, '');
  let output = '';
  let bc = 0;
  let bs = 0;

  for (let i = 0; i < str.length; i++) {
    const buffer = chars.indexOf(str.charAt(i));
    if (buffer === -1) continue;
    bs = bc % 4 ? bs * 64 + buffer : buffer;
    if (bc++ % 4) {
      const charCode = 0xff & (bs >> ((-2 * bc) & 6));
      output += String.fromCharCode(charCode);
    }
  }
  return output;
}
