import type { StyleSpecification } from "maplibre-gl";
import { env } from "../../lib/env";

const mapApiKey = env.mapApiKey;
const mapStyleUrl = env.mapStyleUrl;

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
