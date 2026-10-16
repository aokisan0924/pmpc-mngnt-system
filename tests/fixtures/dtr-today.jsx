import React from 'react'
import { createRoot } from 'react-dom/client'
import { createInertiaApp } from '@inertiajs/react'
import EmployeeDtr from '../../resources/js/Pages/Employee/Dtr'
import AdminDtr from '../../resources/js/Pages/Admin/DtrShow'
import { dtrPage } from './dtr-today-data'
import '../../resources/css/app.css'

const params = new URLSearchParams(location.search)
createInertiaApp({
    page: dtrPage(params.get('portal'), params.get('month') || '2026-10', 1, params.has('missing')),
    resolve: name => name === 'Admin/DtrShow' ? AdminDtr : EmployeeDtr,
    setup: ({ el, App, props }) => createRoot(el).render(<App {...props} />),
})
