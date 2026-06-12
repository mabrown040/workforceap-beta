import { NextResponse } from 'next/server';

export function userAuthDeleteFailedResponse() {
  return NextResponse.json(
    {
      ok: false,
      partialSuccess: true,
      authCleanupRequired: true,
      error: 'User was soft-deleted, but the auth account could not be deleted.',
    },
    { status: 502 },
  );
}
