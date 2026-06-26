const host = window.location.hostname;
const backendUrl = `http://${host}:3000`;

export const environment = {
  production: false,
  apiUrl: `${backendUrl}/api`,
  backendUrl,
};
