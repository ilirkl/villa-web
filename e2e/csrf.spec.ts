import { test, expect } from '@playwright/test'

test('forms include CSRF token', async ({ page }) => {
  // Login first
  // ...login code...
  
  await page.goto('/en/bookings/new')
  
  // Check if form contains hidden CSRF input
  const csrfInput = await page.$('input[name="csrf_token"]')
  expect(csrfInput).not.toBeNull()
  
  // Verify token is not empty
  const value = await csrfInput?.inputValue()
  expect(value).toBeTruthy()
})