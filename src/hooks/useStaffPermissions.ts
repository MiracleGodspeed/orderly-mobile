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
 * Reads the live JWT off the AuthContext, decodes it once per token
 * change, and exposes a tiny gate API for the UI. Hidden behind a hook
 * so screens stay decoupled from JWT parsing details.
 *
 * Memoised on the raw token string — re-decoding is cheap but doing it
 * per render across dozens of screens is wasteful.
 */
export function useStaffPermissions(): StaffPermissionsApi {
  const { token } = useAuth();

  return useMemo<StaffPermissionsApi>(() => {
    const payload = decodeJwt<JwtPayload>(token);
    const rawRole =
      payload?.role ??
      payload?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ??
      '';
    const role = rawRole.toLowerCase();

    const isStaff = role === 'staff';
    const isVendorOrAdmin = role === 'vendor' || role === 'admin';

    let permissions = new Set<StaffPermission>();
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
  }, [token]);
}
