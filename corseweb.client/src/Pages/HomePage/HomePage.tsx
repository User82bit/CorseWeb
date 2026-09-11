import LanguageSwitcher from "../../UIComplement/LanguageSwitcher/LanguageSwitcher";
import { useTranslation } from "../../i18n/LanguageContext";
import "./HomePage.scss";

function HomePage() {
    const { t } = useTranslation();

    return (
        <>
            <section className="hero">
                <div className="home-language">
                    <LanguageSwitcher />
                </div>
                <h1 className="hero__title">
                    {t.home.title || "Aprenda de graça, no seu ritmo."}
                </h1>
                <p className="hero__description">
                    {t.home.description ||
                        "Uma estante pessoal de cursos 100% gratuitos. Comece agora, sem cadastro e sem custo."}
                </p>
                <div className="hero__actions">
                    <a href="#courses" className="button">
                        {t.home.discoverCourses || "Explorar cursos"}
                    </a>
                </div>
            </section>
        </>
    );
}

export default HomePage;