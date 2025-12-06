/**
 * tRPC Context - provides user info and request/response objects
 */

import type { Request, Response } from 'express';

export interface User {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  role: 'user' | 'admin';
}

export interface TrpcContext {
  req: Request;
  res: Response;
  user: User | null;
}

/**
 * Create context for each tRPC request
 * For now, we use a simple local user. In production, parse JWT/session.
 */
export async function createContext({ req, res }: { req: Request; res: Response }): Promise<TrpcContext> {
  // For local development, create a default user
  // In production, you'd verify JWT or session cookie here
  const user: User = {
    id: 1,
    openId: 'local-dev-user',
    name: 'Local Developer',
    email: 'dev@localhost',
    role: 'user',
  };

  return {
    req,
    res,
    user,
  };
}
