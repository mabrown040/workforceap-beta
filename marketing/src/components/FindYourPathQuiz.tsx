import { useState } from 'react';
import { PROGRAMS as PROGRAM_CATALOG, salaryRangeDisplay } from '../data/programs';
import { trackQuizFunnel } from '../lib/marketingDataLayer';

/**
 * Find Your Path — career-match quiz, ported to the Astro marketing site as a
 * React island (hydrated via client:visible).
 *
 * Truth-lock: questions, answer wording, scoring weights, recommendation ramp,
 * and "why this fits" reasoning are copied VERBATIM from the live Next funnel:
 *   - app/(decision-journey)/find-your-path/FindYourPathClient.tsx (QUESTIONS, UX)
 *   - lib/content/quizScoring.ts (scoreQuiz, defaults, merge)
 *   - lib/content/quizProgramRecommendations.ts (getTopProgramsFromQuiz)
 *   - lib/content/quizReasoning.ts (getFitReasoning, getTopFitSummary)
 *
 * The Next version POSTs to /api/careers/recommend and falls back to
 * getTopProgramsFromQuiz when that call fails. The static marketing site has no
 * such API, so we use the exact same client-side fallback the funnel already
 * ships — no rewording, no fabricated results.
 */

/* ───────────────────────── quizScoring.ts (verbatim) ───────────────────────── */

const CATEGORY_KEYS = [
  'it-cyber',
  'ai-software',
  'cloud-data',
  'business',
  'healthcare',
  'manufacturing',
  'digital-literacy',
] as const;

type CategoryKey = (typeof CATEGORY_KEYS)[number];
type CategoryWeights = Record<CategoryKey, number>;

type Q1Answer = 'computers' | 'health' | 'building' | 'managing' | 'data' | 'not_sure';
type Q2Answer = 'brand_new' | 'some_knowledge' | 'work_experience' | 'certifications';
type Q3Answer = 'as_fast' | '3_5_months' | 'planning_ahead' | 'employed_switch';
type Q4Answer = 'salary' | 'stability' | 'remote' | 'community' | 'hands';
type Q5Answer = 'comfortable' | 'basic_apps' | 'tech_savvy' | 'basics';
type Q6Answer = 'yes_computer' | 'no_computer' | 'needs_device';

type QuizAnswers = {
  q1: Q1Answer;
  q2: Q2Answer;
  q3: Q3Answer;
  q4: Q4Answer;
  q5: Q5Answer;
  q6: Q6Answer;
};

type AnswerValue = QuizAnswers[keyof QuizAnswers];

const QUIZ_SHORT_FORM_DEFAULTS: Pick<QuizAnswers, 'q4' | 'q5' | 'q6'> = {
  q4: 'stability',
  q5: 'comfortable',
  q6: 'yes_computer',
};

function createEmptyWeights(): CategoryWeights {
  return {
    'it-cyber': 0,
    'ai-software': 0,
    'cloud-data': 0,
    business: 0,
    healthcare: 0,
    manufacturing: 0,
    'digital-literacy': 0,
  };
}

function mergeQuizShortAnswers(partial: Pick<QuizAnswers, 'q1' | 'q2' | 'q3'>): QuizAnswers {
  return { ...partial, ...QUIZ_SHORT_FORM_DEFAULTS };
}

