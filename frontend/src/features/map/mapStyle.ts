import type { StyleSpecification } from "maplibre-gl";

const mapApiKey = import.meta.env.VITE_MAP_API_KEY ?? "";
const mapStyleUrl =
  import.meta.env.VITE_MAP_STYLE_URL ??
  "https://api.maptiler.com/maps/streets-v2/style.json?key={key}";

export function getMapStyle(): StyleSpecification | string {
  if (mapApiKey) {
    return mapStyleUrl.replace("{key}", encodeURIComponent(mapApiKey));
  }

  return {
    version: 8,
    sources: {
      "osm-raster": {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        minzoom: 0,
        maxzoom: 19,
      },
    },
    layers: [
      {
        id: "osm-raster",
        type: "raster",
        source: "osm-raster",
      },
    ],
  };
}
