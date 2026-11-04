import test from 'node:test'
import assert from 'node:assert/strict'
import { shouldShowNavigationLoader } from '../../resources/js/hooks/navigationLoaderPolicy.js'

const visit = (path, extra = {}) => ({ url: new URL(`https://example.test${path}`), ...extra })

test('a normal page navigation shows the full-screen loader', () => {
    assert.equal(shouldShowNavigationLoader(visit('/admin/payroll')), true)
})

test('Team tasks never shows the loader: opening it, filtering, moving, saving or deleting', () => {
    assert.equal(shouldShowNavigationLoader(visit('/admin/team-tasks')), false)
    assert.equal(shouldShowNavigationLoader(visit('/admin/team-tasks?overdue=1')), false)
    assert.equal(shouldShowNavigationLoader(visit('/admin/team-tasks/12/status')), false)
    assert.equal(shouldShowNavigationLoader({ url: '/admin/team-tasks/12' }), false)
})

test('a path that only starts with the same letters is not silenced', () => {
    assert.equal(shouldShowNavigationLoader(visit('/admin/team-tasks-archive')), true)
})

test('polls, partial reloads and showProgress false stay silent', () => {
    assert.equal(shouldShowNavigationLoader(visit('/admin/payroll', { poll: true })), false)
    assert.equal(shouldShowNavigationLoader(visit('/admin/payroll', { only: ['stats'] })), false)
    assert.equal(shouldShowNavigationLoader(visit('/admin/payroll', { showProgress: false })), false)
})
