/**
 * Post-email status update for AI matches — isolated for tests and safe logging.
 */
export async function applyEmployerNotifiedAfterSuggest(
  runUpdateMany: () => Promise<unknown>,
  logError: (msg: string, ctx: Record<string, unknown>) => void,
  jobId: string
): Promise<'ok' | 'failed'> {
  try {
    await runUpdateMany();
    return 'ok';
  } catch (err) {
    logError('[admin_match_suggestions] updateMany failed after email sent', {
      jobId,
      message: err instanceof Error ? err.message : String(err),
    });
    return 'failed';
  }
}
