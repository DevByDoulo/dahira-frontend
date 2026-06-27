// URL du tunnel Cloudflare pour le backend (port 3000)
// Mettre à jour à chaque nouvelle session cloudflared
const TUNNEL_BACKEND_URL = 'https://presents-placement-fusion-jobs.trycloudflare.com';

const host = window.location.hostname;
const isLocal = host === 'localhost' || /^(192\.168|10\.|172\.(1[6-9]|2\d|3[01]))/.test(host);
const backendUrl = isLocal ? `http://${host}:3000` : TUNNEL_BACKEND_URL;

export const environment = {
  production: false,
  apiUrl: `${backendUrl}/api`,
  backendUrl,
};
