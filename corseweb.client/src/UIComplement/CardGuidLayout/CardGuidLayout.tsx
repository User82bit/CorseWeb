import './CardGuidLayout.scss';

interface Props {
  children?: React.ReactNode;
}

function CardGuidLayout({ children }: Props) {
  return (
    <div className="conteiner grid card-grid">
      {children}
    </div>
  );
}

export default CardGuidLayout;