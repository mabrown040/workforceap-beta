import { NextRequest, NextResponse } from 'next/server';
import { withApiGuc } from '@/lib/db/withRequestGuc';

export const POST = withApiGuc(async (_request: NextRequest) => {
  return NextResponse.json(
    {
      error:
        'Organization onboarding is currently invite-only. Request access at info@workforceap.org and we will review fit before setup.',
    },
    { status: 403 }
  );
});
