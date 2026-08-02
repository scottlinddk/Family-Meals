import type { InfantNote } from "~/domain/types";

/**
 * The only infant-related content in the app: a static, non-personalized
 * reminder. No recipes, calories, or targets are generated for the infant —
 * that depends on individual pediatric/health-visitor guidance, not this app.
 */
export const INFANT_NOTE: InfantNote = {
  text:
    "This app does not plan meals for your 6-month-old. Follow your health " +
    "visitor's (sundhedsplejerske) guidance on introducing solid food. " +
    "General reminders: no honey before 12 months, no added salt or sugar " +
    "before 12 months, and always supervise for choking hazards.",
};
