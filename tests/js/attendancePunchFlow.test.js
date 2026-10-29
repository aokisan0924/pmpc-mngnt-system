import test from 'node:test'
import assert from 'node:assert/strict'
import { attendancePunchAction, createAttendancePunchFlow, attendancePunchRetryMessage, attendancePunchSuccessMessage } from '../../resources/js/hooks/attendancePunchFlow.js'

test('an ambiguous AM In retry stays AM In after polling advances the dashboard to AM Out', () => {
    let id = 0
    const flow = createAttendancePunchFlow(() => `request-${++id}`)
    const firstRequest = flow.request('am_time_in', 'version-before-in')

    // A lost response or 5xx deliberately leaves the operation unresolved.
    const retriedRequest = flow.request('am_time_out', 'version-after-poll')

    assert.deepEqual(retriedRequest, firstRequest)
    assert.equal(retriedRequest.expected_slot, 'am_time_in')
    assert.deepEqual(attendancePunchAction(retriedRequest, { key: 'am_time_out', label: 'AM Out' }), {
        slot: 'am_time_in',
        label: 'Retry AM In',
        retry: true,
    })
    assert.equal(attendancePunchRetryMessage(retriedRequest), 'The earlier AM In request is still unresolved. Click the punch button to safely retry that same request.')
    assert.equal(attendancePunchSuccessMessage(), "The attendance request was accepted. Today's attendance has refreshed.")
    assert.doesNotMatch(attendancePunchSuccessMessage(), /AM Out|AM In|08:00|12:00/)

    // A poll can also report that today's sequence is complete; the unresolved request remains retryable.
    assert.deepEqual(attendancePunchAction(flow.pending(), null), {
        slot: 'am_time_in',
        label: 'Retry AM In',
        retry: true,
    })

    flow.complete()
    assert.equal(attendancePunchAction(flow.pending(), null), null)
    assert.deepEqual(attendancePunchAction(flow.pending(), { key: 'am_time_out', label: 'AM Out' }), {
        slot: 'am_time_out',
        label: 'Punch AM Out',
        retry: false,
    })
    assert.deepEqual(flow.request('am_time_out', 'version-after-in'), {
        request_id: 'request-2',
        expected_slot: 'am_time_out',
        expected_version: 'version-after-in',
    })
})
