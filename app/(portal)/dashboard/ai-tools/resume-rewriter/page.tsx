import { redirect } from 'next/navigation';

/** Resume Rewriter is now the rewrite view inside Resume Studio. Deep links keep working. */
export default function ResumeRewriterRedirect() {
  redirect('/dashboard/ai-tools/resume-studio?view=rewrite');
}
