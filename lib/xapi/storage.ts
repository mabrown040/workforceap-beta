import 'server-only';

export type { PersistXapiStatementInput } from '@/lib/xapi/persistXapiStatement';
export {
  claimCourseraRestWebhookStatement,
  markXapiStatementProcessed,
  persistXapiStatement,
} from '@/lib/xapi/persistXapiStatement';
