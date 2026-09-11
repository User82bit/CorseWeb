import './CardCourseBase.scss';

interface Props {
  children?: React.ReactNode;
}

function CardCourseBase({ children }: Props) {
  return (
    <div className="card ">
      {children}
    </div>
  );
}

export default CardCourseBase;