function scoreQuiz(answers: QuizAnswers): CategoryWeights {
  const w = createEmptyWeights();

  // Q1
  switch (answers.q1) {
    case 'computers':
      w['it-cyber'] += 3;
      w['ai-software'] += 2;
      break;
    case 'health':
      w.healthcare += 4;
      break;
    case 'building':
      w.manufacturing += 4;
      break;
    case 'managing':
      w.business += 3;
      break;
    case 'data':
      w['cloud-data'] += 3;
      w['ai-software'] += 2;
      break;
    case 'not_sure':
      CATEGORY_KEYS.forEach((k) => (w[k] += 1));
      break;
  }

  // Q2
  switch (answers.q2) {
    case 'brand_new':
      w['digital-literacy'] += 2;
      break;
    case 'some_knowledge':
      w['it-cyber'] += 1;
      w['cloud-data'] += 1;
      w.business += 1;
      break;
    case 'work_experience':
      w['ai-software'] += 1;
      w['cloud-data'] += 1;
      break;
    case 'certifications':
      w['ai-software'] += 2;
      w['cloud-data'] += 2;
      break;
  }

  // Q3
  switch (answers.q3) {
    case 'as_fast':
      w['digital-literacy'] += 2;
      w['it-cyber'] += 1;
      break;
    case '3_5_months':
      w['it-cyber'] += 1;
      w['cloud-data'] += 1;
      w.business += 1;
      break;
    case 'planning_ahead':
      w['ai-software'] += 1;
      w['cloud-data'] += 1;
      break;
    case 'employed_switch':
      w.business += 1;
      break;
  }

  // Q4
  switch (answers.q4) {
    case 'salary':
      w['cloud-data'] += 2;
      w['ai-software'] += 2;
      break;
    case 'stability':
      w['it-cyber'] += 2;
      w.healthcare += 1;
      break;
    case 'remote':
      w['cloud-data'] += 1;
      w['ai-software'] += 1;
      w.business += 1;
      break;
    case 'community':
      w.healthcare += 1;
      w.manufacturing += 1;
      break;
    case 'hands':
      w.manufacturing += 3;
      break;
  }

  // Q5
  switch (answers.q5) {
    case 'basic_apps':
      w['digital-literacy'] += 2;
      break;
    case 'tech_savvy':
      w['ai-software'] += 2;
      w['cloud-data'] += 1;
      break;
    case 'basics':
      w['digital-literacy'] += 3;
      break;
    case 'comfortable':
      break;
  }

  // Q6 - Computer access affects digital literacy priority
  switch (answers.q6) {
    case 'no_computer':
    case 'needs_device':
      w['digital-literacy'] += 2;
      break;
    case 'yes_computer':
      break;
  }

  return w;
}

/* ───────────────────── program catalog (real PROGRAMS subset) ─────────────────────
   slug / title / category(quiz key) / categoryLabel / categoryColor / duration /
   salary / partner — sourced from lib/content/programs.ts (PROGRAMS) via the same
   data already mirrored in marketing/src/pages/programs.astro. Verbatim values. */

type Program = {
  slug: string;
  title: string;
  category: CategoryKey;
  categoryLabel: string;
  categoryColor: string;
  duration: string;
  salary: string;
  partner: string;
};

const CAT_COLOR: Record<CategoryKey, string> = {
  'it-cyber': '#2b7bb9',
  'ai-software': '#8b4a9b',
  'cloud-data': '#0d9488',
  business: '#4a9b4f',
  healthcare: '#e11d48',
  manufacturing: '#ea580c',
  'digital-literacy': '#6b7280',
};

const CAT_LABEL: Record<CategoryKey, string> = {
  'it-cyber': 'IT & Cybersecurity',
  'ai-software': 'AI & Software Dev',
  'cloud-data': 'Cloud & Data',
  business: 'Business',
  healthcare: 'Healthcare',
  manufacturing: 'Manufacturing',
  'digital-literacy': 'Digital Literacy',
};

function mk(slug: string, categoryOverride?: CategoryKey): Program {
  const source = PROGRAM_CATALOG.find((program) => program.slug === slug);
  if (!source) throw new Error(`Missing marketing program: ${slug}`);
  const category = categoryOverride ?? source.category as CategoryKey;
  return {
    slug: source.slug,
    title: source.title,
    category,
    categoryLabel: CAT_LABEL[category],
    categoryColor: CAT_COLOR[category],
    duration: source.duration,
    salary: salaryRangeDisplay(source),
    partner: source.partner,
  };
}

const PROGRAMS: Program[] = [
  mk('digital-literacy-empowerment-class'),
  mk('it-support-professional-certificate-ibm'),
  mk('comptia-a-professional-certificate'),
  mk('comptia-network-professional-certificate'),
  mk('comptia-security-professional-certificate'),
  mk('cybersecurity-professional-certificate-google'),
  mk('data-analytics-professional-certificate-google'),
  mk('data-science-professional-certificate-ibm'),
  mk('aws-cloud-technology-amazon'),
  mk('ai-practitioner-professional-certificate-aws'),
  mk('software-developer-professional-certificate-ibm'),
  mk('it-automation-with-python-google'),
  mk('ux-design-professional-certificate-google'),
  mk('project-management-professional-certificate-microsoft'),
  mk('digital-marketing-e-commerce-google'),
  mk('health-information-technology-mchit'),
  mk('certified-production-technician-cpt'),
  mk('certified-logistics-technician-clt'),
  mk('core-construction-training-certificate'),
  mk('it-support-and-entry-level-cyber-security-certificate', 'it-cyber'),
];

