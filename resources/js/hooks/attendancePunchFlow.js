export function createAttendancePunchFlow(idFactory = () => crypto.randomUUID()) {
    let pendingRequest = null

    return {
        request(slot, version) {
            pendingRequest ??= {
                request_id: idFactory(),
                expected_slot: slot,
                expected_version: version,
            }

            return pendingRequest
        },
        complete() {
            pendingRequest = null
        },
        pending() {
            return pendingRequest
        },
    }
}

export function attendancePunchSuccessMessage() {
    return "The attendance request was accepted. Today's attendance has refreshed."
}

const punchSlotLabels = {
    am_time_in: 'AM In',
    am_time_out: 'AM Out',
    pm_time_in: 'PM In',
    pm_time_out: 'PM Out',
}

export function attendancePunchAction(pendingRequest, nextSlot) {
    if (pendingRequest) {
        const label = punchSlotLabels[pendingRequest.expected_slot] ?? 'attendance'

        return { slot: pendingRequest.expected_slot, label: `Retry ${label}`, retry: true }
    }

    return nextSlot ? { slot: nextSlot.key, label: `Punch ${nextSlot.label}`, retry: false } : null
}

export function attendancePunchRetryMessage(request) {
    const label = punchSlotLabels[request.expected_slot] ?? 'attendance'

    return `The earlier ${label} request is still unresolved. Click the punch button to safely retry that same request.`
}
