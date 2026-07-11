import { redirect } from 'next/navigation';

/** Legacy reduced toolkit; the full toolkit now lives inside Career Studio. */
export default function DashboardToolkitPage() {
  redirect('/dashboard/ai-tools?tab=toolkit');
}
