import { useEffect, useRef, useState } from 'react';
import { PROGRAMS as PROGRAM_CATALOG, type Program as CatalogProgram } from '../data/programs';
import CareerActionPlan from './CareerActionPlan';
import { readCareerPlan, verifiedProgramHours, type CareerPlanSnapshot } from '../lib/careerActionPlan';
import { trackQuizFunnel } from '../lib/marketingDataLayer';

/**
 * Three-question exploration, adapted from the portal's category scoring.
 * Interest and readiness guide suggestions; salary figures are not ranking inputs.
 * Runs locally without a career API or an email gate. An advisor confirms fit.
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

export function mergeQuizShortAnswers(partial: Pick<QuizAnswers, 'q1' | 'q2' | 'q3'>): QuizAnswers {
  return { ...partial, ...QUIZ_SHORT_FORM_DEFAULTS };
}

export function scoreQuiz(answers: QuizAnswers): CategoryWeights {
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

/* Shared marketing catalog; no private training or labor-market data required. */

type Program = Omit<CatalogProgram, 'category'> & { category: CategoryKey };

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
  return { ...source, category, categoryLabel: CAT_LABEL[category] };
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

/* ─────────────── recommendations: interests and readiness ─────────────── */

const ANCHOR_DIGITAL_LITERACY_SLUG = 'digital-literacy-empowerment-class';
const ANCHOR_IT_SUPPORT_SLUG = 'it-support-professional-certificate-ibm';

export function getTopProgramsFromQuiz(weights: CategoryWeights, answers: QuizAnswers): Program[] {
  const interestCategories: Partial<Record<Q1Answer, CategoryKey[]>> = {
    computers: ['it-cyber', 'ai-software'], health: ['healthcare'],
    building: ['manufacturing'], managing: ['business'], data: ['cloud-data', 'ai-software'],
  };
  const preferred = interestCategories[answers.q1] ?? [];
  const beginner = answers.q2 === 'brand_new' || answers.q2 === 'some_knowledge';
  const scored = PROGRAMS.map((program, index) => ({
    program, index,
    interest: preferred.includes(program.category) ? 1 : 0,
    score: weights[program.category] ?? 0,
    difficulty: program.extra?.difficulty ?? 2,
  })).sort((a, b) => b.interest - a.interest
    || (beginner ? a.difficulty - b.difficulty : 0)
    || b.score - a.score || a.index - b.index);

  const result: Program[] = [];
  const exploringTechnology = ['computers', 'data', 'not_sure'].includes(answers.q1);
  const needsDigital = ['no_computer', 'needs_device'].includes(answers.q6)
    || ['basics', 'basic_apps'].includes(answers.q5);
  if (beginner && exploringTechnology) {
    const foundation = getProgramBySlug(needsDigital ? ANCHOR_DIGITAL_LITERACY_SLUG : ANCHOR_IT_SUPPORT_SLUG);
    if (foundation) result.push(foundation);
  }
  for (const { program } of scored) {
    if (!result.some((candidate) => candidate.slug === program.slug)) result.push(program);
    if (result.length === 3) break;
  }
  return result;
}

/* ─────────────────────── exploration reasoning ─────────────────────── */

type AnswerKey = keyof QuizAnswers;

