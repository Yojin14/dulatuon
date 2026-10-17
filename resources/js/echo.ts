import axios from 'axios';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
    interface Window {
        Pusher: typeof Pusher;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Echo: Echo<any>;
    }
}

window.Pusher = Pusher;

/* eslint-disable @typescript-eslint/no-explicit-any */
const authorizer = (channel: any) => ({
    authorize: (socketId: string, callback: (error: Error | null, data: any) => void) => {
        axios
            .post('/broadcasting/auth', {
                socket_id: socketId,
                channel_name: channel.name,
            })
            .then((response) => callback(null, response.data))
            .catch((error) => callback(error instanceof Error ? error : new Error(String(error)), null));
    },
});
/* eslint-enable @typescript-eslint/no-explicit-any */

if (import.meta.env.VITE_PUSHER_APP_KEY) {
    window.Echo = new Echo({
        broadcaster: 'pusher',
        key: import.meta.env.VITE_PUSHER_APP_KEY as string,
        cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER as string,
        forceTLS: true,
        authorizer,
    });
}

export default window.Echo;
