const rawBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, "");

export function apiUrl(path) {
  if (!path) {
    return API_BASE_URL;
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return `${API_BASE_URL}/${path.replace(/^\/+/, "")}`;
}

export function assetUrl(path) {
  if (!path) {
    return "";
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return apiUrl(path);
}

export function wsUrl(path = "/ws") {
  const websocketBase = API_BASE_URL
    .replace(/^http:/, "ws:")
    .replace(/^https:/, "wss:");

  return `${websocketBase}/${path.replace(/^\/+/, "")}`;
}
