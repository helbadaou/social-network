import { ICONS } from "./icons";
import styles from "./icons.module.css";

export default function Icon({
  name,
  size = 24,
  className,
  color = "currentColor",
  fill = false,
  onClick = () => {},
  style = {},
}) {
  const icon = ICONS[name];

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={icon.viewBox}
      width={size}
      height={size}
      className={`${styles.icon} ${className || ""}`}
      fill={fill ? color : "none"}
      onClick={onClick}
      style={style}
    >
      {icon.path}
    </svg>
  );
}
