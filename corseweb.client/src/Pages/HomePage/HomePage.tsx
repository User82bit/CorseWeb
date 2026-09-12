import LanguageSwitcher from "../../UIComplement/LanguageSwitcher/LanguageSwitcher";
import { useTranslation } from "../../i18n/LanguageContext";

import CardGuidLayout from "../../UIComplement/CardGuidLayout/CardGuidLayout"
import CardCourseBase from "../../UIComplement/CardCourseBase/CardCourseBase"
import "./HomePage.scss";

function HomePage() {
    // const getClassByPriority = (priority: number) => {
    //     const classS: Record<number, string> = {
    //         1: "opacity-100 ",
    //         2: "opacity-90",
    //         3: "opacity-80",
    //         4: "opacity-70",
    //         5: "opacity-60",
    //         6: "opacity-50",
    //         7: "opacity-40",
    //         8: "opacity-30",
    //         9: "opacity-10"
    //     };
    //     return classS[priority] || "opacity-100";
    // };
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
                <div className="grid">
                    {t.home.informations.map((info, index) => (
                        <p
                            className={`hero__informations${info.priority}`}
                            key={index}
                        >
                            {info.text}
                        </p>
                    ))}
                </div>
            </section>
            <section id="courses">
                <h2 className="home-section-title">{t.home.discoverCourses}</h2>
                <CardGuidLayout children=
                    {<>
                        <CardCourseBase children={
                            <article className="card">
                                <div className="card__banner">
                                    <img src="/icons.svg" alt="Image" />
                                </div>
                                <div className="card__content">
                                    <div className="card__tags">
                                        <span className="card__tag">{t.tags.language}</span>
                                        <span className="card__tag card__tag--featured">{t.tags.english}</span>
                                    </div>
                                    <h2 className="card__title">Título do card</h2>
                                    <p className="card__description">
                                        Descrição do conteúdo do card.
                                    </p>
                                    <a href="#" className="card__button button">
                                        {t.common.seeMore}
                                    </a>
                                </div>
                            </article>
                        } />
                    </>}
                />
            </section>
        </>
    );
}

export default HomePage;