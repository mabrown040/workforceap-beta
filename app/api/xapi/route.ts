// xAPI tenant server endpoint. Coursera's "Standard xAPI format" client posts
// statement batches to the configured Tenant Server URL directly, so the
// advertised /api/xapi base must accept the same payload as /api/xapi/statements.
export { POST } from './statements/route';
