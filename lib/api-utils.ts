import { NextResponse } from 'next/server';

export function createApiErrorResponse(
  message: string,
  code?: string,
  status: number = 500
) {
  return NextResponse.json(
    { error: message, code },
    { status }
  );
}

export function createNotFoundResponse(message = 'Not found') {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function createUnauthorizedResponse(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function withIdempotency<TArgs extends unknown[], TReturn>(
  handler: (...args: TArgs) => TReturn | Promise<TReturn>
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs) => {
    return handler(...args) as Promise<TReturn>;
  };
}
