import 'server-only';

export type {
  ParsedCompletionStatement,
  ParsedXapiStatement,
} from '@/lib/xapi/statementModel';
export {
  flattenXapiStatementPayload,
  isXapiCompletionVerb,
  isXapiCourseProgressVerb,
  parseCompletionStatements,
  parseXapiStatement,
} from '@/lib/xapi/statementModel';
