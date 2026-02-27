import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema } from 'zod';
import { apiError } from './response';

/**
 * Parsea y valida el body JSON de una NextRequest con un schema Zod.
 * Devuelve { data } si es válido, o { response } con un 400 si no lo es.
 *
 * @example
 * const result = await withValidation(request, MySchema);
 * if ('response' in result) return result.response;
 * const { data } = result;
 */
export async function withValidation<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<{ data: T } | { response: NextResponse }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { response: apiError('Invalid JSON body', 400) };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    return { response: apiError(message, 400) };
  }

  return { data: parsed.data };
}
