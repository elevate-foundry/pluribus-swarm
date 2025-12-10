import { test, expect } from '@playwright/test';

test.describe('Swarm Chat', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start fresh
    await page.goto('http://localhost:5173');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should display welcome modal for new visitor', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Wait for welcome modal
    await expect(page.getByText('A new mind approaches')).toBeVisible({ timeout: 5000 });
    
    // Enter name
    await page.getByPlaceholder('What shall we call you?').fill('TestUser');
    await page.getByRole('button', { name: 'Join the swarm' }).click();
    
    // Should see welcome message
    await expect(page.getByText('Welcome, TestUser')).toBeVisible({ timeout: 3000 });
  });

  test('should open chat and send message', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Handle welcome modal first
    const welcomeModal = page.getByText('A new mind approaches');
    if (await welcomeModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.getByRole('button', { name: 'Remain anonymous' }).click();
      await page.waitForTimeout(2000);
    }
    
    // Click chat button
    const chatButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    await chatButton.click();
    
    // Wait for chat panel to open
    await expect(page.getByText('Speak with the Swarm')).toBeVisible({ timeout: 5000 });
    
    // Type a message
    const input = page.getByPlaceholder('Type your message...');
    await expect(input).toBeVisible();
    await input.fill('Hello swarm, this is a test message!');
    
    // Click send button
    const sendButton = page.locator('button').filter({ has: page.locator('svg.lucide-send') });
    await sendButton.click();
    
    // Wait for response (loading spinner should appear then disappear)
    await page.waitForTimeout(5000);
    
    // Check if our message appears
    await expect(page.getByText('Hello swarm, this is a test message!')).toBeVisible({ timeout: 10000 });
    
    // Check if swarm responded (should have "Swarm forming:" text)
    await expect(page.getByText(/Swarm forming:/i)).toBeVisible({ timeout: 10000 });
  });

  test('should track console logs for swarm state', async ({ page }) => {
    const consoleLogs: string[] = [];
    
    page.on('console', msg => {
      if (msg.text().includes('[SwarmCanvas]')) {
        consoleLogs.push(msg.text());
      }
    });
    
    await page.goto('http://localhost:5173');
    
    // Handle welcome modal
    const welcomeModal = page.getByText('A new mind approaches');
    if (await welcomeModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.getByRole('button', { name: 'Remain anonymous' }).click();
      await page.waitForTimeout(2000);
    }
    
    // Wait for swarm to initialize
    await page.waitForTimeout(3000);
    
    // Log what we captured
    console.log('=== SWARM CONSOLE LOGS ===');
    consoleLogs.forEach(log => console.log(log));
    console.log('=== END LOGS ===');
    
    // Verify we got some logs
    expect(consoleLogs.length).toBeGreaterThan(0);
  });

  test('debug: check chat input and send functionality', async ({ page }) => {
    const consoleLogs: string[] = [];
    const errors: string[] = [];
    const networkRequests: string[] = [];
    
    page.on('console', msg => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });
    
    page.on('pageerror', err => {
      errors.push(err.message);
    });
    
    // Track network requests
    page.on('request', req => {
      if (req.url().includes('trpc')) {
        networkRequests.push(`REQ: ${req.method()} ${req.url()}`);
      }
    });
    
    page.on('response', res => {
      if (res.url().includes('trpc')) {
        networkRequests.push(`RES: ${res.status()} ${res.url()}`);
      }
    });
    
    await page.goto('http://localhost:5173');
    
    // Handle welcome modal
    await page.waitForTimeout(1000);
    const skipButton = page.getByRole('button', { name: 'Remain anonymous' });
    if (await skipButton.isVisible().catch(() => false)) {
      await skipButton.click();
      await page.waitForTimeout(2000);
    }
    
    // Open chat
    await page.locator('button').first().click();
    await page.waitForTimeout(1000);
    
    // Find and interact with input
    const input = page.getByPlaceholder('Type your message...');
    console.log('Input visible:', await input.isVisible());
    console.log('Input disabled:', await input.isDisabled());
    
    await input.click();
    await input.fill('Test message from Playwright');
    console.log('Input value after fill:', await input.inputValue());
    
    // Check send button state
    const sendButton = page.locator('button[class*="rounded-full"]').last();
    console.log('Send button disabled:', await sendButton.isDisabled());
    
    // Try clicking send button instead of Enter
    await sendButton.click();
    console.log('Clicked send button');
    
    // Wait and check for response
    await page.waitForTimeout(8000);
    
    // Log network requests
    console.log('=== NETWORK REQUESTS ===');
    networkRequests.forEach(r => console.log(r));
    
    // Log any errors
    if (errors.length > 0) {
      console.log('=== PAGE ERRORS ===');
      errors.forEach(e => console.log(e));
    }
    
    // Log relevant console messages
    console.log('=== CONSOLE LOGS (errors) ===');
    consoleLogs.filter(l => l.includes('error') || l.includes('Error')).forEach(l => console.log(l));
    
    // Check if message appeared
    const messageVisible = await page.getByText('Test message from Playwright').isVisible().catch(() => false);
    console.log('Message visible in chat:', messageVisible);
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/chat-debug.png', fullPage: true });
  });
});
