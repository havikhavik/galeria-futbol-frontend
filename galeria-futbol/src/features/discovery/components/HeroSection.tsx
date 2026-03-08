import styles from "./HeroSection.module.css";

export function HeroSection() {
  return (
    <section className={styles.hero} aria-labelledby="home-title">
      <h1 id="home-title" className={styles.title}>
        Encuentra tu camiseta perfecta
      </h1>
      <p className={styles.subtitle}>
        Explora la galeria navegando por las diferentes categorias o introduce
        el nombre de la camiseta en el buscador.
      </p>
    </section>
  );
}
