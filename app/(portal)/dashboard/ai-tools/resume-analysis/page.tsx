import { redirect } from 'next/navigation';

/** Resume Analysis is now the score view inside Resume Studio. Deep links keep working. */
export default function ResumeAnalysisRedirect() {
  redirect('/dashboard/ai-tools/resume-studio?view=score');
}
