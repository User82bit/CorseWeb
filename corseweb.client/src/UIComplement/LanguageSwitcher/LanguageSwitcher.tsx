import { useEffect, useRef, useState } from "react";
import { useTranslation } from "../../i18n/useTranslation";
import type { Locale } from "../../i18n/types";
import { locales } from "../../i18n/types";
import brazilFlag from "../../assets/flags/pt-BR.svg?url";
import englishFlag from "../../assets/flags/en.svg?url";
import spanishFlag from "../../assets/flags/es.svg?url";
import "./LanguageSwitcher.scss";

const flags: Record<Locale, { src: string; label: string }> = {
    "pt-BR": { src: brazilFlag, label: "Português (Brasil)" },
    en: { src: englishFlag, label: "English" },
    es: { src: spanishFlag, label: "Español" },
};

function LanguageSwitcher() {
    const { locale, setLocale, t } = useTranslation();
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) {
            return;
        }

        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }

        function handleEscape(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, [open]);

    function handleSelect(nextLocale: Locale) {
        setLocale(nextLocale);
        setOpen(false);
    }

    const activeFlag = flags[locale];
    const inactiveLocales = locales.filter((item) => item !== locale);

    return (
        <div
            ref={containerRef}
            className={`language-switcher${open ? " language-switcher--open" : ""}`}
        >
            <button
                type="button"
                className="language-switcher__button language-switcher__button--active"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                aria-haspopup="listbox"
                aria-label={`${t.language.label}: ${flags[locale].label}`}
                title={flags[locale].label}
            >
                <span className="language-switcher__flag">
                    <img src={activeFlag.src} alt="" />
                </span>
            </button>

            <div className="language-switcher__options" role="listbox" aria-label={t.language.label}>
                {inactiveLocales.map((item) => {
                    const flag = flags[item];

                    return (
                        <button
                            key={item}
                            type="button"
                            role="option"
                            aria-selected={false}
                            className="language-switcher__button"
                            onClick={() => handleSelect(item)}
                            aria-label={flags[item].label}
                            title={flags[item].label}
                            tabIndex={open ? 0 : -1}
                        >
                            <span className="language-switcher__flag">
                                <img src={flag.src} alt="" />
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export default LanguageSwitcher;
