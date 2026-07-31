import { NextResponse, type NextRequest } from 'next/server';

import { type ApiErrorPayload, type StructurePayload, structureQuerySchema } from '@/lib/api/schema';
import { GITHUB_CACHE_TTL_SECONDS } from '@/lib/config';
import { AppError, toAppError } from '@/lib/errors';
import { resolveStructure } from '@/lib/github/client';
import { parseRepoUrl } from '@/lib/github/parse-repo-url';
import { logger } from '@/lib/logger';
import { buildTree } from '@/lib/tree/build';

export const runtime = 'nodejs';

function errorResponse(error: AppError): NextResponse<ApiErrorPayload> {
  const headers = new Headers({ 'Cache-Control': 'no-store' });
  if (error.retryAfter !== undefined) {
    headers.set('Retry-After', String(error.retryAfter));
  }

  return NextResponse.json({ error: error.toJSON() }, { status: error.status, headers });
}

/**
 * Resolve a repository's folder structure.
 *
 * The GitHub calls live here rather than in the browser for three reasons: an
 * optional `GITHUB_TOKEN` never reaches the client, responses are cached and
 * shared across visitors, and unauthenticated visitors are not billed against
 * their own 60 requests/hour IP quota.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const parsed = structureQuerySchema.safeParse({
    url: request.nextUrl.searchParams.get('url') ?? undefined,
    ref: request.nextUrl.searchParams.get('ref') ?? undefined,
    path: request.nextUrl.searchParams.get('path') ?? undefined,
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return errorResponse(
      new AppError('INVALID_REQUEST', first?.message ?? 'Invalid request.', {
        hint: 'Provide ?url=<github repository url>.',
      }),
    );
  }

  try {
    const coordinates = parseRepoUrl(parsed.data.url);
    const resolved = await resolveStructure({
      ...coordinates,
      ...(parsed.data.ref ? { ref: parsed.data.ref } : {}),
      ...(parsed.data.path ? { path: parsed.data.path } : {}),
    });

    const payload: StructurePayload = {
      repository: resolved.repository,
      ref: resolved.ref,
      path: resolved.path,
      truncated: resolved.truncated,
      treeSha: resolved.treeSha,
      nodes: buildTree(resolved.entries),
      entryCount: resolved.entries.length,
      rateLimit: resolved.rateLimit,
    };

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': `public, s-maxage=${GITHUB_CACHE_TTL_SECONDS}, stale-while-revalidate=${GITHUB_CACHE_TTL_SECONDS * 2}`,
      },
    });
  } catch (cause) {
    const error = toAppError(cause);

    if (error.status >= 500) {
      logger.error('Failed to resolve repository structure', {
        code: error.code,
        message: error.message,
        url: parsed.data.url,
      });
    }

    return errorResponse(error);
  }
}
