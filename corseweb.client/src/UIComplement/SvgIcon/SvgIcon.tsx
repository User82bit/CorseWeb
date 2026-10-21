import type { CSSProperties } from "react";
import arrowLeft from "../../assets/icons/arrow-left.svg?url";
import arrowRight from "../../assets/icons/arrow-right.svg?url";
import bell from "../../assets/icons/bell.svg?url";
import bookOpen from "../../assets/icons/book-open.svg?url";
import check from "../../assets/icons/check.svg?url";
import clock from "../../assets/icons/clock.svg?url";
import close from "../../assets/icons/close.svg?url";
import home from "../../assets/icons/home.svg?url";
import logOut from "../../assets/icons/log-out.svg?url";
import menu from "../../assets/icons/menu.svg?url";
import monitor from "../../assets/icons/monitor.svg?url";
import plus from "../../assets/icons/plus.svg?url";
import search from "../../assets/icons/search.svg?url";
import user from "../../assets/icons/user.svg?url";
import "./SvgIcon.scss";

const iconSources = {
  "arrow-left": arrowLeft,
  "arrow-right": arrowRight,
  bell,
  "book-open": bookOpen,
  check,
  clock,
  close,
  home,
  "log-out": logOut,
  menu,
  monitor,
  plus,
  search,
  user,
} as const;

export type SvgIconName = keyof typeof iconSources;

type SvgIconProps = {
  name: SvgIconName;
  size?: CSSProperties["width"];
  className?: string;
};

function SvgIcon({ name, size = "1.25rem", className }: SvgIconProps) {
  const mask = `url("${iconSources[name]}")`;
  const style: CSSProperties = {
    width: size,
    height: size,
    maskImage: mask,
    WebkitMaskImage: mask,
  };

  return (
    <span
      aria-hidden="true"
      className={`svg-icon${className ? ` ${className}` : ""}`}
      style={style}
    />
  );
}

export default SvgIcon;
