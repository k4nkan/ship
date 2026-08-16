export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000",
  mapApiKey: import.meta.env.VITE_MAP_API_KEY ?? "",
  mapStyleUrl:
    import.meta.env.VITE_MAP_STYLE_URL ??
    "https://api.maptiler.com/maps/streets-v2/style.json?key={key}",
};
