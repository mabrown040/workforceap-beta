import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { captureApiError } from '@/lib/observability/captureApiError';
import { isExcludedPublicEmployerName, isExcludedPublicJobTitle } from '@/lib/jobs/publicJobFilters';
import { checkRateLimitWithMonitoring } from '@/lib/rate-limit';
import { logRateLimitExceeded, logSuspiciousRequest } from '@/lib/security/securityLogger';
import { getSecurityHeaders } from '@/lib/security/securityHeaders';

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/** Public jobs listing - only live jobs for students */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimitResult = await checkRateLimitWithMonitoring(ip, '/api/jobs');
  
  if (!rateLimitResult.success) {
    logRateLimitExceeded('/api/jobs', ip, undefined, {
      userAgent: request.headers.get('user-agent'),
      query: request.nextUrl.search,
    });
    
    const headers = getSecurityHeaders({
      limit: 120,
      remaining: 0,
      reset: Date.now() + 3600000, // 1 hour
    });
    
    return NextResponse.json(
      { error: 'Too many requests. Please slow down and try again.' },
      { 
        status: 429,
        headers: headers
      }
    );
  }

  // Detect suspicious request patterns
  const searchParams = new URL(request.url).searchParams;
  const keyword = searchParams.get('q')?.trim();
  
  // Log suspicious patterns that might indicate scraping or injection attempts
  if (keyword && (keyword.length > 200 || keyword.includes('<script>') || keyword.includes('javascript:'))) {
    logSuspiciousRequest('/api/jobs', ip, {
      query: keyword,
      userAgent: request.headers.get('user-agent'),
      pattern: 'potential_injection_or_scraping',
    });
  }

  const locationType = searchParams.get('locationType') || undefined;
  const jobType = searchParams.get('jobType') || undefined;
  const program = searchParams.get('program') || undefined;
  const salaryMinParam = searchParams.get('salaryMin');
  const salaryMaxParam = searchParams.get('salaryMax');
  const sort = searchParams.get('sort') || 'newest';
  const ageGroup = searchParams.get('ageGroup') as 'under14' | 'youth14to17' | 'adult18plus' | null;

  const andConditions: Prisma.JobWhereInput[] = [];
  
  // Age-based filtering
  if (ageGroup === 'under14') {
    // No jobs for under 14 (COPPA compliance)
    andConditions.push({ id: 'impossible-match' });
  } else if (ageGroup === 'youth14to17') {
    // Only youth-appropriate jobs for 14-17 year olds
    andConditions.push({ 
      youthAppropriate: true,
      OR: [
        { minimumAge: null },
        { minimumAge: { lte: 17 } },
      ],
    });
  } else {
    // Adults: exclude youth-only jobs if they have high minimum age
    // (Most jobs are available, but some might be 21+ like alcohol service)
  }

  if (locationType && ['remote', 'hybrid', 'onsite'].includes(locationType)) {
    andConditions.push({ locationType: locationType as 'remote' | 'hybrid' | 'onsite' });
  }

  if (jobType && ['fulltime', 'parttime', 'contract'].includes(jobType)) {
    andConditions.push({ jobType: jobType as 'fulltime' | 'parttime' | 'contract' });
  }

  if (program) {
    andConditions.push({ suggestedPrograms: { has: program } });
  }

  const salaryMinNum = salaryMinParam ? parseInt(salaryMinParam, 10) : undefined;
  const salaryMaxNum = salaryMaxParam ? parseInt(salaryMaxParam, 10) : undefined;
  if (salaryMinNum !== undefined && !Number.isNaN(salaryMinNum)) {
    // Job range overlaps [salaryMin, ∞]: job.salaryMax >= salaryMin OR (no max and job.salaryMin >= salaryMin)
    andConditions.push({
      OR: [
        { salaryMax: { gte: salaryMinNum } },
        { salaryMax: null, salaryMin: { gte: salaryMinNum } },
      ],
    });
  }
  if (salaryMaxNum !== undefined && !Number.isNaN(salaryMaxNum)) {
    // Job range overlaps (-∞, salaryMax]: job.salaryMin <= salaryMax OR (no min and job.salaryMax <= salaryMax)
    andConditions.push({
      OR: [
        { salaryMin: { lte: salaryMaxNum } },
        { salaryMin: null, salaryMax: { lte: salaryMaxNum } },
      ],
    });
  }

  if (keyword) {
    const k = keyword.toLowerCase();
    andConditions.push({
      OR: [
        { title: { contains: k, mode: 'insensitive' } },
        { description: { contains: k, mode: 'insensitive' } },
        { employer: { companyName: { contains: k, mode: 'insensitive' } } },
      ],
    });
  }

  const where: Prisma.JobWhereInput = {
    status: 'live',
    ...(andConditions.length > 0 && { AND: andConditions }),
  };

  const orderBy: Prisma.JobOrderByWithRelationInput[] =
    sort === 'salary-desc'
      ? [{ salaryMax: 'desc' }, { salaryMin: 'desc' }]
      : sort === 'salary-asc'
        ? [{ salaryMin: 'asc' }, { salaryMax: 'asc' }]
        : sort === 'title'
          ? [{ title: 'asc' }]
          : [{ updatedAt: 'desc' }];

  try {
    const jobs = await prisma.job.findMany({
      where,
      orderBy,
      include: {
        employer: { select: { companyName: true, logoUrl: true } },
      },
    });
    const visible = jobs.filter(
      (j) => !isExcludedPublicEmployerName(j.employer.companyName) && !isExcludedPublicJobTitle(j.title),
    );
    
    const headers = getSecurityHeaders({
      limit: 120,
      remaining: rateLimitResult.remaining || 0,
      reset: Date.now() + 3600000, // 1 hour
    });
    
    return NextResponse.json(visible, { headers });
  } catch (err) {
    captureApiError(err, { route: 'GET /api/jobs' });
    const headers = getSecurityHeaders();
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers });
  }
}
