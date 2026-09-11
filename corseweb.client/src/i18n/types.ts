export interface Translations {
    common: {
        seeMore: string;
        loading: string;
        error: string;
        search: string;
        start: string;
        continue: string;
        contact: string;
    };
    home: {
        title: string;
        description: string;
        discoverCourses: string;
        informations: string;
    };
    app: {
        continueStudying: string;
        whyNot: string;
    };
    navbar: {
        home: string;
        courses: string;
        games: string;
        myCourse: string;
    };
    language: {
        label: string;
        "pt-BR": string;
        en: string;
        es: string;
    };
    tags: {
        language: string;
        english: string;

    };
}

export type Locale = "pt-BR" | "en" | "es";

export const locales: Locale[] = ["pt-BR", "en", "es"];

export const defaultLocale: Locale = "pt-BR";
