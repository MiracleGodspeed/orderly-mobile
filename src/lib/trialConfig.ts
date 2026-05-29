/**
 * Single source of truth for the platform's free-trial length used
 * across iOS surfaces. Apple flags trial-length inconsistencies under
 * guideline 2.3.1 (Accurate Metadata) — every screen that mentions
 * the trial duration MUST surface the same number, or the reviewer
 * cites mismatched claims.
 *
 * Update sites:
 *   - `EmailSignUp.tsx` ("14-day free trial" hero copy)
 *   - `TrialWelcomeModal.tsx` ("You're on a 14-day trial..." copy)
 *   - Any future onboarding / marketing surface that claims a trial
 *     duration
 *
 * IMPORTANT: this constant MUST match the backend's trial-period
 * configuration. If the backend ever changes from 14 days, update
 * here too — and update the App Store Connect listing's description
 * if it mentions a specific number.
 *
 * The post-signup `TrialBanner` / `Home` trial card pull from the
 * server's `daysRemaining` value directly and don't need this
 * constant — they show "X days left", not "14 days".
 */
export const TRIAL_DURATION_DAYS = 14;