function getProgramBySlug(slug: string): Program | undefined {
  return PROGRAMS.find((p) => p.slug === slug);
}

/* ─────────────── quizProgramRecommendations.ts (verbatim logic) ─────────────── */

const ANCHOR_DIGITAL_LITERACY_SLUG = 'digital-literacy-empowerment-class';
const ANCHOR_IT_SUPPORT_SLUG = 'it-support-professional-certificate-ibm';

function getTopProgramsFromQuiz(weights: CategoryWeights, answers: QuizAnswers): Program[] {
  const scored = PROGRAMS.map((p) => {
    const score = weights[p.category] ?? 0;
    const salaryMatch = p.salary.match(/\$(\d+)K/);
    const salaryNum = salaryMatch ? parseInt(salaryMatch[1], 10) : 0;
    return { program: p, score, salaryNum };
  });
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.salaryNum - a.salaryNum;
  });

  const topMatches = scored.filter((s) => s.score > 0);
  const goalProgram = topMatches[0]?.program;

  const digital = getProgramBySlug(ANCHOR_DIGITAL_LITERACY_SLUG);
  const itSupport = getProgramBySlug(ANCHOR_IT_SUPPORT_SLUG);

  const experienceLevel = answers.q2;
  const needsDigital =
    answers.q6 === 'no_computer' ||
    answers.q6 === 'needs_device' ||
    answers.q5 === 'basics' ||
    answers.q5 === 'basic_apps';

  const result: Program[] = [];

  if (experienceLevel === 'brand_new') {
    if (needsDigital && digital) result.push(digital);
    if (itSupport) result.push(itSupport);
    if (goalProgram && !result.find((p) => p.slug === goalProgram.slug)) {
      result.push(goalProgram);
    }
  } else if (experienceLevel === 'some_knowledge') {
    if (itSupport) result.push(itSupport);
    if (goalProgram && !result.find((p) => p.slug === goalProgram.slug)) {
      result.push(goalProgram);
    }
  } else {
    if (goalProgram) result.push(goalProgram);
  }

  let idx = 0;
  while (result.length < 3 && idx < scored.length) {
    const prog = scored[idx].program;
    if (!result.find((p) => p.slug === prog.slug)) {
      result.push(prog);
    }
    idx++;
  }

  return result.slice(0, 3);
}

/* ─────────────────────── quizReasoning.ts (verbatim) ─────────────────────── */

type AnswerKey = keyof QuizAnswers;

const REASON_BY_ANSWER: Record<string, Partial<Record<string, string>>> = {
  q1: {
    computers: "You're interested in computers and technology - IT and software programs line up well.",
    health: 'You want to help people with their health - our healthcare track fits that focus.',
    building: 'You like building and making things - manufacturing and trades programs match.',
    managing: 'You enjoy coordinating and leading - project management and business tracks are a strong fit.',
    data: "You're drawn to data and numbers - cloud, analytics, and data science programs align.",
    not_sure: "You're exploring - this program is a solid option based on your other answers.",
  },
  q2: {
    brand_new: "You're starting fresh - we recommend programs that welcome beginners.",
    some_knowledge: 'You have basics but no credentials - these programs build on that foundation.',
    work_experience: 'You have real-world experience - certification will formalize what you already know.',
    certifications: "You're ready to level up - these programs go deeper.",
  },
  q3: {
    as_fast: "You need to get working soon - this program's timeline fits that goal.",
    '3_5_months': "You can invest 3-5 months - that's a strong fit for most of our Coursera-based tracks.",
    planning_ahead: "You're planning ahead - you have time for programs that take a bit longer.",
    employed_switch: "You're switching careers while employed - this program's pace suits that.",
  },
  q4: {
    salary: 'You prioritized earning potential - this track has strong salary outcomes.',
    stability: 'You want job stability - this field has steady demand.',
    remote: "You're interested in remote work - many roles in this path support it.",
    community: 'You care about community impact - this path connects you to local employers.',
    hands: 'You prefer hands-on work - this program matches that style.',
  },
  q5: {
    comfortable: "You're comfortable with tech - you can focus on the credential.",
    basic_apps: 'You use phones and basics - we have programs that start where you are.',
    tech_savvy: "You're tech-savvy — this credential will open next-level roles.",
    basics: 'You need to start from the basics - this program is designed for that.',
  },
};

