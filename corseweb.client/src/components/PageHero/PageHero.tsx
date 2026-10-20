import { Link } from "react-router-dom";
import "./PageHero.scss";

type PageHeroAction = {
  label: string;
  to?: string;
  href?: string;
  variant?: "primary" | "glass" | "ghost";
  onClick?: () => void;
};

type PageHeroProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: PageHeroAction[];
  meta?: string;
  size?: "sm" | "md";
  children?: React.ReactNode;
};

function PageHero({ eyebrow, title, description, actions, meta, size = "md", children }: PageHeroProps) {
  return (
    <section className={`page-hero page-hero--${size}`}>
      <div className="page-hero__inner">
        {eyebrow && <p className="page-hero__eyebrow">{eyebrow}</p>}
        <h1 className="page-hero__title">{title}</h1>
        {description && <p className="page-hero__description">{description}</p>}
        {meta && <p className="page-hero__meta">{meta}</p>}
        {actions && actions.length > 0 && (
          <div className="page-hero__actions">
            {actions.map((a, i) =>
              a.to ? (
                <Link key={i} to={a.to} className={`button button--${a.variant ?? "primary"}`}>
                  {a.label}
                </Link>
              ) : a.href ? (
                <a key={i} href={a.href} className={`button button--${a.variant ?? "primary"}`}>
                  {a.label}
                </a>
              ) : (
                <button key={i} onClick={a.onClick} className={`button button--${a.variant ?? "primary"}`}>
                  {a.label}
                </button>
              ),
            )}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

export default PageHero;
