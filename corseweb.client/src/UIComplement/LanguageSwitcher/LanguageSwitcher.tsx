import { useEffect, useRef, useState } from "react";
import { useTranslation } from "../../i18n/useTranslation";
import type { Locale } from "../../i18n/types";
import { locales } from "../../i18n/types";
import "./LanguageSwitcher.scss";

function FlagBR() {
    return (
        <svg viewBox="0 0 20 14" aria-hidden="true" focusable="false">
            <rect width="20" height="14" rx="2" fill="#009c3b" />
            <path d="M10 2.2 17.4 7 10 11.8 2.6 7Z" fill="#ffdf00" />
            <circle cx="10" cy="7" r="2.4" fill="#002776" />
        </svg>
    );
}

function FlagUS() {
    return (
        <svg viewBox="0 0 20 14" aria-hidden="true" focusable="false">
            <rect width="20" height="14" rx="2" fill="#b22234" />
            <g fill="#ffffff">
                <rect y="1.4" width="20" height="1.4" />
                <rect y="4.2" width="20" height="1.4" />
                <rect y="7" width="20" height="1.4" />
                <rect y="9.8" width="20" height="1.4" />
                <rect y="12.6" width="20" height="1.4" />
            </g>
            <rect width="8.5" height="7" rx="1" fill="#3c3b6e" />
        </svg>
    );
}

function FlagES() {
    return (
        <svg viewBox="0 0 20 14" aria-hidden="true" focusable="false">
            <rect width="20" height="14" rx="2" fill="#aa151b" />
            <rect y="3.5" width="20" height="7" fill="#f1bf00" />
        </svg>
    );
}

const flags: Record<Locale, { flag: () => React.JSX.Element; label: string }> = {
    "pt-BR": { flag: FlagBR, label: "Português (Brasil)" },
    en: { flag: FlagUS, label: "English" },
    es: { flag: FlagES, label: "Español" },
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

    const ActiveFlag = flags[locale].flag;
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
                    <ActiveFlag />
                </span>
            </button>

            <div className="language-switcher__options" role="listbox" aria-label={t.language.label}>
                {inactiveLocales.map((item) => {
                    const Flag = flags[item].flag;

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
                                <Flag />
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export default LanguageSwitcher;
