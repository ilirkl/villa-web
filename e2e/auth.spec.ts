import { test, expect } from '@playwright/test'

test('login flow', async ({ page }) => {
  await page.goto('/en/login')
  
  // Fill login form
  await page.fill('input[name="email"]', 'test@example.com')
  await page.fill('input[name="password"]', 'password123')
  
  // Submit form
  await page.click('button[type="submit"]')
  
  // Check redirect to dashboard
  await expect(page).toHaveURL(/dashboard/)
})

test('protected routes redirect to login', async ({ page }) => {
  await page.goto('/en/dashboard')
  
  // Should redirect to login
  await expect(page).toHaveURL(/login/)
})