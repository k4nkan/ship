export const START_COORDINATE: [number, number] = [0, 85];
export const GOAL_COORDINATE: [number, number] = [135.5613416, 34.8096024];
export const ROUTE_TARGET_GYAN = 1000;

export type RouteSpot = {
  label: string;
  coordinate: [number, number];
};

export const ROUTE_SPOTS: RouteSpot[] = [
  { label: "北極点", coordinate: START_COORDINATE },
  { label: "トロムソ 🇳🇴", coordinate: [18.9553, 69.6492] },
  { label: "ロンドン 🇬🇧", coordinate: [-0.1276, 51.5074] },
  { label: "ローマ 🇮🇹", coordinate: [12.4964, 41.9028] },
  { label: "カイロ 🇪🇬", coordinate: [31.2357, 30.0444] },
  { label: "ドバイ 🇦🇪", coordinate: [55.2708, 25.2048] },
  { label: "デリー 🇮🇳", coordinate: [77.1025, 28.7041] },
  { label: "バンコク 🇹🇭", coordinate: [100.5018, 13.7563] },
  { label: "香港 🇭🇰", coordinate: [114.1694, 22.3193] },
  { label: "ソウル 🇰🇷", coordinate: [126.978, 37.5665] },
  { label: "東京 🇯🇵", coordinate: [139.6917, 35.6895] },
  { label: "立命館 🏁", coordinate: GOAL_COORDINATE },
];

export const ROUTE_MARKERS: RouteSpot[] = ROUTE_SPOTS;

export const ROUTE_COORDINATES: [number, number][] = ROUTE_SPOTS.map(
  (spot) => spot.coordinate,
);

type RouteSegment = {
  start: [number, number];
  end: [number, number];
  startProjected: [number, number];
  endProjected: [number, number];
  length: number;
  totalLength: number;
};

type RegionBounds = {
  label: string;
  minLongitude: number;
  maxLongitude: number;
  minLatitude: number;
  maxLatitude: number;
};

const APPROXIMATE_REGION_BOUNDS: RegionBounds[] = [
  {
    label: "東京 🇯🇵",
    minLongitude: 128,
    maxLongitude: 147,
    minLatitude: 30,
    maxLatitude: 46,
  },
  {
    label: "ソウル 🇰🇷",
    minLongitude: 123,
    maxLongitude: 130,
    minLatitude: 30,
    maxLatitude: 40,
  },
  {
    label: "香港 🇭🇰",
    minLongitude: 108,
    maxLongitude: 123,
    minLatitude: 10,
    maxLatitude: 30,
  },
  {
    label: "バンコク 🇹🇭",
    minLongitude: 90,
    maxLongitude: 108,
    minLatitude: 0,
    maxLatitude: 22,
  },
  {
    label: "デリー 🇮🇳",
    minLongitude: 65,
    maxLongitude: 90,
    minLatitude: 5,
    maxLatitude: 35,
  },
  {
    label: "ドバイ 🇦🇪",
    minLongitude: 40,
    maxLongitude: 65,
    minLatitude: 15,
    maxLatitude: 32,
  },
  {
    label: "カイロ 🇪🇬",
    minLongitude: 25,
    maxLongitude: 40,
    minLatitude: 20,
    maxLatitude: 35,
  },
  {
    label: "ローマ 🇮🇹",
    minLongitude: 5,
    maxLongitude: 25,
    minLatitude: 35,
    maxLatitude: 48,
  },
  {
    label: "ロンドン 🇬🇧",
    minLongitude: -15,
    maxLongitude: 10,
    minLatitude: 45,
    maxLatitude: 60,
  },
  {
    label: "トロムソ 🇳🇴",
    minLongitude: -10,
    maxLongitude: 35,
    minLatitude: 55,
    maxLatitude: 75,
  },
];

