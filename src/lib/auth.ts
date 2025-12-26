import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

// Cookie configuration
export const AUTH_COOKIE_NAME = 'stacklume-auth'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

// Get environment variables
function getAuthConfig() {
  const username = process.env.AUTH_USERNAME
  const passwordHash = process.env.AUTH_PASSWORD_HASH
  const secret = process.env.AUTH_SECRET

  if (!username || !passwordHash || !secret) {
    throw new Error('Missing AUTH_USERNAME, AUTH_PASSWORD_HASH, or AUTH_SECRET environment variables')
  }

  return { username, passwordHash, secret }
}

// Verify password against hash
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// Hash a password (utility for generating hashes)
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

// Create JWT token
export function createToken(payload: object): string {
  const { secret } = getAuthConfig()
  return jwt.sign(payload, secret, { expiresIn: '7d' })
}

// Verify JWT token
export function verifyToken(token: string): { username: string } | null {
  try {
    const { secret } = getAuthConfig()
    const decoded = jwt.verify(token, secret) as { username: string }
    return decoded
  } catch {
    return null
  }
}

// Validate credentials against environment variables
export async function validateCredentials(username: string, password: string): Promise<boolean> {
  const config = getAuthConfig()

  if (username !== config.username) {
    return false
  }

  return verifyPassword(password, config.passwordHash)
}

// Set auth cookie
export async function setAuthCookie(username: string): Promise<void> {
  const token = createToken({ username })
  const cookieStore = await cookies()

  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
}

// Remove auth cookie
export async function removeAuthCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(AUTH_COOKIE_NAME)
}

// Get current session from cookie
export async function getSession(): Promise<{ username: string } | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value

  if (!token) {
    return null
  }

  return verifyToken(token)
}

// Check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession()
  return session !== null
}
