/**
 * POST /api/auth/validate
 * Validates the provided app access key and returns 200 if valid, 401 if not.
 * Used by the login screen to verify the key before storing it in sessionStorage.
 */

import { NextResponse } from 'next/server';
import { isAuthorized } from '../../_shared/auth';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');

  if (isAuthorized(authHeader)) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  return NextResponse.json({ error: 'Invalid access key' }, { status: 401 });
}
