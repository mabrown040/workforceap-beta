import { prisma } from '@/lib/db/prisma';

export type WorkflowDiagnosticParams = {
  workflow: string;
  status: 'started' | 'success' | 'fallback' | 'error' | 'inspection';
  actorUserId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  summary: string;
  provider?: string | null;
  method?: string | null;
  fallbackPath?: string | null;
  failureReason?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function recordWorkflowDiagnostic(params: WorkflowDiagnosticParams): Promise<void> {
  try {
    await prisma.workflowDiagnostic.create({
      data: {
        workflow: params.workflow,
        status: params.status,
        actorUserId: params.actorUserId ?? null,
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null,
        summary: params.summary,
        provider: params.provider ?? null,
        method: params.method ?? null,
        fallbackPath: params.fallbackPath ?? null,
        failureReason: params.failureReason ?? null,
        metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined,
      },
    });
  } catch (error) {
    console.error('[recordWorkflowDiagnostic]', error);
  }
}
