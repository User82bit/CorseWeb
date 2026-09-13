import { Link, useNavigate } from "react-router-dom";
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Voltar
          </button>
          <Link to="/" className="button button--primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Ir para o início
          </Link>
        </div>
        <div className="not-found__suggestions">
          <span className="not-found__suggestions-label">Talvez você queira:</span>
          <div className="not-found__suggestions-links">
            <Link to="/courses" className="not-found__suggestion-link">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Explorar cursos
            </Link>
            <Link to="/app" className="not-found__suggestion-link">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8" />
                <path d="M12 17v4" />
              </svg>
              Área do aluno
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default NotFound;