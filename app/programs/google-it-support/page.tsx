import type { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';
import Footer from '@/components/Footer';
import LocalizedLinkServer from '@/components/LocalizedLinkServer';
import MobileBottomNav from '@/components/MobileBottomNav';
import { getRequestLocale } from '@/lib/i18n/server';
import {
  GOOGLE_IT_LANDING_SLUG,
  GOOGLE_IT_PRIMARY_HANDOFF_PROGRAM_SLUG,
  buildGoogleItPublicMetricCards,
  loadGoogleItLandingMetrics,
} from '@/lib/marketing/googleItSupportLanding';

const APPLY_HREF = `/apply?source=organic_google_it_support&program=${GOOGLE_IT_PRIMARY_HANDOFF_PROGRAM_SLUG}&intent=enroll`;
const FIT_HREF = `/career-quiz?source=organic_google_it_support&program=${GOOGLE_IT_LANDING_SLUG}`;
const WIOA_HREF = `/wioa-qualification?source=organic_google_it_support&program=${GOOGLE_IT_LANDING_SLUG}`;

const COPY = {
  en: {
    metaTitle: 'Google IT Support Certificate Training — No-Cost Career Path',
    metaDescription:
      'Explore WorkforceAP’s no-cost Google IT Support career pathway, check fit without an account, and start a soft application handoff when you are ready.',
    eyebrow: 'Google IT Support career pathway',
    title: 'Train for IT support roles without taking on tuition debt.',
    subtitle:
      'A public, no-account-needed landing page for adults comparing Google IT Support, help desk, and entry-level technical support training through WorkforceAP.',
    fitCta: 'Check my career fit',
    applyCta: 'Start soft application',
    noAccount: 'No account required for the fit check. Create an account only when you are ready to save an application.',
    proofTitle: 'Honest outcomes, shown only when reliable',
    proofFallback:
      'Live program metrics are suppressed until WorkforceAP has enough verified enrollment, completion, and placement data for this pathway.',
    proofMethodology: 'Methodology: enrollments can show once live; rates require minimum sample thresholds.',
    wioaTitle: 'Could this be $0 for you?',
    wioaBody:
      'Many WorkforceAP members qualify through WIOA or workforce-development funding. Use this quick self-check before you apply; it is not a legal eligibility determination.',
    wioaBullets: [
      'You live in Texas or can participate with a partner workforce program.',
      'You are unemployed, underemployed, low-income, or facing a barrier to work.',
      'You can spend about 5–10 hours per week on online training and job-readiness support.',
    ],
    wioaCta: 'Check WIOA / $0 fit',
    fitTitle: 'Is IT support a fit?',
    fitBody:
      'This pathway is best for people who like solving practical problems, helping users, and building confidence with computers, networks, operating systems, and troubleshooting.',
    fitCards: [
      ['Good fit if', 'You are patient with people, curious about why devices fail, and willing to document each step.'],
      ['May need a bridge if', 'You do not yet have reliable device access or basic computer confidence — Digital Literacy can come first.'],
      ['Next roles', 'Help desk technician, desktop support, technical support specialist, junior IT support.'],
    ],
    curriculumTitle: 'What you will build toward',
    curriculumItems: [
      'Technical support fundamentals and ticket-handling habits',
      'Computer hardware, operating systems, and basic networking',
      'Security basics, escalation, customer communication, and documentation',
      'Resume, interview, and job-search support before employer introductions',
    ],
    handoffTitle: 'A soft handoff, not a hard sell',
    handoffBody:
      'Start with the public fit check. If the pathway looks right, the application asks for the details a counselor needs, then hands off to account creation so you can save progress and enroll.',
    finalTitle: 'Want to see if Google IT Support is your path?',
    finalBody: 'Check career fit first, then move into the application only if the pathway makes sense.',
  },
  es: {
    metaTitle: 'Capacitación Google IT Support — ruta profesional sin costo',
    metaDescription:
      'Explora la ruta de WorkforceAP para Google IT Support sin costo, revisa si encaja contigo sin crear cuenta y comienza una solicitud suave cuando estés listo.',
    eyebrow: 'Ruta profesional Google IT Support',
    title: 'Capacítate para puestos de soporte de TI sin asumir deuda de matrícula.',
    subtitle:
      'Una página pública, sin cuenta obligatoria, para adultos que comparan Google IT Support, mesa de ayuda y capacitación técnica de nivel inicial con WorkforceAP.',
    fitCta: 'Revisar si encaja conmigo',
    applyCta: 'Iniciar solicitud suave',
    noAccount: 'No necesitas cuenta para revisar el encaje. Crea una cuenta solo cuando estés listo para guardar una solicitud.',
    proofTitle: 'Resultados honestos, mostrados solo cuando son confiables',
    proofFallback:
      'Las métricas en vivo se ocultan hasta que WorkforceAP tenga suficientes datos verificados de inscripción, finalización y colocación para esta ruta.',
    proofMethodology: 'Metodología: las inscripciones pueden mostrarse cuando están en vivo; las tasas requieren mínimos de muestra.',
    wioaTitle: '¿Podría costarte $0?',
    wioaBody:
      'Muchos miembros de WorkforceAP califican mediante WIOA u otros fondos de desarrollo laboral. Usa esta revisión rápida antes de solicitar; no es una determinación legal de elegibilidad.',
    wioaBullets: [
      'Vives en Texas o puedes participar con un programa laboral socio.',
      'Estás desempleado, subempleado, tienes bajos ingresos o enfrentas una barrera laboral.',
      'Puedes dedicar unas 5–10 horas por semana a capacitación en línea y apoyo de preparación laboral.',
    ],
    wioaCta: 'Revisar encaje WIOA / $0',
    fitTitle: '¿Soporte de TI encaja contigo?',
    fitBody:
      'Esta ruta es ideal para personas a quienes les gusta resolver problemas prácticos, ayudar a usuarios y ganar confianza con computadoras, redes, sistemas operativos y diagnóstico.',
    fitCards: [
      ['Buen encaje si', 'Tienes paciencia con las personas, curiosidad por fallas técnicas y disposición para documentar cada paso.'],
      ['Quizás necesitas un puente si', 'Aún no tienes acceso confiable a un dispositivo o confianza básica con computadoras — Alfabetización Digital puede ir primero.'],
      ['Próximos puestos', 'Técnico de mesa de ayuda, soporte de escritorio, especialista de soporte técnico, soporte de TI junior.'],
    ],
    curriculumTitle: 'Hacia qué te preparas',
    curriculumItems: [
      'Fundamentos de soporte técnico y hábitos para manejar tickets',
      'Hardware, sistemas operativos y redes básicas',
      'Conceptos de seguridad, escalamiento, comunicación con usuarios y documentación',
      'Apoyo con currículum, entrevistas y búsqueda laboral antes de presentaciones con empleadores',
    ],
    handoffTitle: 'Un traspaso suave, no una venta agresiva',
    handoffBody:
      'Empieza con la revisión pública de encaje. Si la ruta parece correcta, la solicitud pide los datos que necesita un consejero y luego pasa a creación de cuenta para guardar avance e inscribirte.',
    finalTitle: '¿Quieres saber si Google IT Support es tu ruta?',
    finalBody: 'Revisa primero el encaje profesional y pasa a la solicitud solo si la ruta tiene sentido.',
  },
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const copy = COPY[locale === 'es' ? 'es' : 'en'];

  return buildPageMetadataAsync({
    title: copy.metaTitle,
    description: copy.metaDescription,
    path: '/programs/google-it-support',
    image: '/api/og/program?slug=google-it-support',
  });
}

export default async function GoogleItSupportLandingPage() {
  const locale = await getRequestLocale();
  const copy = COPY[locale === 'es' ? 'es' : 'en'];
  const metrics = await loadGoogleItLandingMetrics();
  const metricCards = buildGoogleItPublicMetricCards(metrics);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'EducationalOccupationalProgram',
            name: 'Google IT Support career pathway',
            description: copy.metaDescription,
            provider: {
              '@type': 'Organization',
              name: 'Workforce Advancement Project',
              url: 'https://www.workforceap.org',
            },
            educationalProgramMode: 'online',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'USD',
              description: 'No cost for qualifying members through WIOA and workforce development funding.',
            },
            url: 'https://www.workforceap.org/programs/google-it-support',
          }),
        }}
      />

      <main>
        <section className="relative overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(173,44,77,0.38),transparent_36%),radial-gradient(circle_at_80%_0%,rgba(43,123,185,0.32),transparent_32%),linear-gradient(135deg,#0f172a,#111827_55%,#020617)] px-4 pb-20 pt-28 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="mb-5 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.22em] text-rose-100">
                {copy.eyebrow}
              </p>
              <h1 className="max-w-4xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
                {copy.title}
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200 sm:text-xl">{copy.subtitle}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <LocalizedLinkServer
                  href={FIT_HREF}
                  className="rounded-full bg-white px-6 py-3 text-center font-bold text-slate-950 shadow-xl shadow-black/20 transition hover:-translate-y-0.5 hover:bg-slate-100"
                >
                  {copy.fitCta}
                </LocalizedLinkServer>
                <LocalizedLinkServer
                  href={APPLY_HREF}
                  className="rounded-full border border-white/25 px-6 py-3 text-center font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
                >
                  {copy.applyCta}
                </LocalizedLinkServer>
              </div>
              <p className="mt-4 text-sm font-medium text-slate-300">{copy.noAccount}</p>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur">
              <h2 className="text-2xl font-bold">{copy.proofTitle}</h2>
              {metricCards.length > 0 ? (
                <div className="mt-6 grid gap-4">
                  {metricCards.map((card) => (
                    <div key={card.key} className="rounded-2xl bg-white p-5 text-slate-950">
                      <div className="text-4xl font-black">{card.value}</div>
                      <div className="mt-1 text-sm font-bold uppercase tracking-wide text-rose-800">{card.label}</div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{card.detail}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-5 rounded-2xl border border-dashed border-white/25 bg-black/20 p-5 text-slate-200">
                  {copy.proofFallback}
                </p>
              )}
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-300">{metrics.asOfLabel}</p>
              <p className="mt-2 text-xs text-slate-400">{copy.proofMethodology}</p>
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-16 text-slate-950 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-8 shadow-sm">
              <h2 className="text-3xl font-black">{copy.wioaTitle}</h2>
              <p className="mt-4 leading-7 text-slate-700">{copy.wioaBody}</p>
              <ul className="mt-6 space-y-3 text-slate-700">
                {copy.wioaBullets.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-700">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <LocalizedLinkServer
                href={WIOA_HREF}
                className="mt-7 inline-flex rounded-full bg-rose-800 px-5 py-3 font-bold text-white transition hover:bg-rose-900"
              >
                {copy.wioaCta}
              </LocalizedLinkServer>
            </div>

            <div className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-xl">
              <h2 className="text-3xl font-black">{copy.fitTitle}</h2>
              <p className="mt-4 leading-7 text-slate-300">{copy.fitBody}</p>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {copy.fitCards.map(([title, body]) => (
                  <article key={title} className="rounded-2xl border border-white/10 bg-white/10 p-5">
                    <h3 className="font-bold text-rose-100">{title}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-300">{body}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-slate-100 px-4 py-16 text-slate-950 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-black">{copy.curriculumTitle}</h2>
              <div className="mt-8 grid gap-4">
                {copy.curriculumItems.map((item, index) => (
                  <div key={item} className="rounded-2xl bg-white p-5 shadow-sm">
                    <div className="text-sm font-black uppercase tracking-wide text-rose-800">0{index + 1}</div>
                    <p className="mt-2 text-lg font-semibold">{item}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[2rem] bg-white p-8 shadow-sm">
              <h2 className="text-3xl font-black">{copy.handoffTitle}</h2>
              <p className="mt-4 leading-8 text-slate-700">{copy.handoffBody}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <LocalizedLinkServer href={FIT_HREF} className="rounded-full bg-slate-950 px-5 py-3 text-center font-bold text-white">
                  {copy.fitCta}
                </LocalizedLinkServer>
                <LocalizedLinkServer href={APPLY_HREF} className="rounded-full border border-slate-300 px-5 py-3 text-center font-bold text-slate-950">
                  {copy.applyCta}
                </LocalizedLinkServer>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-gradient-to-br from-rose-900 to-slate-950 px-4 py-16 text-center text-white sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-black sm:text-4xl">{copy.finalTitle}</h2>
            <p className="mt-4 text-lg text-slate-200">{copy.finalBody}</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <LocalizedLinkServer href={FIT_HREF} className="rounded-full bg-white px-6 py-3 font-bold text-slate-950">
                {copy.fitCta}
              </LocalizedLinkServer>
              <LocalizedLinkServer href={APPLY_HREF} className="rounded-full border border-white/25 px-6 py-3 font-bold text-white">
                {copy.applyCta}
              </LocalizedLinkServer>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
