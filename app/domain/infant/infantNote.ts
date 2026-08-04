import type { InfantNote } from "~/domain/types";

/**
 * The only infant-related content in the app: a static, non-personalized
 * reminder. No recipes, calories, or targets are generated for the infant —
 * that depends on individual pediatric/health-visitor guidance, not this app.
 *
 * Only the translation key lives here; the copy itself is in the i18n
 * dictionaries alongside every other user-facing string, so the note reads in
 * Danish like the rest of the app. `as const` keeps the key a literal type, so
 * renaming it in the dictionary breaks the `t()` call instead of silently
 * falling back to showing the raw key.
 */
export const INFANT_NOTE = { textKey: "infant.note" } as const satisfies InfantNote;
