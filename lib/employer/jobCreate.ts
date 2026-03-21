import { Prisma } from '@prisma/client';

export type JobCreateFields = {
  title: string;
  description: string;
  location?: string | null;
  locationType?: 'remote' | 'hybrid' | 'onsite' | null;
  jobType?: 'fulltime' | 'parttime' | 'contract' | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  requirements?: string[];
  preferredCertifications?: string[];
  suggestedPrograms?: string[];
  status?: 'draft' | 'pending';
};

function cleanStringArray(values?: string[]): string[] | undefined {
  if (!values) return undefined;
  const cleaned = values.map((value) => value.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned : undefined;
}

export function buildEmployerJobCreateData(
  employerId: string,
  fields: JobCreateFields
): Prisma.JobUncheckedCreateInput {
  const requirements = cleanStringArray(fields.requirements);
  const preferredCertifications = cleanStringArray(fields.preferredCertifications);
  const suggestedPrograms = cleanStringArray(fields.suggestedPrograms);

  return {
    employerId,
    title: fields.title.trim(),
    description: fields.description.trim(),
    ...(fields.location?.trim() ? { location: fields.location.trim() } : {}),
    ...(fields.locationType ? { locationType: fields.locationType } : {}),
    ...(fields.jobType ? { jobType: fields.jobType } : {}),
    ...(typeof fields.salaryMin === 'number' ? { salaryMin: fields.salaryMin } : {}),
    ...(typeof fields.salaryMax === 'number' ? { salaryMax: fields.salaryMax } : {}),
    ...(requirements ? { requirements } : {}),
    ...(preferredCertifications ? { preferredCertifications } : {}),
    ...(suggestedPrograms ? { suggestedPrograms } : {}),
    ...(fields.status ? { status: fields.status } : {}),
  };
}

export function getRouteErrorDetails(error: unknown): { message: string; code?: string } {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return {
      message: error.message,
      code: error.code,
    };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: 'Unknown error' };
}
