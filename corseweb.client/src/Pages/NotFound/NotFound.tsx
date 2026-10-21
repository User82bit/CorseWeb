import { Link, useNavigate } from "react-router-dom";
import SvgIcon from "../../UIComplement/SvgIcon/SvgIcon";
import "./NotFound.scss";

function NotFound() {
  const navigate = useNavigate();

  return (
    <section className="not-found">
      <div className="not-found__container">
        <h1 className="not-found__code">404</h1>
        <h2 className="not-found__title">Página não encontrada</h2>
        <p className="not-found__message">
          Desculpe, não conseguimos encontrar a página que você procura. 
          Ela pode ter sido movida ou não existe.
        </p>
        <div className="not-found__actions">
          <button 
            onClick={() => navigate(-1)} 
            className="button button--glass"
          >
            <SvgIcon name="arrow-left" size="20px" />
            Voltar
          </button>
          <Link to="/" className="button button--primary">
            <SvgIcon name="home" size="20px" />
            Ir para o início
          </Link>
        </div>
        <div className="not-found__suggestions">
          <span className="not-found__suggestions-label">Talvez você queira:</span>
          <div className="not-found__suggestions-links">
            <Link to="/courses" className="not-found__suggestion-link">
              <SvgIcon name="user" size="16px" />
              Explorar cursos
            </Link>
            <Link to="/app" className="not-found__suggestion-link">
              <SvgIcon name="monitor" size="20px" />
              Área do aluno
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default NotFound;