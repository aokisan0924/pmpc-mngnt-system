// Pages whose visits (opening, filtering, moving cards, saving) must stay smooth,
// with no full-screen loader. Matches the path itself and anything below it.
const SILENT_PATHS = ['/admin/team-tasks']

function pathOf(url) {
    if (!url) return ''
    return typeof url === 'string' ? url.split(/[?#]/)[0] : url.pathname
}

export function shouldShowNavigationLoader(visit) {
    if (
        visit?.poll ||
        (Array.isArray(visit?.only) && visit.only.length > 0) ||
        visit?.showProgress === false ||
        (visit?.preserveState && visit?.preserveScroll && !visit?.url)
    ) {
        return false
    }

    const path = pathOf(visit?.url)
    return !SILENT_PATHS.some(silent => path === silent || path.startsWith(`${silent}/`))
}
