import { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { decodeJwt } from '../lib/jwt';
import type { StaffPermission } from '../lib/staffPermissions';

interface JwtPayload {
  // Backend uses `role` for the standard ClaimTypes.Role claim. With
  // System.IdentityModel.Tokens.Jwt the actual key in the JSON is the
  // long URI form, but Microsoft also surfaces it under "role".
  role?: string;
  // The permissions claim is set as a JSON-encoded array string.
  STAFF_PERMISSIONS?: string;
  // Some tokens encode the long URI variant for ClaimTypes.Role.
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'?: string;
}

// Mirror of the backend's UserRole enum (1=Admin, 2=Vendor, 3=Customer,
// 4=Marketer, 5=Multi, 6=Staff). Used to normalise the numeric `role`
// off the login response into the lowercase string the rest of this
// hook compares against.
const ROLE_NUMBER_TO_NAME: Record<number, string> = {
  1: 'admin',
  2: 'vendor',
  3: 'customer',
  4: 'marketer',
  5: 'multi',
  6: 'staff',
};

function normaliseRole(raw: number | string | null | undefined): string {
  if (raw == null) return '';
  if (typeof raw === 'number') return ROLE_NUMBER_TO_NAME[raw] ?? '';
  if (typeof raw === 'string') return raw.toLowerCase();
  return '';
}

interface StaffPermissionsApi {
  /** True when the active session belongs to a Staff role user. */
  isStaff: boolean;
  /** True for Vendor or Admin — both bypass permission checks. */
  isVendorOrAdmin: boolean;
  /** Resolved role label, lowercased. Empty string when unknown. */
  role: string;
  /** Granular permission keys carried by the token. Empty for vendors. */
  permissions: Set<StaffPermission>;
  /**
   * Permission gate. Vendors and admins always return true. Staff users
   * return true only when the explicit permission key is present.
   * Unknown / unauthenticated callers always return false so UI defaults
   * to "hidden" rather than "exposed".
   */
  has: (permission: StaffPermission) => boolean;
}

/**
 * Reads the active session's role + permissions off AuthContext.
 *
 * Role resolution: PREFER `user.role` (set synchronously at login
 * from the API response) over the JWT decode. Reason: the JWT decode
 * path used to race against React's render flush — Login.tsx would
 * navigate.replace("Home") immediately after `await login()`, and
 * Home would mount + call this hook before the token context update
 * propagated. The hook would then decode a null token, return
 * `role=''`, and `has()` would return false for everything — which
 * looked like a staff role to the UI (Owner-only cards / tabs
 * disappeared). Logout-and-back-in fixed it because the second cycle
 * gave the context time to settle. Reading `user.role` instead
 * eliminates the race because user state is set in the same batch
 * as the token.
 *
 * JWT decode is still used for the granular `STAFF_PERMISSIONS`
 * claim (staff-only feature gates) because those don't live on the
 * User object.
 *
 * Memoised on (token, user) — re-runs only when the session changes.
 */
export function useStaffPermissions(): StaffPermissionsApi {
  const { token, user } = useAuth();

  return useMemo<StaffPermissionsApi>(() => {
    // PRIMARY source of truth: the role on the User object, set
    // synchronously by AuthContext.login at sign-in time. No async
    // JWT decode, no render-flush race.
    let role = normaliseRole(user?.role);

    // Fallback to JWT decode for backwards compatibility with
    // sessions restored from older builds that didn't persist
    // `role` on User. Drop this branch once enough vendors have
    // logged in fresh under the new build.
    if (!role && token) {
      const payload = decodeJwt<JwtPayload>(token);
      const rawRole =
        payload?.role ??
        payload?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ??
        '';
      role = rawRole.toLowerCase();
    }

    const isStaff = role === 'staff';
    const isVendorOrAdmin = role === 'vendor' || role === 'admin';

    let permissions = new Set<StaffPermission>();
    const payload = token ? decodeJwt<JwtPayload>(token) : null;
    const rawPerms = payload?.STAFF_PERMISSIONS;
    if (rawPerms && typeof rawPerms === 'string') {
      try {
        const arr = JSON.parse(rawPerms);
        if (Array.isArray(arr)) {
          permissions = new Set(arr.filter((s): s is StaffPermission => typeof s === 'string'));
        }
      } catch {
        // Leave the set empty — the user just won't see gated actions.
      }
    }

    const has = (permission: StaffPermission): boolean => {
      if (isVendorOrAdmin) return true;
      if (!isStaff) return false;
      return permissions.has(permission);
    };

    return { isStaff, isVendorOrAdmin, role, permissions, has };
  }, [token, user]);
}
