import { z } from 'zod';

import { type ErrorCode } from '@/lib/errors';
import { type RateLimitInfo, type RepositoryMeta } from '@/lib/github/types';
import { type TreeNode } from '@/lib/tree/types';

/** Query contract for `GET /api/structure`. */
export const structureQuerySchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, 'A repository URL is required.')
    .max(500, 'That URL is unreasonably long.'),
  ref: z.string().trim().max(255).optional(),
  path: z.string().trim().max(1000).optional(),
});

export type StructureQuery = z.infer<typeof structureQuerySchema>;

export interface StructurePayload {
  repository: RepositoryMeta;
  /** The ref that was actually resolved (may differ from the request). */
  ref: string;
  /** Sub-directory the tree is scoped to, or `null` for the whole repo. */
  path: string | null;
  /** True when GitHub could not return the complete tree. */
  truncated: boolean;
  treeSha: string | null;
  nodes: TreeNode[];
  /** Number of raw entries returned by GitHub before any filtering. */
  entryCount: number;
  rateLimit: RateLimitInfo | null;
}

export interface ApiErrorPayload {
  error: {
    code: ErrorCode;
    message: string;
    hint?: string;
    retryAfter?: number;
  };
}

export function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = (value as { error?: unknown }).error;
  return (
    typeof candidate === 'object' &&
    candidate !== null &&
    typeof (candidate as { message?: unknown }).message === 'string'
  );
}
