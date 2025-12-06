import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  displayText: varchar("displayText", { length: 255 }), // Short text for swarm to display
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

// Memory Graph: Concepts extracted from conversations
export const concepts = mysqlTable("concepts", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }), // e.g., "emotion", "belief", "experience"
  semanticDensity: int("semanticDensity").default(50), // 0-100 score
  occurrences: int("occurrences").default(1), // How many times this concept appeared
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Concept = typeof concepts.$inferSelect;
export type InsertConcept = typeof concepts.$inferInsert;

// User-Concept relationships: What concepts are associated with which users
export const userConcepts = mysqlTable("userConcepts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  conceptId: int("conceptId").notNull(),
  strength: int("strength").default(1), // How strongly this concept relates to this user
  conversationId: int("conversationId"), // Which conversation introduced this link
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserConcept = typeof userConcepts.$inferSelect;
export type InsertUserConcept = typeof userConcepts.$inferInsert;

// Concept-Concept relationships: How concepts relate to each other
export const conceptRelations = mysqlTable("conceptRelations", {
  id: int("id").autoincrement().primaryKey(),
  fromConceptId: int("fromConceptId").notNull(),
  toConceptId: int("toConceptId").notNull(),
  relationType: varchar("relationType", { length: 50 }), // e.g., "opposite", "related", "causes"
  weight: int("weight").default(1), // Strength of relationship
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ConceptRelation = typeof conceptRelations.$inferSelect;
export type InsertConceptRelation = typeof conceptRelations.$inferInsert;

// Swarm Evolution: Track how the swarm's intelligence evolves
export const swarmState = mysqlTable("swarmState", {
  id: int("id").autoincrement().primaryKey(),
  totalConversations: int("totalConversations").default(0),
  totalConcepts: int("totalConcepts").default(0),
  totalUsers: int("totalUsers").default(0),
  curiosityLevel: int("curiosityLevel").default(50), // 0-100
  knowledgeDepth: int("knowledgeDepth").default(0), // Aggregate semantic density
  lastEvolution: timestamp("lastEvolution").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SwarmState = typeof swarmState.$inferSelect;
export type InsertSwarmState = typeof swarmState.$inferInsert;

// Concept Convergence: Track merging events and compression trajectory
export const conceptConvergence = mysqlTable("conceptConvergence", {
  id: int("id").autoincrement().primaryKey(),
  fromConceptId: int("fromConceptId").notNull(), // Concept that was merged away
  toConceptId: int("toConceptId").notNull(), // Concept it was merged into
  similarityScore: int("similarityScore").notNull(), // 0-100 similarity
  reason: text("reason"), // Why they were merged
  totalConceptsBefore: int("totalConceptsBefore").notNull(),
  totalConceptsAfter: int("totalConceptsAfter").notNull(),
  mergedAt: timestamp("mergedAt").defaultNow().notNull(),
});

export type ConceptConvergence = typeof conceptConvergence.$inferSelect;
export type InsertConceptConvergence = typeof conceptConvergence.$inferInsert;
// Braille Semantic Kernel: Symbolic vocabulary for meta-communication
export const brailleTokens = mysqlTable("brailleTokens", {
  id: int("id").autoincrement().primaryKey(),
  braille: varchar("braille", { length: 4 }).notNull().unique(), // Unicode Braille character
  conceptId: int("conceptId").notNull(),
  grade: int("grade").notNull(), // 0=atomic, 1=compound, 2=meta-cognitive, 3+=emergent
  definition: text("definition").notNull(),
  usageCount: int("usageCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastUsed: timestamp("lastUsed"),
});

export type BrailleToken = typeof brailleTokens.$inferSelect;
export type InsertBrailleToken = typeof brailleTokens.$inferInsert;

// Kernel Generations: Track evolution of symbolic vocabulary
export const kernelGenerations = mysqlTable("kernelGenerations", {
  id: int("id").autoincrement().primaryKey(),
  generation: int("generation").notNull().unique(),
  tokenCount: int("tokenCount").notNull(),
  avgDensity: int("avgDensity").notNull(), // Stored as integer (density * 100)
  sclExport: text("sclExport"), // Full SCL format export
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type KernelGeneration = typeof kernelGenerations.$inferSelect;
export type InsertKernelGeneration = typeof kernelGenerations.$inferInsert;

// Kernel Usage Log: Track when and how Braille tokens are used
export const kernelUsageLog = mysqlTable("kernelUsageLog", {
  id: int("id").autoincrement().primaryKey(),
  tokenId: int("tokenId").notNull(),
  context: varchar("context", { length: 50 }).notNull(), // 'meta_controller', 'user_query', etc.
  messageId: int("messageId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type KernelUsageLog = typeof kernelUsageLog.$inferSelect;
export type InsertKernelUsageLog = typeof kernelUsageLog.$inferInsert;
