import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Locale, Translations } from "./types";
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

interface LanguageContextValue {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: Translations;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

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

export function useTranslation(): LanguageContextValue {
    const context = useContext(LanguageContext);

    if (!context) {
        throw new Error("useTranslation deve ser usado dentro de <LanguageProvider>.");
    }

    return context;
}
