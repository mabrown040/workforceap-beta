import { prisma } from '@/lib/db/prisma';
import { verifyPlacementSurveyToken } from '@/lib/security/placementSurveyToken';
import PlacementSurveyForm from '@/components/forms/PlacementSurveyForm';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Post-Placement Survey | WorkforceAP',
  robots: { index: false, follow: false },
};

const wrapStyle: React.CSSProperties = {
  maxWidth: 640,
  margin: '0 auto',
  padding: '3rem 1.25rem',
  fontFamily: 'var(--font-body, system-ui, sans-serif)',
  color: 'var(--color-dark, #231f20)',
};

function Message({ heading, body }: { heading: string; body: string }) {
  return (
    <main style={wrapStyle}>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>{heading}</h1>
      <p style={{ color: '#584144', lineHeight: 1.55 }}>{body}</p>
    </main>
  );
}

export default async function PlacementSurveyTokenPage(props: {
  params: Promise<{ token: string }>;
}) {
  const { token: tokenParam } = await props.params;
  const token = decodeURIComponent(tokenParam);

  const verify = await verifyPlacementSurveyToken(token);
  if (!verify.ok) {
    if (verify.reason === 'expired') {
      return (
        <Message
          heading="This survey link has expired"
          body="Survey links are valid for 60 days. Reply to the original email or reach out to your advisor and we'll send a fresh link."
        />
      );
    }
    return (
      <Message
        heading="This link isn't valid"
        body="Double-check that you opened the most recent email from us. If you keep seeing this, reply to that email and we'll sort it out."
      />
    );
  }

  const survey = await prisma.placementSurvey.findUnique({
    where: { id: verify.surveyId },
    select: {
      id: true,
      completedAt: true,
      wave: true,
      user: { select: { fullName: true, enrolledProgram: true } },
    },
  });

  if (!survey) {
    return (
      <Message
        heading="We couldn't find your survey"
        body="This link looks valid but the survey it points to is gone. Reach out to your advisor and we'll get you another one."
      />
    );
  }

  if (survey.completedAt) {
    return (
      <Message
        heading="Thanks — you already filled this out"
        body="Your responses are recorded. You don't need to do anything else."
      />
    );
  }

  const waveTitle =
    survey.wave === 'sixty_day'
      ? '60-day check-in'
      : survey.wave === 'ninety_day'
        ? '90-day check-in'
        : survey.wave === 'hundred_eighty_day'
          ? 'Final 180-day check-in'
          : "How's the new job going?";

  const waveSubtitle =
    survey.wave === 'sixty_day'
      ? "About 2 minutes. We want to make sure you're still employed and catch any challenges early."
      : survey.wave === 'ninety_day'
        ? 'About 2 minutes. Salary confirmation and satisfaction check for grant reporting.'
        : survey.wave === 'hundred_eighty_day'
          ? 'About 2 minutes. Final salary confirmation and satisfaction check for grant reporting.'
          : "About 3 minutes. Your answers help us understand what worked and share real outcomes with our funding partners.";

  return (
    <main style={wrapStyle}>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>{waveTitle}</h1>
      <p style={{ color: '#584144', lineHeight: 1.55, marginBottom: '2rem' }}>
        {waveSubtitle}
        {survey.user.fullName ? ` Thanks, ${survey.user.fullName.split(/\s+/)[0]}.` : ''}
      </p>
      <PlacementSurveyForm token={token} programName={survey.user.enrolledProgram} />
    </main>
  );
}
