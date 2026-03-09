export default function PageHero({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <section className="page-hero">
      <div className="page-hero-content">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </section>
  );
}
