import styles from "./CategoryCard.module.css";

type CategoryCardProps = {
  title: string;
  description: string;
  glow: "orange" | "green";
  iconSrc: string;
  iconAlt: string;
  iconVariant?: "default" | "trophy";
  onClick?: () => void;
  href?: string;
};

export function CategoryCard({
  title,
  description,
  glow,
  iconSrc,
  iconAlt,
  iconVariant = "default",
  onClick,
  href,
}: CategoryCardProps) {
  const commonProps = {
    className: styles.card,
    "data-glow": glow,
    "aria-label": description,
  };

  const content = (
    <>
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
      </div>
      <div className={styles.iconWrap} data-variant={iconVariant}>
        <img
          className={styles.icon}
          src={iconSrc}
          alt={iconAlt}
          data-variant={iconVariant}
        />
      </div>
      <p className={styles.description}>{description}</p>
    </>
  );

  if (onClick) {
    return (
      <button {...commonProps} onClick={onClick} type="button">
        {content}
      </button>
    );
  }

  return (
    <a {...commonProps} href={href}>
      {content}
    </a>
  );
}
