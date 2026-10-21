import { createContext } from "react";
import type { Locale, Translations } from "./types";

export interface LanguageContextValue {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: Translations;
}

export const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);
