import CardCourseBase from "../../../UIComplement/CardCourseBase/CardCourseBase";
import CardGuidLayout from "../../../UIComplement/CardGuidLayout/CardGuidLayout";
import { useTranslation } from "../../../i18n/LanguageContext";

function HomeCoursePage() {
    const { t } = useTranslation();

    return (
        <>
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
                    }/>
                </>}
            />
        </>
    );
}

export default HomeCoursePage;