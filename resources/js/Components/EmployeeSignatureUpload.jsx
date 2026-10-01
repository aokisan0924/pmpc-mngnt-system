import { useForm } from '@inertiajs/react'
import { useRef } from 'react'

export default function EmployeeSignatureUpload({ employee }) {
    const form = useForm({ signature: null })
    const remove = useForm({})
    const fileInput = useRef(null)
    function submit(event) {
        event.preventDefault()
        form.post(`/admin/employees/${employee.id}/signature`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => { form.reset(); if (fileInput.current) fileInput.current.value = '' },
        })
    }
    return <section className="rounded-2xl border border-border bg-panel p-5 sm:p-6 space-y-3" aria-labelledby="employee-signature-title">
        <h2 id="employee-signature-title" className="font-semibold text-text">Signature for payroll sign-off</h2>
        <p className="text-sm text-sub">Upload a PNG or JPEG, up to 2 MB. A transparent PNG works best. You can select this employee for Prepared by, Certified Correct or Approved by when exporting payroll.</p>
        {employee.signature_url && <div className="rounded-lg border border-border bg-white p-3 w-fit"><img src={employee.signature_url} alt={`${employee.full_name} signature`} className="h-16 max-w-64 object-contain" /></div>}
        <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1">
                <label htmlFor="signature-image" className="block text-sm font-medium text-text mb-2">Signature image</label>
                <input id="signature-image" ref={fileInput} type="file" accept="image/png,image/jpeg" required onChange={e => form.setData('signature', e.target.files[0] ?? null)} className="block w-full text-sm text-text file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-indigo-800" aria-describedby={form.errors.signature ? 'signature-error' : undefined} />
                {form.errors.signature && <p id="signature-error" role="alert" className="mt-2 text-sm text-rose-600">{form.errors.signature}</p>}
            </div>
            <button disabled={form.processing || remove.processing || !form.data.signature} className="rounded-lg bg-[#26215C] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{form.processing ? 'Uploading…' : employee.signature_url ? 'Replace signature' : 'Upload signature'}</button>
            {employee.signature_url && <button type="button" disabled={form.processing || remove.processing} onClick={() => remove.delete(`/admin/employees/${employee.id}/signature`, { preserveScroll: true })} className="rounded-lg border border-border px-4 py-2 text-sm text-rose-600 disabled:opacity-50">Remove signature</button>}
        </form>
    </section>
}