const ANSWER_TO_CATEGORY: Record<string, string[]> = {
  computers: ['it-cyber', 'ai-software'],
  health: ['healthcare'],
  building: ['manufacturing'],
  managing: ['business'],
  data: ['cloud-data', 'ai-software'],
  not_sure: ['it-cyber', 'ai-software', 'cloud-data', 'business', 'healthcare', 'manufacturing', 'digital-literacy'],
  brand_new: ['digital-literacy'],
  some_knowledge: ['it-cyber', 'cloud-data', 'business'],
  work_experience: ['ai-software', 'cloud-data'],
  certifications: ['ai-software', 'cloud-data'],
  as_fast: ['digital-literacy', 'it-cyber'],
  '3_5_months': ['it-cyber', 'cloud-data', 'business'],
  planning_ahead: ['ai-software', 'cloud-data'],
  employed_switch: ['business'],
  salary: ['cloud-data', 'ai-software'],
  stability: ['it-cyber', 'healthcare'],
  remote: ['cloud-data', 'ai-software', 'business'],
  community: ['healthcare', 'manufacturing'],
  hands: ['manufacturing'],
  comfortable: [], // neutral
  basic_apps: ['digital-literacy'],
  tech_savvy: ['ai-software', 'cloud-data'],
  basics: ['digital-literacy'],
};

function getFitReasoning(program: Program, answers: QuizAnswers): string {
  const cat = program.category;
  const reasons: string[] = [];

  (['q1', 'q2', 'q3', 'q4', 'q5'] as AnswerKey[]).forEach((q) => {
    const ans = answers[q];
    if (!ans) return;
    const map = REASON_BY_ANSWER[q];
    if (!map) return;
    const reason = map[ans];
    if (!reason) return;

    const relevantCats = ANSWER_TO_CATEGORY[ans];
    const appliesToThisProgram = !relevantCats || relevantCats.length === 0 || relevantCats.includes(cat);
    if (appliesToThisProgram) {
      reasons.push(reason);
    }
  });

  if (reasons.length > 0) return reasons[0];
  return 'Based on your answers, this program aligns with your goals and experience level.';
}

function getTopFitSummary(answers: QuizAnswers): string {
  const parts: string[] = [];
  if (answers.q1 && answers.q1 !== 'not_sure') parts.push('your interests');
  if (answers.q2) parts.push('your experience level');
  if (answers.q3) parts.push('your timeline');
  if (answers.q4) parts.push('what matters most to you');
  if (parts.length >= 2) {
    return `Based on ${parts.slice(0, 3).join(', ')}, here are the programs we recommend:`;
  }
  return 'Based on your answers, here are the programs we recommend:';
}

/* ───────────────────────── QUESTIONS (verbatim) ───────────────────────── */

const QUESTIONS = [
  {
    id: 'q1' as const,
    question: 'What interests you most?',
    answers: [
      { value: 'computers' as const, label: 'Working with computers and technology' },
      { value: 'health' as const, label: 'Helping people with their health' },
      { value: 'building' as const, label: 'Building and making things with your hands' },
      { value: 'managing' as const, label: 'Managing projects and teams' },
      { value: 'data' as const, label: 'Working with data and numbers' },
      { value: 'not_sure' as const, label: "I'm not sure yet — show me everything" },
    ],
  },
  {
    id: 'q2' as const,
    question: "What's your experience level?",
    answers: [
      { value: 'brand_new' as const, label: "I'm brand new — no experience in this field" },
      { value: 'some_knowledge' as const, label: 'I have some basic knowledge but no credentials' },
      { value: 'work_experience' as const, label: 'I have work experience but no formal certification' },
      { value: 'certifications' as const, label: 'I have certifications but want to level up' },
    ],
  },
  {
    id: 'q3' as const,
    question: 'How quickly do you want to start working?',
    answers: [
      { value: 'as_fast' as const, label: 'As fast as possible — I need a job soon' },
      { value: '3_5_months' as const, label: 'I can invest 3–5 months in training' },
      { value: 'planning_ahead' as const, label: "I'm planning ahead — no rush" },
      { value: 'employed_switch' as const, label: "I'm currently employed but want to switch careers" },
    ],
  },
];

const STEP_LABELS = ['Interest', 'Experience', 'Timeline'];

