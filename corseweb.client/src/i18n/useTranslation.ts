import { useContext } from "react";
import { LanguageContext } from "./languageContext";
import type { LanguageContextValue } from "./languageContext";

export function useTranslation(): LanguageContextValue {
    const context = useContext(LanguageContext);

    if (!context) {
        throw new Error("useTranslation deve ser usado dentro de <LanguageProvider>.");
    }

    return context;
}
