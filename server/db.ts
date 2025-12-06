/**
 * Database connection - SQLite for local development
 * Uses better-sqlite3 for synchronous, fast local storage
 */

import Database from 'better-sqlite3';
import path from 'path';

// Database file location
const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'swarm.db');

// Create database instance
const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  -- Users table
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    openId TEXT NOT NULL UNIQUE,
    name TEXT,
    email TEXT,
    loginMethod TEXT,
    role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    lastSignedIn TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Conversations table
  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    displayText TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id)
  );

  -- Concepts table (knowledge graph nodes)
  CREATE TABLE IF NOT EXISTS concepts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    semanticDensity INTEGER DEFAULT 50,
    occurrences INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- User-Concept relationships
  CREATE TABLE IF NOT EXISTS userConcepts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    conceptId INTEGER NOT NULL,
    strength INTEGER DEFAULT 1,
    conversationId INTEGER,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id),
    FOREIGN KEY (conceptId) REFERENCES concepts(id)
  );

  -- Concept-Concept relationships
  CREATE TABLE IF NOT EXISTS conceptRelations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fromConceptId INTEGER NOT NULL,
    toConceptId INTEGER NOT NULL,
    relationType TEXT,
    weight INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fromConceptId) REFERENCES concepts(id),
    FOREIGN KEY (toConceptId) REFERENCES concepts(id)
  );

  -- Swarm state
  CREATE TABLE IF NOT EXISTS swarmState (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    totalConversations INTEGER DEFAULT 0,
    totalConcepts INTEGER DEFAULT 0,
    totalUsers INTEGER DEFAULT 0,
    curiosityLevel INTEGER DEFAULT 50,
    knowledgeDepth INTEGER DEFAULT 0,
    lastEvolution TEXT DEFAULT CURRENT_TIMESTAMP,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Initialize swarm state if not exists
  INSERT OR IGNORE INTO swarmState (id, totalConversations, totalConcepts, totalUsers)
  VALUES (1, 0, 0, 0);

  -- Create default local user
  INSERT OR IGNORE INTO users (id, openId, name, role)
  VALUES (1, 'local-dev-user', 'Local Developer', 'user');

  -- Create indexes for performance
  CREATE INDEX IF NOT EXISTS idx_conversations_userId ON conversations(userId);
  CREATE INDEX IF NOT EXISTS idx_concepts_name ON concepts(name);
  CREATE INDEX IF NOT EXISTS idx_userConcepts_userId ON userConcepts(userId);
  CREATE INDEX IF NOT EXISTS idx_conceptRelations_from ON conceptRelations(fromConceptId);
`);

console.log('📦 Database initialized at:', DB_PATH);

export { db };

// Helper types
export interface DbUser {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  role: 'user' | 'admin';
}

export interface DbConversation {
  id: number;
  userId: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  displayText: string | null;
  createdAt: string;
}

export interface DbConcept {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  semanticDensity: number;
  occurrences: number;
}

export interface DbSwarmState {
  id: number;
  totalConversations: number;
  totalConcepts: number;
  totalUsers: number;
  curiosityLevel: number;
  knowledgeDepth: number;
}