const REASON_BY_ANSWER: Record<string, Partial<Record<string, string>>> = {
  q1: {
    computers: "You're interested in computers and technology - IT and software programs line up well.",
    health: 'You want to help people with their health - our healthcare track fits that focus.',
    building: 'You like building and making things - manufacturing and trades programs match.',
    managing: 'You enjoy coordinating and leading - project management and business tracks are a strong fit.',
    data: "You're drawn to data and numbers - cloud, management intelligence, and database programs align.",
    not_sure: "You're exploring - this program is a solid option based on your other answers.",
  },
  q2: {
    brand_new: "You're starting fresh - we recommend programs that welcome beginners.",
    some_knowledge: 'You have basics but no credentials - these programs build on that foundation.',
    work_experience: 'You bring work experience. Compare the curriculum with the skills you already use and the ones you want to build.',
    certifications: "You're ready to level up - these programs go deeper.",
  },
  q3: {
    as_fast: "You want to start working soon. Confirm this program’s schedule and prerequisites with an advisor.",
    '3_5_months': 'You chose a 3–5 month training window. Compare it with the curriculum hours and a weekly pace you can sustain.',
    planning_ahead: "You're planning ahead - you have time for programs that take a bit longer.",
    employed_switch: "You’re planning a career change while working. Build a study schedule you can sustain.",
  },
  q4: {
    salary: 'You prioritized earning potential. Compare local job requirements and occupational wage sources.',
    stability: 'You prioritized stability. Explore current job requirements before choosing a program.',
    remote: "You're interested in remote work - many roles in this path support it.",
    community: 'You care about community impact - this path connects you to local employers.',
    hands: 'You prefer hands-on work - this program matches that style.',
  },
  q5: {
    comfortable: "You're comfortable with tech - you can focus on the credential.",
    basic_apps: 'You use phones and basics - we have programs that start where you are.',
    tech_savvy: "You’re comfortable with technology and ready to explore a more specialized skill.",
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

  // The short form asks only these questions. Never attribute the unasked
  // scoring defaults to a learner as though they expressed those preferences.
  (['q1', 'q2', 'q3'] as AnswerKey[]).forEach((q) => {
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

/* ─────────────────────────────── component ─────────────────────────────── */

export default function FindYourPathQuiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<QuizAnswers>>({});
  const [results, setResults] = useState<Program[] | null>(null);
  const [resultAnswers, setResultAnswers] = useState<QuizAnswers | null>(null);
  const [pendingChoice, setPendingChoice] = useState<AnswerValue | null>(null);
  const [selectedProgramSlug, setSelectedProgramSlug] = useState('');
  const [savedPlan, setSavedPlan] = useState<CareerPlanSnapshot | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const hasInteracted = useRef(false);

  useEffect(() => {
    try { setSavedPlan(readCareerPlan(window.localStorage, PROGRAMS.map((program) => program.slug))); } catch { /* Quiz works without storage. */ }
  }, []);

  useEffect(() => {
    if (hasInteracted.current) headingRef.current?.focus();
  }, [step, results]);

  function resumePlan() {
    if (!savedPlan) return;
    hasInteracted.current = true;
    setSelectedProgramSlug(savedPlan.selectedProgramSlug);
    setResults(savedPlan.recommendedProgramSlugs.map(getProgramBySlug).filter((program): program is Program => Boolean(program)));
  }

  const currentQ = QUESTIONS[step];

  function advanceFromAnswer(value: AnswerValue) {
    if (!currentQ) return;
    hasInteracted.current = true;
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
      setSelectedProgramSlug(programs[0]?.slug ?? '');
      setResults(programs);
      setResultAnswers(fullAnswers);
    }
  }

  function handleConfirm() {
    if (pendingChoice === null) return;
    advanceFromAnswer(pendingChoice);
  }

  function handleBack() {
    hasInteracted.current = true;
    setPendingChoice(null);
    if (step > 0) setStep(step - 1);
  }

  function handleRetake() {
    hasInteracted.current = true;
    try { setSavedPlan(readCareerPlan(window.localStorage, PROGRAMS.map((program) => program.slug))); } catch { setSavedPlan(null); }
    setResults(null);
    setResultAnswers(null);
    setAnswers({});
    setStep(0);
    setPendingChoice(null);
  }

  /* ── results screen ── */
  if (results) {
    return (
      <div className="fyp-results">
        <div className="fyp-recommendations cap-no-print">
          <span className="fyp-kicker">{resultAnswers ? 'Quiz complete' : 'Welcome back to your plan'}</span>
          <h2 ref={headingRef} tabIndex={-1} className="fyp-results__title">A direction. And a next step.</h2>
          <p className="fyp-results__sub">{resultAnswers ? getTopFitSummary(resultAnswers) : 'Your saved programs are ready to explore. Continue your checklist below.'} These are starting points, not an assessment of eligibility or a job guarantee.</p>
          <h3 className="fyp-results__h3">Programs to explore</h3>
          <div className="fyp-grid">
            {results.map((program, index) => {
              const verified = verifiedProgramHours(program);
              const isSelected = selectedProgramSlug === program.slug;
              return (
                <article key={program.slug} className={`fyp-card${isSelected ? ' is-selected' : ''}`}>
                  <span className="fyp-card__rank">{index === 0 ? 'Start exploring here' : 'Another direction to explore'}</span>
                  <p className="fyp-card__cat">{program.categoryLabel}</p>
                  <h4 className="fyp-card__title">{program.title}</h4>
                  <p className="fyp-card__reason">{resultAnswers ? getFitReasoning(program, resultAnswers) : 'One of the programs from your saved exploration.'}</p>
                  <p className="fyp-card__meta">{verified ? `${Number(verified.hours.toFixed(1))} ${verified.lessonTimeOnly ? 'lesson' : 'curriculum'} hours · see your pace below` : 'Training hours: confirm with an advisor'}</p>
                  <p className="fyp-card__readiness">{program.syllabus?.recommendedPrerequisite ?? (program.extra?.difficulty === 3 ? 'This is a more advanced track. Review the prerequisites with an advisor before enrolling.' : 'Review the curriculum and entry requirements with an advisor to confirm your starting point.')}</p>
                  <button type="button" className={`btn ${isSelected ? 'btn--primary' : 'btn--ghost'} fyp-card__cta`} aria-pressed={isSelected} onClick={() => {
                    setSelectedProgramSlug(program.slug);
                    document.getElementById('career-action-plan')?.focus();
                  }}>{isSelected ? 'Selected for my plan' : 'Build my plan for this program'}</button>
                  <a className="fyp-card__detail" href={`/programs/${program.slug}`}>Program details <span aria-hidden="true">→</span></a>
                </article>
              );
            })}
          </div>
        </div>

        <CareerActionPlan programs={results} selectedProgramSlug={selectedProgramSlug} onProgramChange={setSelectedProgramSlug}
          onApply={(slug) => trackQuizFunnel('find_your_path', 'apply_click', { quiz_result: slug })}
          onForget={() => { setSavedPlan(null); handleRetake(); }} />

        <div className="fyp-next cap-no-print">
          <p>Still deciding? Compare curricula and entry requirements, or research occupations and wages before committing.</p>
          <div className="fyp-next__links"><a href="/program-comparison">Compare programs</a><a href="/salary-guide">Research career pay</a></div>
        </div>
        <div className="fyp-footer cap-no-print">
          <a href="/programs" className="btn btn--ghost">Browse all programs</a>
          <button type="button" className="btn btn--ghost fyp-retake" onClick={handleRetake}>Retake quiz</button>
        </div>
      </div>
    );
  }

  /* ── question flow ── */
  const progressPct = ((step + 1) / QUESTIONS.length) * 100;
  const stepLabel = String(step + 1).padStart(2, '0');

  return (
    <div className="fyp-flow">
      {savedPlan && step === 0 && <div className="fyp-resume">
        <div><strong>Your career plan is saved here.</strong><p>Pick up where you left off, or answer the questions to explore again.</p></div>
        <button type="button" className="btn btn--primary" onClick={resumePlan}>Resume my saved plan</button>
      </div>}
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
        <h2 ref={headingRef} tabIndex={-1} className="fyp-question">{currentQ?.question}</h2>
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
