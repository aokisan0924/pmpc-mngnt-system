import { useRef, useState } from 'react'
import { router } from '@inertiajs/react'
import { createAttendancePunchFlow } from './attendancePunchFlow'

export default function useAttendancePunch(url) {
    const flow = useRef(null)
    flow.current ??= createAttendancePunchFlow()
    const [pendingPunch, setPendingPunch] = useState(null)

    function punch(slot, version, callbacks) {
        const isRetry = flow.current.pending() !== null
        const request = flow.current.request(slot, version)
        setPendingPunch(request)
        if (isRetry) callbacks.onRetry?.(request)

        router.post(url, request, {
            preserveScroll: true,
            onSuccess: (...args) => {
                flow.current.complete()
                setPendingPunch(null)
                callbacks.onSuccess?.(...args)
            },
            onError: (...args) => {
                flow.current.complete()
                setPendingPunch(null)
                callbacks.onError?.(...args)
            },
            onHttpException: (response) => {
                if (response.status < 500) {
                    flow.current.complete()
                    setPendingPunch(null)
                }
                callbacks.onHttpException?.(response, request)
            },
            onNetworkError: () => callbacks.onNetworkError?.(request),
            onFinish: callbacks.onFinish,
        })
    }

    return { punch, pendingPunch }
}