function getApplyHref(slug: string) {
  return `/apply?program=${encodeURIComponent(slug)}`;
}

/* ─────────────────────────────── component ─────────────────────────────── */

export default function FindYourPathQuiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<QuizAnswers>>({});
  const [results, setResults] = useState<Program[] | null>(null);
  const [resultAnswers, setResultAnswers] = useState<QuizAnswers | null>(null);
  const [pendingChoice, setPendingChoice] = useState<AnswerValue | null>(null);

  const currentQ = QUESTIONS[step];

  function advanceFromAnswer(value: AnswerValue) {
    if (!currentQ) return;
    if (step === 0) trackQuizFunnel('find_your_path', 'started');
    const newAnswers = { ...answers, [currentQ.id]: value };
    setAnswers(newAnswers);

    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
      setPendingChoice(null);
    } else {
      const fullAnswers = mergeQuizShortAnswers(newAnswers as Pick<QuizAnswers, 'q1' | 'q2' | 'q3'>);
      const weights = scoreQuiz(fullAnswers);
      const programs = getTopProgramsFromQuiz(weights, fullAnswers);
      trackQuizFunnel('find_your_path', 'completed', { quiz_result: programs[0]?.slug ?? 'none' });
      setResults(programs);
      setResultAnswers(fullAnswers);
    }
  }

  function handleConfirm() {
    if (pendingChoice === null) return;
    advanceFromAnswer(pendingChoice);
  }

  function handleBack() {
    setPendingChoice(null);
    if (step > 0) setStep(step - 1);
  }

  function handleRetake() {
    setResults(null);
    setResultAnswers(null);
    setAnswers({});
    setStep(0);
    setPendingChoice(null);
  }

  /* ── results screen ── */
  if (results && resultAnswers) {
    const topProgram = results[0];
    const topApplyHref = topProgram ? getApplyHref(topProgram.slug) : '/apply';
    const needsDevice = resultAnswers.q6 === 'no_computer' || resultAnswers.q6 === 'needs_device';

    return (
      <div className="fyp-results">
        <span className="fyp-kicker">Quiz complete</span>
        <h2 className="fyp-results__title">Your career match results</h2>
        <p className="fyp-results__sub">{getTopFitSummary(resultAnswers)}</p>

        {needsDevice && (
          <div className="fyp-note" role="region" aria-label="Computer access support">
            <p>
              <strong>Need a reliable computer for training?</strong> Ask your advisor about{' '}
              <strong>loaner or device support</strong> options — we can help you get set up for online
              coursework. <a href="/contact">Contact us</a> or call <a href="tel:+15127771808">(512) 777-1808</a>.
            </p>
          </div>
        )}

        <h3 className="fyp-results__h3">Your Top 3 WorkforceAP programs</h3>
        <div className="fyp-grid">
          {results.map((program, idx) => {
            const rank = idx === 0 ? 'Best Match' : idx === 1 ? 'Strong Fit' : 'Also Consider';
            const reasoning = getFitReasoning(program, resultAnswers);
            return (
              <div
                key={program.slug}
                className="fyp-card"
                style={{ borderLeft: `4px solid ${program.categoryColor}` }}
              >
                <span className="fyp-card__rank">#{idx + 1} {rank}</span>
                <div className="fyp-card__top">
                  <span className="fyp-card__cat" style={{ background: program.categoryColor }}>
                    {program.categoryLabel}
                  </span>
                </div>
                <h4 className="fyp-card__title">{program.title}</h4>
                <p className="fyp-card__reason">{reasoning}</p>
                <div className="fyp-card__meta"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: '5px' }}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>{program.duration}</div>
                <div className="fyp-card__salary">
                  Starting range: {program.salary} <span>(national framing)</span>
                </div>
                <div className="fyp-card__partner">Partner: {program.partner}</div>
                <a
                  className="btn btn--primary fyp-card__cta"
                  href={getApplyHref(program.slug)}
                  onClick={() => trackQuizFunnel('find_your_path', 'apply_click', { quiz_result: program.slug })}
                >
                  Apply for this path →
                </a>
                <a className="fyp-card__detail" href={`/programs/${program.slug}`}>
                  View full program details →
                </a>
              </div>
            );
          })}
        </div>

        {topProgram && (
          <div className="fyp-cta">
            <p className="fyp-cta__lead">
              Your strongest match is <strong>{topProgram.title}</strong>. The published starting band is{' '}
              {topProgram.salary} and the fastest next step is to start your application now.
            </p>
            <p className="fyp-cta__sub">
              Choose the track that fits you best, then we’ll follow up within 1–2 business days.
            </p>
            <div className="fyp-cta__actions">
              <a
                className="btn btn--primary"
                href={topApplyHref}
                onClick={() => trackQuizFunnel('find_your_path', 'apply_click', { quiz_result: topProgram.slug })}
              >
                Start {topProgram.title} Application →
              </a>
              <a className="btn btn--ghost" href="/contact">
                Talk to an advisor first
              </a>
            </div>
            <p className="fyp-cta__phone">
              <a href="tel:+15127771808">Prefer to talk first? Call (512) 777-1808</a>
            </p>
          </div>
        )}

        <div className="fyp-next">
          <p>
            Use the comparison page to review published tracks side-by-side — time, difficulty, salary band,
            and best-for notes. Then use the salary guide for the same published ranges.
          </p>
          <div className="fyp-next__links">
            <a href="/program-comparison">Compare programs</a>
          </div>
        </div>

        <div className="fyp-footer">
          <p>Not seeing what you expected?</p>
          <a href="/programs" className="btn btn--ghost">Browse All Programs →</a>
          <button type="button" className="btn btn--ghost fyp-retake" onClick={handleRetake}>
            Retake quiz
          </button>
        </div>
      </div>
    );
  }

  /* ── question flow ── */
  const progressPct = ((step + 1) / QUESTIONS.length) * 100;
  const stepLabel = String(step + 1).padStart(2, '0');

  return (
    <div className="fyp-flow">
      {/* progress */}
      <div className="fyp-progress">
        <span className="fyp-progress__step">
          Step {stepLabel}/{String(QUESTIONS.length).padStart(2, '0')}
        </span>
        <div className="fyp-progress__bar">
          <i style={{ width: `${progressPct}%` }} />
        </div>
        <span className="fyp-progress__pct">{Math.round(progressPct)}%</span>
      </div>

      {/* quiz card */}
      <div className="fyp-qcard">
        <h2 className="fyp-question">{currentQ?.question}</h2>
        <fieldset className="fyp-answers">
          <legend className="fyp-sr-only">{currentQ?.question}</legend>
          {currentQ?.answers.map((a) => {
            const isSelected = pendingChoice === a.value;
            const inputId = `fyp-${currentQ.id}-${a.value}`;
            return (
              <label
                key={a.value}
                htmlFor={inputId}
                className={`fyp-answer${isSelected ? ' is-on' : ''}`}
              >
                <input
                  id={inputId}
                  type="radio"
                  name={currentQ.id}
                  value={a.value}
                  checked={isSelected}
                  onChange={() => setPendingChoice(a.value)}
                />
                <span className="fyp-answer__dot" aria-hidden="true" />
                <span className="fyp-answer__label">{a.label}</span>
              </label>
            );
          })}
        </fieldset>

        {pendingChoice !== null && currentQ && (
          <div className="fyp-confirm">
            <p className="fyp-confirm__lead">Your answer for this step:</p>
            <p className="fyp-confirm__val">
              {currentQ.answers.find((x) => x.value === pendingChoice)?.label ?? ''}
            </p>
            <div className="fyp-confirm__actions">
              <button type="button" className="btn btn--primary" onClick={handleConfirm}>
                {step < QUESTIONS.length - 1 ? 'Continue to next question' : 'See my results'}
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setPendingChoice(null)}>
                Choose a different answer
              </button>
            </div>
          </div>
        )}

        <div className="fyp-nav">
          {step > 0 ? (
            <button type="button" className="btn btn--ghost fyp-back" onClick={handleBack}>
              ← Back
            </button>
          ) : (
            <span />
          )}
          <span className="fyp-hint">
            {pendingChoice === null
              ? 'Select an option, then confirm below'
              : 'Confirm your answer to continue'}
          </span>
        </div>
      </div>

      {/* step rail */}
      <ol className="fyp-rail">
        {STEP_LABELS.map((label, i) => (
          <li key={label} className={`fyp-rail__item${i === step ? ' is-current' : ''}${i < step ? ' is-done' : ''}`}>
            <span className="fyp-rail__num">{i + 1}</span>
            <span className="fyp-rail__label">{label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
