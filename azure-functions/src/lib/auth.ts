import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import { HttpRequest } from '@azure/functions';
import { queryOne } from './database';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';
const JWT_EXPIRES_IN = '7d';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'TRAINER' | 'ZUSCHAUER';
  team_ids: string[];
  created_at: string;
  last_login?: string;
}

/**
 * Hash a password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verify a password
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token
 */
export function generateToken(user: User): string {
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractToken(request: HttpRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Get authenticated user from request
 */
export async function getAuthUser(request: HttpRequest): Promise<User | null> {
  const token = extractToken(request);
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const user = await queryOne<User>(
    'SELECT id, email, name, role, team_ids, created_at, last_login FROM users WHERE id = $1',
    [payload.userId]
  );

  return user;
}

/**
 * Check if user has required role
 */
export function hasRole(user: User | null, requiredRole: 'ADMIN' | 'TRAINER' | 'ZUSCHAUER'): boolean {
  if (!user) return false;
  
  const roleHierarchy = { 'ADMIN': 3, 'TRAINER': 2, 'ZUSCHAUER': 1 };
  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
}

/**
 * Require authentication middleware
 */
export async function requireAuth(request: HttpRequest): Promise<{ user: User } | { error: string; status: number }> {
  const user = await getAuthUser(request);
  if (!user) {
    return { error: 'Nicht authentifiziert', status: 401 };
  }
  return { user };
}

/**
 * Require admin role middleware
 */
export async function requireAdmin(request: HttpRequest): Promise<{ user: User } | { error: string; status: number }> {
  const result = await requireAuth(request);
  if ('error' in result) return result;
  
  if (!hasRole(result.user, 'ADMIN')) {
    return { error: 'Keine Berechtigung', status: 403 };
  }
  return result;
}

/**
 * Require trainer role middleware
 */
export async function requireTrainer(request: HttpRequest): Promise<{ user: User } | { error: string; status: number }> {
  const result = await requireAuth(request);
  if ('error' in result) return result;
  
  if (!hasRole(result.user, 'TRAINER')) {
    return { error: 'Keine Berechtigung', status: 403 };
  }
  return result;
}

