import { test, expect } from '@playwright/test'
import { execSync } from 'child_process'

test.beforeEach(() => {
    execSync('& "C:\\Users\\Kurtong\\.config\\herd-lite\\bin\\php.exe" "C:\\Users\\Kurtong\\.gemini\\antigravity-ide\\brain\\d034b54c-278c-4f2c-90ff-43a939c5b713\\scratch\\reset_demo_dtr.php"', { shell: 'powershell.exe' })
})

test('Employee punches AM In and verifies DTR Workstation state transition', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/login')

    // Login as Demo Employee
    await page.locator('input[type="text"], input[name="identifier"], input[type="email"]').first().fill('employee@pmpc.coop')
    await page.locator('input[type="password"]').first().fill('password')
    await page.locator('button[type="submit"]').click()

    await page.waitForURL('**/employee/dashboard', { timeout: 10000 })

    // Verify initial DTR console state: Ready for AM In (Step 1 of 4)
    await expect(page.getByText('Daily Time Record Console')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Punch AM In' })).toBeVisible()

    // Take screenshot of Initial State
    await page.screenshot({ path: 'output/dtr-before-punch.png', fullPage: true })

    // Click the prominent Punch AM In button
    const punchButton = page.getByRole('button', { name: 'Punch AM In' })
    await expect(punchButton).toBeVisible()
    await punchButton.click()

    // Expect success feedback message
    await expect(page.getByText(/Recorded AM In successfully/)).toBeVisible({ timeout: 5000 })

    // Wait for the UI state machine to advance to AM Out (Step 2 of 4)
    await expect(page.getByRole('heading', { name: 'Punch AM Out' })).toBeVisible({ timeout: 5000 })

    // Take screenshot of State After Punch
    await page.screenshot({ path: 'output/dtr-after-punch.png', fullPage: true })
})
