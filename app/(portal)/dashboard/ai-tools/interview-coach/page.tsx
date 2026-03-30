import { redirect } from 'next/navigation';

// Interview Coach moved to top-level /dashboard/interview-coach
export default function InterviewCoachRedirect() {
  redirect('/dashboard/interview-coach');
}
