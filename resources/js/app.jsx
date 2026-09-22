import '../css/app.css'
import { createInertiaApp } from '@inertiajs/react'
import { createRoot } from 'react-dom/client'
import NavigationLoader from './Components/NavigationLoader'
import './echo'

const pages = import.meta.glob('./Pages/**/*.jsx')

createInertiaApp({
    resolve: async name => {
        const loadPage = pages[`./Pages/${name}.jsx`]

        if (!loadPage) {
            throw new Error(`Unknown Inertia page: ${name}`)
        }

        return loadPage()
    },
    setup({ el, App, props }) {
        createRoot(el).render(
            <>
                <App {...props} />
                <NavigationLoader />
            </>
        )
    },
    progress: false,
})
