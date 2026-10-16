import { test, expect } from '@playwright/test'
import { dtrPage } from '../fixtures/dtr-today-data.js'

for (const portal of ['employee', 'admin']) {
    for (const mobile of [false, true]) {
        test(`${portal} ${mobile ? 'mobile' : 'desktop'} highlights and scrolls once`, async ({ page }) => {
            await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 })
            await page.emulateMedia({ reducedMotion: 'reduce' })
            const errors = []
            page.on('pageerror', error => errors.push(error.message))
            await page.route(/\/(employee\/dtr|admin\/dtr\/\d+)(\?.*)?$/, async route => {
                const url = new URL(route.request().url())
                const response = dtrPage(portal, url.searchParams.get('month') || '2026-10')
                response.url = url.pathname + url.search
                await route.fulfill({ json: response, headers: { 'X-Inertia': 'true' } })
            })
            await page.goto(`/tests/fixtures/dtr-today.html?portal=${portal}`)
            const today = page.locator('[data-dtr-today]:visible')
            await expect(today).toHaveCount(1)
            await expect(today).toContainText('Today')
            await expect.poll(async () => (await today.boundingBox())?.y).toBeGreaterThan(52)
            await expect.poll(async () => (await today.boundingBox())?.y).toBeLessThan(650)
            await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; }' })
            const lightColor = await today.evaluate(el => getComputedStyle(el).backgroundColor)
            await page.evaluate(() => document.documentElement.classList.add('dark'))
            const darkColor = await today.evaluate(el => getComputedStyle(el).backgroundColor)
            expect(darkColor).not.toBe(lightColor)
            await page.screenshot({ path: `output/dtr-today-${portal}-${mobile ? 'mobile' : 'desktop'}-dark.png` })
            await page.evaluate(() => document.documentElement.classList.remove('dark'))
            await page.screenshot({ path: `output/dtr-today-${portal}-${mobile ? 'mobile' : 'desktop'}.png` })
            await page.evaluate(() => window.scrollTo(0, 0))
            // Real Inertia partial refreshes must preserve the reader's position.
            await page.clock.install()
            await page.clock.runFor(16000)
            expect(await page.evaluate(() => window.scrollY)).toBe(0)
            if (portal === 'admin') {
                await page.clock.resume()
                await page.route('**/admin/dtr/1/corrections', async route => {
                    const response = dtrPage(portal)
                    response.url = new URL(page.url()).pathname + new URL(page.url()).search
                    await route.fulfill({ json: response, headers: { 'X-Inertia': 'true' } })
                })
                await page.getByRole('button', { name: /^Correct / }).first().click()
                await page.getByLabel('Reason (required)').fill('Synthetic correction response for scroll regression')
                const beforeSave = await page.evaluate(() => window.scrollY)
                await page.getByRole('button', { name: 'Save correction', exact: true }).click()
                await expect(page.getByRole('dialog')).toHaveCount(0)
                expect(await page.evaluate(() => window.scrollY)).toBe(beforeSave)
            }
            await page.getByRole('button', { name: /previous month/i }).click()
            await expect(today).toHaveCount(0)
            await page.getByRole('button', { name: /next month/i }).click()
            await expect(today).toHaveCount(1)
            await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100)
            expect(errors).toEqual([])
        })
    }
    test(`${portal} missing today does not scroll`, async ({ page }) => {
        await page.goto(`/tests/fixtures/dtr-today.html?portal=${portal}&missing=1`)
        await expect(page.locator('table')).toBeVisible()
        await expect(page.locator('[data-dtr-today]')).toHaveCount(0)
        expect(await page.evaluate(() => window.scrollY)).toBe(0)
    })
}
