import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { clearUserConversations } from "./conversations";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("chat.sendMessage", () => {
  beforeEach(async () => {
    // Clean up test user's conversations before each test
    await clearUserConversations(1);
  });

  it("saves user message and returns AI response with display text", { timeout: 15000 }, async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.sendMessage({
      message: "Hello, who are you?",
    });

    expect(result).toHaveProperty("message");
    expect(result).toHaveProperty("displayText");
    expect(typeof result.message).toBe("string");
    expect(typeof result.displayText).toBe("string");
    expect(result.message.length).toBeGreaterThan(0);
    expect(result.displayText.length).toBeGreaterThan(0);
  });

  it("maintains conversation history across multiple messages", { timeout: 15000 }, async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    // Send first message
    await caller.chat.sendMessage({
      message: "My name is Alice",
    });

    // Send second message
    await caller.chat.sendMessage({
      message: "What is my name?",
    });

    // Get history
    const history = await caller.chat.getHistory();

    expect(history.length).toBeGreaterThanOrEqual(4); // At least 2 user + 2 assistant messages
    expect(history.some((msg) => msg.content.includes("Alice"))).toBe(true);
  });
});

describe("chat.getHistory", () => {
  beforeEach(async () => {
    await clearUserConversations(1);
  });

  it("returns conversation history in chronological order", { timeout: 15000 }, async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    // Send a message to create history
    await caller.chat.sendMessage({
      message: "Test message",
    });

    const history = await caller.chat.getHistory();

    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeGreaterThan(0);
    
    // Verify chronological order
    for (let i = 1; i < history.length; i++) {
      const prev = new Date(history[i - 1].createdAt).getTime();
      const curr = new Date(history[i].createdAt).getTime();
      expect(curr).toBeGreaterThanOrEqual(prev);
    }
  });

  it("returns empty array for user with no history", async () => {
    const { ctx } = createAuthContext(999); // User with no messages
    const caller = appRouter.createCaller(ctx);

    const history = await caller.chat.getHistory();

    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBe(0);
  });
});

describe("chat.clearHistory", () => {
  beforeEach(async () => {
    await clearUserConversations(1);
  });

  it("clears all conversation history for the user", { timeout: 15000 }, async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    // Create some history
    await caller.chat.sendMessage({
      message: "Test message 1",
    });
    await caller.chat.sendMessage({
      message: "Test message 2",
    });

    // Verify history exists
    let history = await caller.chat.getHistory();
    expect(history.length).toBeGreaterThan(0);

    // Clear history
    const result = await caller.chat.clearHistory();
    expect(result.success).toBe(true);

    // Verify history is empty
    history = await caller.chat.getHistory();
    expect(history.length).toBe(0);
  });
});
