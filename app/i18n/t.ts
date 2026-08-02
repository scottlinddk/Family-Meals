import { DEFAULT_LOCALE, type Locale } from "~/i18n/locale";
import { da } from "~/i18n/dictionaries/da";
import { en } from "~/i18n/dictionaries/en";

const dictionaries: Record<Locale, Record<string, string>> = { da, en };

export type TranslationKey = keyof typeof da;

/**
 * Translates `key` for `locale` (defaults to the app-wide default, Danish),
 * substituting `{{name}}` placeholders from `vars`. Falls back to English,
 * then the raw key, if a translation is missing.
 */
export function t(
  key: TranslationKey,
  vars?: Record<string, string | number>,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const template = dictionaries[locale][key] ?? dictionaries.en[key] ?? key;
  if (!vars) return template;
  return Object.entries(vars).reduce(
    (str, [name, value]) => str.replaceAll(`{{${name}}}`, String(value)),
    template,
  );
}
