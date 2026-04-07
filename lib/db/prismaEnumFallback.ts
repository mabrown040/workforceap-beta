import { Prisma } from '@prisma/client';

function getPrismaErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error ?? '');
}

/**
 * Temporary guard for production schema drift: if Prisma sends a newer enum value
 * than the database knows about yet, degrade gracefully instead of breaking the page.
 */
export function isMissingPrismaEnumValue(error: unknown, enumValue: string): boolean {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) &&
    !(error instanceof Prisma.PrismaClientUnknownRequestError) &&
    !(error instanceof Error)
  ) {
    return false;
  }

  const message = getPrismaErrorMessage(error);
  if (!message.includes(enumValue)) return false;

  return (
    /invalid input value for enum/i.test(message) ||
    /invalid value for argument/i.test(message) ||
    /not a valid enum/i.test(message) ||
    /did not match any variant/i.test(message) ||
    /enum.*?(not found|does not exist|unknown|invalid)/i.test(message)
  );
}
