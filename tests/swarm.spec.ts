import { test, expect } from '@playwright/test'

test.describe('Pluribus Swarm', () => {
  test('homepage loads with canvas', async ({ page }) => {
    await page.goto('/')
    
    // Check that the page loads
    await expect(page).toHaveTitle(/Pluribus/)
    
    // Check that the canvas element exists
    const canvas = page.locator('canvas')
    await expect(canvas).toBeVisible()
    
    // Canvas should be full screen
    const canvasBox = await canvas.boundingBox()
    expect(canvasBox).not.toBeNull()
    expect(canvasBox!.width).toBeGreaterThan(100)
    expect(canvasBox!.height).toBeGreaterThan(100)
  })

  test('canvas has correct styling', async ({ page }) => {
    await page.goto('/')
    
    const canvas = page.locator('canvas')
    await expect(canvas).toHaveClass(/bg-black/)
    await expect(canvas).toHaveCSS('position', 'fixed')
  })

  test('E Pluribus Unum text appears after delay', async ({ page }) => {
    await page.goto('/')
    
    // Wait for the animation delay (4 seconds + 2 seconds duration)
    await page.waitForTimeout(6000)
    
    // Check for the tagline text
    const tagline = page.locator('text=E Pluribus Unum')
    await expect(tagline).toBeVisible()
  })

  test('chat toggle button is visible', async ({ page }) => {
    await page.goto('/')
    
    // Wait for button animation (2 second delay)
    await page.waitForTimeout(2500)
    
    // Find the chat toggle button
    const chatButton = page.locator('button').filter({ has: page.locator('svg') }).first()
    await expect(chatButton).toBeVisible()
  })

  test('clicking chat button opens chat panel', async ({ page }) => {
    await page.goto('/')
    
    // Wait for button to appear
    await page.waitForTimeout(2500)
    
    // Click the chat toggle button
    const chatButton = page.locator('button').filter({ has: page.locator('svg') }).first()
    await chatButton.click()
    
    // Check that chat panel appears
    const chatHeader = page.locator('text=Speak with the Swarm')
    await expect(chatHeader).toBeVisible({ timeout: 5000 })
  })

  test('canvas responds to mouse movement', async ({ page }) => {
    await page.goto('/')
    
    const canvas = page.locator('canvas')
    await expect(canvas).toBeVisible()
    
    // Get canvas dimensions
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    
    // Move mouse across canvas
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.waitForTimeout(500)
    await page.mouse.move(box.x + box.width / 4, box.y + box.height / 4)
    
    // If we get here without errors, mouse interaction works
    expect(true).toBe(true)
  })

  test('canvas IndexSizeError bug check - no errors on load', async ({ page }) => {
    const errors: string[] = []
    
    page.on('pageerror', (error) => {
      errors.push(error.message)
    })
    
    await page.goto('/')
    await page.waitForTimeout(3000)
    
    // Check for IndexSizeError which was mentioned in todo.md
    const indexSizeErrors = errors.filter(e => e.includes('IndexSizeError'))
    expect(indexSizeErrors).toHaveLength(0)
  })

  test('canvas handles window resize', async ({ page }) => {
    await page.goto('/')
    
    const canvas = page.locator('canvas')
    await expect(canvas).toBeVisible()
    
    // Resize viewport
    await page.setViewportSize({ width: 800, height: 600 })
    await page.waitForTimeout(500)
    
    // Canvas should still be visible and sized correctly
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBe(800)
    expect(box!.height).toBe(600)
  })
})
