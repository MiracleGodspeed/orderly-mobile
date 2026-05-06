// Tolerant comparisons for the API's `role` and `userStatus` fields.
//
// JsonStringEnumConverter on the backend means these now arrive as enum
// NAMES ("Vendor", "PendingOnboarding") instead of the integer values
// older builds expected. A naive `data.userStatus === 2` silently
// returns false against `"PendingOnboarding"`, which is what broke the
// Google sign-up flow — brand-new vendors were being routed to Home
// instead of SetupStep1 because the strict-equality check missed them.
//
// Mirror the web `isRole` / `isUserStatus` helpers in src/utils/auth.js
// so both clients tolerate either wire shape.

const USER_ROLE_NAMES: Record<number, string> = {
  1: "Admin",
  2: "Vendor",
  3: "Customer",
  4: "Marketer",
  5: "Multi",
  6: "Staff",
};

const USER_STATUS_NAMES: Record<number, string> = {
  0: "Active",
  1: "Inactive",
  2: "PendingOnboarding",
  3: "ResetPasswordInitiated",
  4: "PasswordResetLinkValidated",
  5: "Deleted",
};

export function isRole(
  raw: number | string | null | undefined,
  numericValue: number,
): boolean {
  if (raw == null) return false;
  if (raw === numericValue) return true;
  const name = USER_ROLE_NAMES[numericValue];
  return typeof raw === "string" && raw.toLowerCase() === name?.toLowerCase();
}

export function isUserStatus(
  raw: number | string | null | undefined,
  numericValue: number,
): boolean {
  if (raw == null) return false;
  if (raw === numericValue) return true;
  const name = USER_STATUS_NAMES[numericValue];
  return typeof raw === "string" && raw.toLowerCase() === name?.toLowerCase();
}
