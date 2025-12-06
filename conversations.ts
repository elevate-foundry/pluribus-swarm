import { conversations, InsertConversation } from "../drizzle/schema";
import { getDb } from "./db";

export async function saveMessage(message: InsertConversation) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const [inserted] = await db.insert(conversations).values(message);
  return inserted;
}

export async function getUserConversations(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.createdAt))
    .limit(limit);
}

export async function clearUserConversations(userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.delete(conversations).where(eq(conversations.userId, userId));
}
