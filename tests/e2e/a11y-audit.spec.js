import { test, expect } from '@playwright/test';

// Axe-core CDN URL
const AXE_CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js';

async function injectAxeAndRun(page, contextName) {
    try {
        await page.addScriptTag({ url: AXE_CDN_URL });
    } catch {
        // Fallback: check if window.axe exists, or evaluate basic accessibility rules
    }

    const auditResults = await page.evaluate(async () => {
        const issues = [];

        // 1. Check if Axe is available
        if (typeof window.axe !== 'undefined') {
            try {
                const axeResults = await window.axe.run(document, {
                    runOnly: {
                        type: 'tag',
                        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
                    }
                });

                axeResults.violations.forEach(v => {
                    issues.push({
                        type: 'axe',
                        id: v.id,
                        impact: v.impact,
                        description: v.description,
                        help: v.help,
                        nodes: v.nodes.slice(0, 3).map(n => ({
                            target: n.target.join(' > '),
                            html: n.html.substring(0, 100),
                            failureSummary: n.failureSummary
                        }))
                    });
                });
            } catch (err) {
                issues.push({ type: 'axe-error', description: err.message });
            }
        }

        // 2. Custom DOM Accessibility Rules
        // Rule: All images must have alt attribute
        document.querySelectorAll('img').forEach((img, idx) => {
            if (!img.hasAttribute('alt')) {
                issues.push({
                    type: 'manual',
                    id: 'image-alt',
                    impact: 'critical',
                    description: `Image #${idx} missing alt attribute`,
                    target: img.src.substring(0, 50)
                });
            }
        });

        // Rule: All interactive buttons must have accessible name
        document.querySelectorAll('button').forEach((btn, idx) => {
            const hasText = btn.innerText && btn.innerText.trim().length > 0;
            const hasAriaLabel = btn.getAttribute('aria-label') && btn.getAttribute('aria-label').trim().length > 0;
            const hasAriaLabelledBy = btn.hasAttribute('aria-labelledby');
            const hasTitle = btn.hasAttribute('title');
            if (!hasText && !hasAriaLabel && !hasAriaLabelledBy && !hasTitle) {
                issues.push({
                    type: 'manual',
                    id: 'button-name',
                    impact: 'critical',
                    description: `Button #${idx} has no accessible name (no text, title, or aria-label)`,
                    html: btn.outerHTML.substring(0, 80)
                });
            }
        });

        // Rule: All inputs must have associated labels
        document.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach((input, idx) => {
            const id = input.id;
            const hasLabel = id && document.querySelector(`label[for="${id}"]`);
            const wrappedInLabel = input.closest('label');
            const hasAriaLabel = input.getAttribute('aria-label') && input.getAttribute('aria-label').trim().length > 0;
            const hasAriaLabelledBy = input.hasAttribute('aria-labelledby');

            if (!hasLabel && !wrappedInLabel && !hasAriaLabel && !hasAriaLabelledBy) {
                issues.push({
                    type: 'manual',
                    id: 'form-label',
                    impact: 'serious',
                    description: `Form control #${idx} (${input.name || input.type || 'input'}) has no associated label`,
                    html: input.outerHTML.substring(0, 80)
                });
            }
        });

        // Rule: Headings hierarchy
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        const h1s = headings.filter(h => h.tagName.toLowerCase() === 'h1');
        if (h1s.length === 0) {
            issues.push({
                type: 'manual',
                id: 'heading-order',
                impact: 'moderate',
                description: 'Page has no <h1> heading'
            });
        }

        // Rule: Skip to main content link
        const skipLink = document.querySelector('a.skip-link, a[href="#main-content"]');
        const mainLandmark = document.querySelector('main, #main-content');
        if (!skipLink) {
            issues.push({
                type: 'manual',
                id: 'skip-link',
                impact: 'moderate',
                description: 'Missing skip to main content link'
            });
        }
        if (!mainLandmark) {
            issues.push({
                type: 'manual',
                id: 'main-landmark',
                impact: 'serious',
                description: 'Missing <main> or #main-content landmark'
            });
        }

        return {
            url: window.location.pathname,
            title: document.title,
            issueCount: issues.length,
            issues
        };
    });

    return auditResults;
}

