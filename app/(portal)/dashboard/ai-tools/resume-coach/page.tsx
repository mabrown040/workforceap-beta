import { redirect } from 'next/navigation';

/** Resume & Experience Enhancer is now the coach view inside Resume Studio. Deep links keep working. */
export default function ResumeCoachRedirect() {
  redirect('/dashboard/ai-tools/resume-studio?view=coach');
}
