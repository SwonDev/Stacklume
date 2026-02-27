import { NextResponse } from 'next/server';

/**
 * Devuelve una respuesta JSON de éxito.
 * Usar en nuevas rutas API o al refactorizar las existentes.
 */
export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/**
 * Devuelve una respuesta JSON de error con mensaje y status code.
 */
export function apiError(message: string, status = 500): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Devuelve una respuesta 401 Unauthorized estándar.
 */
export function apiUnauthorized(): NextResponse {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
