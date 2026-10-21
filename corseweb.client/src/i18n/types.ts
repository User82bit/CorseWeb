export interface InformationItem {
    text: string;
    priority: number;
}

export interface HomeStep {
    title: string;
    description: string;
}

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
        newCourses: string;
        informations: InformationItem[];
        skipToContent: string;
        primaryNavigation: string;
        homeLinkLabel: string;
        openMenu: string;
        closeMenu: string;
        login: string;
        dashboard: string;
        logout: string;
        aboutLink: string;
        heroEyebrow: string;
        exploreCta: string;
        aboutCta: string;
        valuePropositionLabel: string;
        heroTrustOne: string;
        heroTrustTwo: string;
        heroTrustThree: string;
        stepsEyebrow: string;
        stepsTitle: string;
        stepsDescription: string;
        steps: HomeStep[];
        coursesEyebrow: string;
        coursesTitle: string;
        coursesDescription: string;
        viewAllCourses: string;
        loadingCourses: string;
        coursesErrorTitle: string;
        coursesErrorDescription: string;
        retryCourses: string;
        emptyCoursesTitle: string;
        emptyCoursesDescription: string;
        emptyCoursesAction: string;
        courseLevelLabel: string;
        lessonUnit: string;
        hourUnit: string;
        openCourse: string;
        ctaEyebrow: string;
        ctaTitle: string;
        ctaDescription: string;
        ctaAction: string;
        footerDescription: string;
    };
    app: {
        continueStudying: string;
        whyNot: string;
        welcomeEyebrow: string;
        greeting: string;
        dashboardDescription: string;
        exploreCatalog: string;
        catalogStatsTitle: string;
        availableCourses: string;
        catalogLessons: string;
        topicAreas: string;
        coursesEyebrow: string;
        coursesTitle: string;
        coursesDescription: string;
        viewCatalog: string;
        openCourse: string;
        openCourseNamed: string;
        oneLesson: string;
        manyLessons: string;
        noLessonsYet: string;
        loadingCatalog: string;
        catalogSyncWarning: string;
        catalogErrorTitle: string;
        catalogErrorDescription: string;
        retryCatalog: string;
        emptyCatalogTitle: string;
        emptyCatalogDescription: string;
        skipToContent: string;
        primaryNavigation: string;
        openMenu: string;
        closeMenu: string;
        sectionLabel: string;
        returnToSite: string;
        defaultLearnerName: string;
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

export const locales = ["pt-BR", "en", "es"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "pt-BR";
