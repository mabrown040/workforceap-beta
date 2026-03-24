import Link from 'next/link';
import { getActivePrograms } from '@/lib/platform/programCatalog';

export default async function CertificationReferenceSection() {
  const programs = await getActivePrograms();
  const withCerts = programs.filter((p) => (p.certifications?.length ?? 0) > 0 || p.static);

  return (
    <section className="cert-reference-from-catalog" style={{ marginBottom: '2rem', padding: '1.25rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
      <h2 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>Programs & certifications (from catalog)</h2>
      <p style={{ color: 'var(--color-gray-600)', fontSize: '0.9rem', marginBottom: '1rem' }}>
        Active pathways from your organization program catalog. Open a program for full course detail.
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {withCerts.map((p) => {
          const certs =
            p.certifications.length > 0
              ? p.certifications
              : p.static?.skills?.slice(0, 6) ?? [];
          return (
            <li key={p.slug} style={{ marginBottom: '0.85rem', paddingBottom: '0.85rem', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <Link href={`/programs/${p.slug}`} style={{ fontWeight: 600 }}>
                {p.static?.title ?? p.name}
              </Link>
              <span style={{ color: 'var(--color-gray-600)', fontSize: '0.85rem', marginLeft: '0.35rem' }}>
                · {p.category}
              </span>
              {certs.length > 0 && (
                <div style={{ fontSize: '0.85rem', marginTop: '0.25rem', color: 'var(--color-gray-700)' }}>
                  {p.certifications.length > 0 ? 'Certs: ' : 'Focus areas: '}
                  {certs.join(', ')}
                  {p.static?.skills && p.static.skills.length > 6 && p.certifications.length === 0 ? '…' : ''}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
