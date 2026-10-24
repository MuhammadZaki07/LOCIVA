import Echo from "laravel-echo";
import Pusher from "pusher-js";

(window as any).Pusher = Pusher;

const echo = new Echo({
  broadcaster: "reverb",
  key: import.meta.env.VITE_REVERB_APP_KEY,
  wsHost: import.meta.env.VITE_REVERB_HOST || "localhost",
  wsPort: Number(import.meta.env.VITE_REVERB_PORT || 8080),
  wssPort: Number(import.meta.env.VITE_REVERB_PORT || 8080),
  forceTLS: import.meta.env.VITE_REVERB_SCHEME === "https",
  enabledTransports: ["ws", "wss"],

  authEndpoint: "http://localhost:8000/api/broadcasting/auth",

  auth: {
    headers: {
      Accept: "application/json",
    },
  },

  authorizer: (channel: any) => ({
    authorize: (socketId: string, callback: Function) => {
      const token = localStorage.getItem("token");

      if (!token) {
        callback(new Error("Token autentikasi tidak ditemukan"), false);
        return;
      }

      fetch("http://localhost:8000/api/broadcasting/auth", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Bearer ${token}`,
        },
        body: new URLSearchParams({
          socket_id: socketId,
          channel_name: channel.name,
        }),
      })
        .then(async (response) => {
          const data = await response.json();

          if (!response.ok) {
            throw new Error(
              `Broadcast auth gagal (${response.status}): ${
                data.message || "Autentikasi ditolak"
              }`,
            );
          }

          callback(null, data);
        })
        .catch((error) => {
          console.error("[Reverb] Channel authorization gagal:", error);
          callback(error, false);
        });
    },
  }),
});

export default echo;
