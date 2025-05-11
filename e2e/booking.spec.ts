import { test, expect } from '@playwright/test';

test('complete booking flow', async ({ page }) => {
  // Go to homepage
  await page.goto('/');
  
  // Navigate to booking page
  await page.click('text=New Booking');
  
  // Fill booking form
  await page.fill('input[name="guestName"]', 'Test Guest');
  await page.fill('input[name="email"]', 'test@example.com');
  
  // Select dates (simplified)
  await page.fill('input[name="checkIn"]', '2023-12-01');
  await page.fill('input[name="checkOut"]', '2023-12-10');
  
  // Submit form
  await page.click('button[type="submit"]');
  
  // Verify success message appears
  await expect(page.locator('text=Booking created successfully')).toBeVisible();
});