/**
 * tRPC Context - provides user info and request/response objects
 */

import type { Request, Response } from 'express';
import { db } from './db';

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
 * Uses visitor ID from X-Visitor-Id header to identify unique users
 */
export async function createContext({ req, res }: { req: Request; res: Response }): Promise<TrpcContext> {
  // Get visitor ID from header (set by frontend)
  const visitorId = req.headers['x-visitor-id'] as string || 'anonymous';
  const visitorName = req.headers['x-visitor-name'] as string || null;
  
  // Find or create user based on visitor ID
  let user = db.prepare('SELECT * FROM users WHERE openId = ?').get(visitorId) as User | undefined;
  
  if (!user) {
    // Create new user for this visitor
    const result = db.prepare(
      'INSERT INTO users (openId, name, role) VALUES (?, ?, ?)'
    ).run(visitorId, visitorName, 'user');
    
    user = {
      id: result.lastInsertRowid as number,
      openId: visitorId,
      name: visitorName,
      email: null,
      role: 'user',
    };
    
    // Update swarm state with new user count
    db.prepare('UPDATE swarmState SET totalUsers = totalUsers + 1 WHERE id = 1').run();
    console.log(`🐝 New visitor joined the swarm: ${visitorName || visitorId}`);
  } else if (visitorName && user.name !== visitorName) {
    // Update name if it changed
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run(visitorName, user.id);
    user.name = visitorName;
  }

  return {
    req,
    res,
    user,
  };
}
