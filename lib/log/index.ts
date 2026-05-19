import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }
    : {}),
});

export type ApiRequestLog = {
  route: string;
  method: string;
  status: number;
  duration_ms: number;
  request_id: string;
  user_id?: string;
  org_id?: string;
  error_code?: string;
};

export function logApiRequest(fields: ApiRequestLog): void {
  logger.info(fields, 'api_request');
}
