import { test, expect } from '@playwright/test'

test.describe('PMPC WorkForce Smoke & Design Verification', () => {
    test('1. Verify Login page renders correctly', async ({ page }) => {
        await page.goto('/')
        await expect(page).toHaveTitle(/PMPC WorkForce/i)
        await page.screenshot({ path: 'output/login-page.png', fullPage: true })
    })

    test('2. Admin Portal - All Sidebar Pages Verification', async ({ page }) => {
        await page.goto('/login')

        // Fill credentials
        await page.locator('input[type="text"], input[name="identifier"], input[type="email"]').first().fill('jeffraesapla24@gmail.com')
        await page.locator('input[type="password"]').first().fill('admin123')
        await page.locator('button[type="submit"]').click()

        // 1. Dashboard
        await page.waitForURL('**/admin/dashboard', { timeout: 10000 })
        await expect(page.locator('h1')).toContainText('Operations overview')
        await page.screenshot({ path: 'output/admin-dashboard.png', fullPage: true })

        // 2. Employees directory
        await page.goto('/admin/employees')
        await expect(page.locator('h1')).toContainText('Employee Management')
        await page.screenshot({ path: 'output/admin-employees.png', fullPage: true })

        // 3. DTR records
        await page.goto('/admin/dtr')
        await expect(page.locator('h1')).toContainText('Daily Time Records')
        await page.screenshot({ path: 'output/admin-dtr.png', fullPage: true })

        // 4. DTR Edit Requests
        await page.goto('/admin/edit-requests')
        await expect(page.locator('h1')).toContainText('DTR Edit Requests')
        await page.screenshot({ path: 'output/admin-edit-requests.png', fullPage: true })

        // 5. Payroll
        await page.goto('/admin/payroll')
        await expect(page.locator('h1')).toContainText('Payroll Management')
        await page.screenshot({ path: 'output/admin-payroll.png', fullPage: true })

        // 6. Payroll Analytics
        await page.goto('/admin/payroll/analytics')
        await expect(page.locator('h1')).toContainText('Payroll Analytics')
        await page.screenshot({ path: 'output/admin-payroll-analytics.png', fullPage: true })

        // 7. 13th Month Pay
        await page.goto('/admin/thirteenth-month')
        await expect(page.locator('h1')).toContainText('13th Month Pay')
        await page.screenshot({ path: 'output/admin-thirteenth-month.png', fullPage: true })

        // 8. Archives
        await page.goto('/admin/archives')
        await expect(page.locator('h1')).toContainText('DTR Archives')
        await page.screenshot({ path: 'output/admin-archives.png', fullPage: true })

        // 9. Settings
        await page.goto('/admin/settings')
        await expect(page.locator('h1')).toContainText('System Settings')
        await page.screenshot({ path: 'output/admin-settings.png', fullPage: true })
    })

    test('3. Employee Portal - All Sidebar Pages Verification', async ({ page }) => {
        await page.goto('/login')

        // Fill employee credentials
        await page.locator('input[type="text"], input[name="identifier"], input[type="email"]').first().fill('dianabpasco@gmail.com')
        await page.locator('input[type="password"]').first().fill('employee28')
        await page.locator('button[type="submit"]').click()

        // 1. Dashboard
        await page.waitForURL('**/employee/dashboard', { timeout: 10000 })
        await expect(page.locator('text=4-Punch Attendance Flow')).toBeVisible()
        await expect(page.getByText(/Next required action|Today’s attendance/)).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Today at a glance' })).toBeVisible()
        await page.screenshot({ path: 'output/employee-dashboard.png', fullPage: true })

        // 2. Daily Time Record
        await page.goto('/employee/dtr')
        await expect(page.locator('h1')).toContainText('Daily Time Record')
        await page.screenshot({ path: 'output/employee-dtr.png', fullPage: true })

        // 3. Weekly Planner
        await page.goto('/employee/planner')
        await expect(page.locator('h1')).toContainText('Work Planner')
        await page.screenshot({ path: 'output/employee-planner.png', fullPage: true })

        // 4. Payslips
        await page.goto('/employee/payslips')
        await expect(page.locator('h1')).toContainText('My Payslips')
        await page.screenshot({ path: 'output/employee-payslips.png', fullPage: true })

        // 5. My Profile
        await page.goto('/employee/profile')
        await expect(page.locator('h1')).toContainText('Diana Pasco')
        await page.screenshot({ path: 'output/employee-profile.png', fullPage: true })

        // 6. Notifications
        await page.goto('/employee/notifications')
        await expect(page.locator('h1')).toContainText('Notification Center')
        await page.screenshot({ path: 'output/employee-notifications.png', fullPage: true })
    })

    test('4. Employee Dashboard - Mobile DTR Priority', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 })
        await page.goto('/login')
        await page.locator('input[type="text"], input[name="identifier"], input[type="email"]').first().fill('dianabpasco@gmail.com')
        await page.locator('input[type="password"]').first().fill('employee28')
        await page.locator('button[type="submit"]').click()

        await page.waitForURL('**/employee/dashboard', { timeout: 10000 })
        await expect(page.getByText(/Next required action|Today’s attendance/)).toBeVisible()

        await expect(page.getByTestId('dtr-primary-action')).toHaveCSS('position', 'sticky')

        await page.screenshot({ path: 'output/employee-dashboard-mobile.png', fullPage: true })

        const employeePages = [
            { path: '/employee/dtr', heading: 'Daily Time Record', screenshot: 'employee-dtr-mobile.png' },
            { path: '/employee/planner', heading: 'Work Planner', screenshot: 'employee-planner-mobile.png' },
            { path: '/employee/payslips', heading: 'My Payslips', screenshot: 'employee-payslips-mobile.png' },
            { path: '/employee/profile', heading: 'Diana Pasco', screenshot: 'employee-profile-mobile.png' },
            { path: '/employee/notifications', heading: 'Notification Center', screenshot: 'employee-notifications-mobile.png' },
        ]

        for (const employeePage of employeePages) {
            await page.goto(employeePage.path)
            await expect(page.getByRole('heading', { name: employeePage.heading, exact: true })).toBeVisible()
            await page.screenshot({ path: `output/${employeePage.screenshot}`, fullPage: true })
        }
    })
})
