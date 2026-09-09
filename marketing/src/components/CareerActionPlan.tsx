import { useEffect, useRef, useState } from 'react';
import type { Program } from '../data/programs';
import { pushMarketingEvent } from '../lib/marketingDataLayer';
import {
  CAREER_PLAN_STORAGE_KEY,
  PLAN_TASK_IDS,
  buildPlanWeeks,
  careerPlanText,
  programApplyHref,
  readCareerPlan,
  saveCareerPlan,
  togglePlanTask,
  trainingWeeks,
  verifiedProgramHours,
  type CareerPlanSnapshot,
  type PlanTaskId,
} from '../lib/careerActionPlan';

function trackPlan(step: 'opened' | 'downloaded' | 'print_requested' | 'preparation_completed', slug: string) {
  pushMarketingEvent({ event: 'funnel_event', funnel: 'career_plan', funnel_step: step, surface: 'marketing', program_slug: slug });
}

interface Props {
  programs: Program[];
  selectedProgramSlug: string;
  onProgramChange: (slug: string) => void;
  onApply: (slug: string) => void;
  onForget: () => void;
}

export default function CareerActionPlan({ programs, selectedProgramSlug, onProgramChange, onApply, onForget }: Props) {
  const [snapshot, setSnapshot] = useState<CareerPlanSnapshot>({
    version: 1,
    selectedProgramSlug,
    recommendedProgramSlugs: programs.map((program) => program.slug),
    weeklyHours: 5,
    completedByProgram: {},
  });
  const [loaded, setLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Your plan stays in this browser. No email or account needed.');
  const [exportError, setExportError] = useState('');
  const initialPrograms = useRef(programs);
  const initialSelectedSlug = useRef(selectedProgramSlug);
  const opened = useRef(false);
  const completedEvents = useRef(new Set<string>());

  useEffect(() => {
    // Read after hydration so server and first browser render are identical.
    try {
      const saved = readCareerPlan(window.localStorage, initialPrograms.current.map((program) => program.slug));
      if (saved) setSnapshot((current) => ({ ...current, weeklyHours: saved.weeklyHours, completedByProgram: saved.completedByProgram }));
    } catch { /* Private browsing may deny storage access. The plan still works. */ }
    if (!opened.current) {
      trackPlan('opened', initialSelectedSlug.current);
      opened.current = true;
    }
    setLoaded(true);
  }, []); // A fresh quiz result mounts a fresh plan; changing the selected program does not.

  useEffect(() => {
    if (!loaded) return;
    const current = { ...snapshot, selectedProgramSlug, recommendedProgramSlugs: programs.map((program) => program.slug) };
    let saved = false;
    try { saved = saveCareerPlan(window.localStorage, current); } catch { /* Storage access itself can fail. */ }
    setSaveStatus(saved
      ? 'Saved on this device. No email or account needed.'
      : 'This browser cannot save your plan. Download or print a copy to keep it.');
  }, [loaded, snapshot, selectedProgramSlug, programs]);

  const program = programs.find((candidate) => candidate.slug === selectedProgramSlug) ?? programs[0];
  if (!program) return null;
  const current = { ...snapshot, selectedProgramSlug: program.slug, recommendedProgramSlugs: programs.map((candidate) => candidate.slug) };
  const completed = current.completedByProgram[program.slug] ?? [];
  const verified = verifiedProgramHours(program);
  const weeks = trainingWeeks(program, current.weeklyHours);
  const planWeeks = buildPlanWeeks(program, current.weeklyHours);

  function toggleTask(taskId: PlanTaskId) {
    const next = togglePlanTask(current, taskId);
    setSnapshot(next);
    if (next.completedByProgram[program.slug]?.length === PLAN_TASK_IDS.length && !completedEvents.current.has(program.slug)) {
      completedEvents.current.add(program.slug);
      trackPlan('preparation_completed', program.slug);
    }
  }

  function downloadPlan() {
    setExportError('');
    try {
      const url = URL.createObjectURL(new Blob([careerPlanText(program, current)], { type: 'text/plain;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `WorkforceAP-${program.slug}-career-plan.txt`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      trackPlan('downloaded', program.slug);
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setExportError('The download could not start. Use Print / save PDF to keep a copy.');
    }
  }

  function forgetPlan() {
    try {
      window.localStorage.removeItem(CAREER_PLAN_STORAGE_KEY);
      onForget();
    } catch {
      setExportError('This browser blocked removal. Clear this site’s browser data to remove the saved plan.');
    }
  }

  return (
    <section className="cap" id="career-action-plan" aria-labelledby="cap-heading" tabIndex={-1}>
      <header className="cap-header">
        <p className="cap-eyebrow">WorkforceAP · Your next four weeks</p>
        <h3 id="cap-heading">Turn a career idea into a plan.</h3>
        <p>Explore the work, make time to learn, and prepare your next step. This is a preparation plan; completing a credential takes its own schedule.</p>
      </header>

      <div className="cap-settings cap-no-print">
        <label className="cap-field">
          <span id="cap-program-label">My program to explore</span>
          <select aria-labelledby="cap-program-label" value={program.slug} onChange={(event) => onProgramChange(event.target.value)}>
            {programs.map((candidate) => <option key={candidate.slug} value={candidate.slug}>{candidate.title}</option>)}
          </select>
        </label>
        <label className="cap-field cap-hours">
          <span id="cap-hours-label">Hours I can study each week</span>
          <select aria-labelledby="cap-hours-label" value={current.weeklyHours} onChange={(event) => setSnapshot((previous) => ({ ...previous, weeklyHours: Number(event.target.value) }))}>
            <option value={0}>Still working it out</option>
            {[2, 5, 10, 15, 20].map((hours) => <option key={hours} value={hours}>{hours} hours / week</option>)}
            {![0, 2, 5, 10, 15, 20].includes(current.weeklyHours) && <option value={current.weeklyHours}>{current.weeklyHours} hours / week</option>}
          </select>
        </label>
      </div>

      <div className="cap-pacing" aria-live="polite" aria-atomic="true">
        <h4>{program.title}</h4>
        {verified ? <>
          <p className="cap-pacing__number">{weeks ? <><strong>{weeks} {weeks === 1 ? 'week' : 'weeks'}</strong> of {verified.lessonTimeOnly ? 'lesson time' : 'training time'} at {current.weeklyHours} hours / week</> : <><strong>Choose a pace when you’re ready.</strong> Your preparation checklist works at any pace.</>}</p>
          <p>{Number(verified.hours.toFixed(1))} {verified.lessonTimeOnly ? 'lesson' : 'curriculum'} hours ÷ your weekly hours, rounded up. {verified.source}. <a href={`/programs/${program.slug}`}>See the curriculum</a>.</p>
          <p>This is a planning estimate. Allow additional time for enrollment, practice, scheduled sessions, and exams; confirm your actual schedule with an advisor.</p>
        </> : <>
          <p className="cap-pacing__number"><strong>Confirm training hours with an advisor.</strong></p>
          <p>Verified total hours are not available for this program. Your checklist is ready; a completion estimate will need confirmed hours and a schedule.</p>
        </>}
      </div>

      <div className="cap-progress" aria-live="polite">
        <strong>{completed.length} of {PLAN_TASK_IDS.length} preparation steps done</strong>
        <progress value={completed.length} max={PLAN_TASK_IDS.length} aria-label="Career preparation progress" />
      </div>

      <ol className="cap-weeks">
        {planWeeks.map((week) => <li className="cap-week" key={week.number}>
          <div className="cap-week__heading"><span>Week {week.number}</span><h4>{week.title}</h4></div>
          <ul className="cap-tasks">
            {week.tasks.map((task) => <li key={task.id}>
              <label className={`cap-task${completed.includes(task.id) ? ' is-done' : ''}`}>
                <input type="checkbox" checked={completed.includes(task.id)} onChange={() => toggleTask(task.id)} />
                <span>{task.text}</span>
              </label>
              {task.href && <a className="cap-task__link" href={task.href}>{task.linkLabel} <span aria-hidden="true">↗</span></a>}
            </li>)}
          </ul>
        </li>)}
      </ol>

      <div className="cap-next cap-no-print">
        <h4>Ready before week four? Start now.</h4>
        <p>Training is $0 for qualifying members. Our team confirms eligibility and funding after you apply.</p>
        <a className="btn btn--primary" href={programApplyHref(program.slug)} onClick={() => onApply(program.slug)}>Apply for my selected program <span aria-hidden="true">→</span></a>
        <p className="cap-advisor">Or <a href="/contact">talk with an advisor</a> about your questions first.</p>
      </div>

      <footer className="cap-save">
        <div className="cap-save__actions cap-no-print">
          <button className="btn btn--ghost" type="button" onClick={downloadPlan}>Download my plan</button>
          <button className="btn btn--ghost" type="button" onClick={() => { trackPlan('print_requested', program.slug); window.print(); }}>Print / save PDF</button>
        </div>
        <p className="cap-save__status cap-no-print" role="status">{saveStatus}</p>
        <p className="cap-no-print">This saved plan lives in this browser, separate from a member account; it is not sent to an advisor. On a shared device, download your copy and <button className="cap-text-button" type="button" onClick={forgetPlan}>remove this saved plan</button>.</p>
        <p className="cap-no-print">Site analytics record plan actions and program choices, without your study hours or checklist. <a href="/privacy">Privacy policy</a>.</p>
        {exportError && <p role="alert" className="cap-error cap-no-print">{exportError}</p>}
        <p className="cap-print-only">WorkforceAP · workforceap.org · (512) 777-1808<br />Program: workforceap.org/programs/{program.slug}<br />Apply: workforceap.org{programApplyHref(program.slug)}</p>
      </footer>
    </section>
  );
}