test.describe('WCAG 2.1 AA Accessibility Comprehensive Audit', () => {
    const fullAuditReport = {};

    test.afterAll(async () => {
        // Output comprehensive audit report
        console.log('\n========================================');
        console.log('ACCESSIBILITY AUDIT REPORT (WCAG 2.1 AA)');
        console.log('========================================\n');
        let totalViolations = 0;
        for (const [pageName, res] of Object.entries(fullAuditReport)) {
            console.log(`--- Page: ${pageName} (${res.url}) ---`);
            console.log(`Total Issues: ${res.issueCount}`);
            if (res.issueCount > 0) {
                totalViolations += res.issueCount;
                res.issues.forEach(i => {
                    console.log(`  [${(i.impact || 'moderate').toUpperCase()}] ${i.id}: ${i.description}`);
                    if (i.nodes && i.nodes.length) {
                        i.nodes.forEach(n => console.log(`     Target: ${n.target} | HTML: ${n.html}`));
                    }
                });
            }
            console.log('');
        }
        console.log(`TOTAL AUDITED PAGES: ${Object.keys(fullAuditReport).length}`);
        console.log(`TOTAL VIOLATIONS FOUND: ${totalViolations}\n`);
    });

    test('Audit Login & Auth Pages', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');
        fullAuditReport['Auth / Login'] = await injectAxeAndRun(page, 'Login');

        await page.goto('/forgot-password');
        await page.waitForLoadState('networkidle');
        fullAuditReport['Auth / Forgot Password'] = await injectAxeAndRun(page, 'Forgot Password');
    });

    test('Audit Employee Portal Pages', async ({ page }) => {
        await page.goto('/login');
        await page.locator('input[type="text"], input[name="identifier"], input[type="email"]').first().fill('dianabpasco@gmail.com');
        await page.locator('input[type="password"]').first().fill('employee28');
        await page.locator('button[type="submit"]').click();
        await page.waitForURL('**/employee/dashboard');

        // 1. Dashboard
        await page.waitForLoadState('networkidle');
        fullAuditReport['Employee / Dashboard'] = await injectAxeAndRun(page, 'Employee Dashboard');

        // 2. DTR
        await page.goto('/employee/dtr');
        await page.waitForLoadState('networkidle');
        fullAuditReport['Employee / DTR'] = await injectAxeAndRun(page, 'Employee DTR');

        // 3. Planner
        await page.goto('/employee/planner');
        await page.waitForLoadState('networkidle');
        fullAuditReport['Employee / Planner'] = await injectAxeAndRun(page, 'Employee Planner');

        // 4. Payslips
        await page.goto('/employee/payslips');
        await page.waitForLoadState('networkidle');
        fullAuditReport['Employee / Payslips'] = await injectAxeAndRun(page, 'Employee Payslips');

        // 5. Profile
        await page.goto('/employee/profile');
        await page.waitForLoadState('networkidle');
        fullAuditReport['Employee / Profile'] = await injectAxeAndRun(page, 'Employee Profile');

        // 6. Notifications
        await page.goto('/employee/notifications');
        await page.waitForLoadState('networkidle');
        fullAuditReport['Employee / Notifications'] = await injectAxeAndRun(page, 'Employee Notifications');
    });

    test('Audit Admin Portal Pages', async ({ page }) => {
        await page.goto('/login');
        await page.locator('input[type="text"], input[name="identifier"], input[type="email"]').first().fill('jeffraesapla24@gmail.com');
        await page.locator('input[type="password"]').first().fill('admin123');
        await page.locator('button[type="submit"]').click();
        await page.waitForURL('**/admin/dashboard');

        // 1. Admin Dashboard
        await page.waitForLoadState('networkidle');
        fullAuditReport['Admin / Dashboard'] = await injectAxeAndRun(page, 'Admin Dashboard');

        // 2. Employees Directory
        await page.goto('/admin/employees');
        await page.waitForLoadState('networkidle');
        fullAuditReport['Admin / Employees'] = await injectAxeAndRun(page, 'Admin Employees');

        // 3. DTR Master Records
        await page.goto('/admin/dtr');
        await page.waitForLoadState('networkidle');
        fullAuditReport['Admin / DTR Records'] = await injectAxeAndRun(page, 'Admin DTR Records');

        // 4. Attendance Requests
        await page.goto('/admin/edit-requests');
        await page.waitForLoadState('networkidle');
        fullAuditReport['Admin / Attendance Requests'] = await injectAxeAndRun(page, 'Admin Edit Requests');

        // 5. Payroll Runs
        await page.goto('/admin/payroll');
        await page.waitForLoadState('networkidle');
        fullAuditReport['Admin / Payroll'] = await injectAxeAndRun(page, 'Admin Payroll');

        // 6. Payroll Analytics
        await page.goto('/admin/payroll/analytics');
        await page.waitForLoadState('networkidle');
        fullAuditReport['Admin / Payroll Analytics'] = await injectAxeAndRun(page, 'Admin Payroll Analytics');

        // 7. 13th Month Pay
        await page.goto('/admin/thirteenth-month');
        await page.waitForLoadState('networkidle');
        fullAuditReport['Admin / 13th Month'] = await injectAxeAndRun(page, 'Admin 13th Month');

        // 8. DTR Archives
        await page.goto('/admin/archives');
        await page.waitForLoadState('networkidle');
        fullAuditReport['Admin / Archives'] = await injectAxeAndRun(page, 'Admin Archives');

        // 9. Settings
        await page.goto('/admin/settings');
        await page.waitForLoadState('networkidle');
        fullAuditReport['Admin / Settings'] = await injectAxeAndRun(page, 'Admin Settings');
    });
});
