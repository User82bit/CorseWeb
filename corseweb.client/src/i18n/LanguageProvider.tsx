import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Locale, Translations } from "./types";
import { LanguageContext } from "./languageContext";
import type { LanguageContextValue } from "./languageContext";
import { defaultLocale, locales } from "./types";
import { ptBR } from "./translations/pt-BR";
import { en } from "./translations/en";
import { es } from "./translations/es";

const translations: Record<Locale, Translations> = {
    "pt-BR": ptBR,
    en,
    es,
};

const storageKey = "corseweb.locale";

function getInitialLocale(): Locale {
    if (typeof window === "undefined") {
        return defaultLocale;
    }

    const stored = window.localStorage.getItem(storageKey) as Locale | null;

    if (stored && locales.includes(stored)) {
        return stored;
    }

    const browserLocale = window.navigator.language;
    const match = locales.find(
        (locale) => browserLocale === locale || browserLocale.startsWith(locale.split("-")[0])
    );

    return match ?? defaultLocale;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

    const setLocale = useCallback((nextLocale: Locale) => {
        setLocaleState(nextLocale);
        window.localStorage.setItem(storageKey, nextLocale);
        document.documentElement.lang = nextLocale;
    }, []);

    const value = useMemo<LanguageContextValue>(
        () => ({
            locale,
            setLocale,
            t: translations[locale],
        }),
        [locale, setLocale]
    );

    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