function createRouteSegments(): RouteSegment[] {
  const segments: RouteSegment[] = [];
  let totalLength = 0;

  for (let index = 1; index < ROUTE_COORDINATES.length; index += 1) {
    const start = ROUTE_COORDINATES[index - 1];
    const end = ROUTE_COORDINATES[index];
    const startProjected = projectCoordinate(start);
    const endProjected = projectCoordinate(end);
    const length = Math.hypot(
      endProjected[0] - startProjected[0],
      endProjected[1] - startProjected[1],
    );
    totalLength += length;
    segments.push({
      start,
      end,
      startProjected,
      endProjected,
      length,
      totalLength,
    });
  }

  return segments;
}

const routeSegments = createRouteSegments();
const routeLength = routeSegments.at(-1)?.totalLength ?? 0;

export function sampleRouteCoordinate(progress: number): [number, number] {
  const segment = getRouteSegment(progress);
  const target = clampProgress(progress) * routeLength;
  const previousLength = segment.totalLength - segment.length;
  const segmentProgress =
    segment.length === 0 ? 0 : (target - previousLength) / segment.length;

  const projectedCoordinate: [number, number] = [
    segment.startProjected[0] +
      (segment.endProjected[0] - segment.startProjected[0]) * segmentProgress,
    segment.startProjected[1] +
      (segment.endProjected[1] - segment.startProjected[1]) * segmentProgress,
  ];

  return unprojectCoordinate(projectedCoordinate);
}

export function getTraveledRoute(progress: number): [number, number][] {
  const segmentIndex = routeSegments.indexOf(getRouteSegment(progress));
  const currentCoordinate = sampleRouteCoordinate(progress);
  const coordinates = ROUTE_COORDINATES.slice(0, segmentIndex + 1);
  const lastCoordinate = coordinates.at(-1);

  if (
    lastCoordinate?.[0] === currentCoordinate[0] &&
    lastCoordinate?.[1] === currentCoordinate[1]
  ) {
    return coordinates;
  }

  return coordinates.concat([currentCoordinate]);
}

export function getCurrentRouteLabel(progress: number): string {
  const clampedProgress = clampProgress(progress);
  if (clampedProgress >= 1) {
    return ROUTE_SPOTS[ROUTE_SPOTS.length - 1].label;
  }

  const currentCoordinate = sampleRouteCoordinate(clampedProgress);
  const approximateRegion = getApproximateRegionLabel(currentCoordinate);
  if (approximateRegion) return approximateRegion;

  const target = clampedProgress * routeLength;
  const segmentIndex = routeSegments.findIndex(
    (segment) => segment.totalLength > target,
  );
  return ROUTE_SPOTS[Math.max(0, segmentIndex)].label;
}

function getApproximateRegionLabel([longitude, latitude]: [number, number]):
  string | null {
  const region = APPROXIMATE_REGION_BOUNDS.find(
    (bounds) =>
      longitude >= bounds.minLongitude &&
      longitude <= bounds.maxLongitude &&
      latitude >= bounds.minLatitude &&
      latitude <= bounds.maxLatitude,
  );
  return region?.label ?? null;
}

function getRouteSegment(progress: number): RouteSegment {
  const target = clampProgress(progress) * routeLength;
  return (
    routeSegments.find((item) => item.totalLength >= target) ??
    routeSegments[routeSegments.length - 1]
  );
}

function clampProgress(progress: number): number {
  return Math.min(1, Math.max(0, progress));
}

function projectCoordinate([longitude, latitude]: [number, number]): [
  number,
  number,
] {
  const limitedLatitude = Math.max(
    -85.05112878,
    Math.min(85.05112878, latitude),
  );
  const latitudeRadians = (limitedLatitude * Math.PI) / 180;

  return [longitude, Math.log(Math.tan(Math.PI / 4 + latitudeRadians / 2))];
}

function unprojectCoordinate([longitude, projectedLatitude]: [
  number,
  number,
]): [number, number] {
  return [
    longitude,
    (Math.atan(Math.exp(projectedLatitude)) * 360) / Math.PI - 90,
  ];
}
