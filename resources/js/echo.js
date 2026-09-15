import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

window.Pusher = Pusher

window.Echo = import.meta.env.VITE_PUSHER_APP_KEY ? new Echo({
    broadcaster: 'pusher',
    key:         import.meta.env.VITE_PUSHER_APP_KEY,
    cluster:     import.meta.env.VITE_PUSHER_APP_CLUSTER,
    forceTLS:    true,
}) : null

export default window.Echo
