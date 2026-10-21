import { defaultLocale, locales } from "./types";
import type { Locale } from "./types";

/**
 * Validates a persisted or external value without trusting a TypeScript cast.
 */
export function isLocale(value: unknown): value is Locale {
    return typeof value === "string" && locales.some((locale) => locale === value);
}

/**
 * Resolves the app locale in priority order:
 * 1. A valid saved locale.
 * 2. An exact browser locale.
 * 3. The best supported locale for the browser language.
 * 4. Portuguese (Brazil), the app default.
 *
 * Browser tags such as en-US and es-MX resolve to en and es. Regional
 * variants that are not supported resolve to the matching language when
 * one exists, otherwise to the default locale.
 */
export function resolveLocale(
    storedValue: unknown,
    browserLocale?: string | null,
): Locale {
    if (isLocale(storedValue)) {
        return storedValue;
    }

    const normalizedBrowserLocale = browserLocale
        ?.trim()
        .replace(/_/g, "-")
        .toLowerCase();

    if (!normalizedBrowserLocale) {
        return defaultLocale;
    }

    const exactMatch = locales.find(
        (locale) => locale.toLowerCase() === normalizedBrowserLocale,
    );

    if (exactMatch) {
        return exactMatch;
    }

    const languageTag = normalizedBrowserLocale.split("-")[0];
    return locales.find(
        (locale) => locale.toLowerCase().split("-")[0] === languageTag,
    ) ?? defaultLocale;
}
