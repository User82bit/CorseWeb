import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { LanguageContext } from "./languageContext";
import type { LanguageContextValue } from "./languageContext";
import { defaultLocale, type Locale, type Translations } from "./types";
import { resolveLocale } from "./locale";
import { ptBR } from "./translations/pt-BR";
import { en } from "./translations/en";
import { es } from "./translations/es";

const translations: Record<Locale, Translations> = {
    "pt-BR": ptBR,
    en,
    es,
};

const storageKey = "corseweb.locale";

function readStoredLocale(): unknown {
    try {
        return window.localStorage.getItem(storageKey);
    } catch {
        // Storage may be blocked by browser privacy settings. The UI still works
        // with the browser locale and in-memory state when persistence is unavailable.
        return undefined;
    }
}

function persistLocale(locale: Locale): void {
    try {
        window.localStorage.setItem(storageKey, locale);
    } catch {
        // Keep locale switching functional even when localStorage is unavailable.
    }
}

function getInitialLocale(): Locale {
    if (typeof window === "undefined") {
        return defaultLocale;
    }

    return resolveLocale(readStoredLocale(), window.navigator.language);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

    const setLocale = useCallback((nextLocale: Locale) => {
        setLocaleState(nextLocale);
        persistLocale(nextLocale);
    }, []);

    useEffect(() => {
        document.documentElement.lang = locale;
    }, [locale]);

    const value = useMemo<LanguageContextValue>(
        () => ({
            locale,
            setLocale,
            t: translations[locale],
        }),
        [locale, setLocale],
    );

    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
