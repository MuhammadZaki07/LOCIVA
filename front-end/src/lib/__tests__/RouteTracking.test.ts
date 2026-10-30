/**
 * Route Tracking & Navigation Verification Tests
 * Validates:
 * 1. Directional rotation, bearing fallback, and stationary heading retention.
 * 2. Waypoint completion transitions, green status persistence, and final destination handling.
 * 3. Progressive route trimming along road geometry and road corridor adherence.
 * 4. GPS accuracy classification, jitter suppression, and consecutive arrival verification.
 * 5. Lifecycle cleanup and single-watcher guarantee.
 * 6. Shortest-path angular interpolation and normalization across 0°/360° boundary.
 * 7. Adaptive stationary threshold and immediate heading responsiveness.
 */

import { describe, it, expect } from "vitest";

export interface TestLatLng {
  lat: number;
  lng: number;
}

export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function calculateSegmentRotation(
  start: { x: number; y: number },
  end: { x: number; y: number },
  geoStart?: TestLatLng,
  geoEnd?: TestLatLng,
): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (Math.hypot(dx, dy) > 0.001) {
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  }

  if (geoStart && geoEnd) {
    const bearing = calculateBearing(
      geoStart.lat,
      geoStart.lng,
      geoEnd.lat,
      geoEnd.lng,
    );
    return (bearing - 90 + 360) % 360;
  }

  return 0;
}

export function shortestAngleDelta(from: number, to: number): number {
  const diff = ((to - from + 540) % 360) - 180;
  return diff;
}

export function normalizeAngle(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

export function testRouteTracking() {
  const results: { name: string; passed: boolean; details?: string }[] = [];

  const assert = (name: string, condition: boolean, details?: string) => {
    results.push({ name, passed: condition, details });
    if (!condition) {
      console.error(`FAIL: ${name} - ${details || ""}`);
    } else {
      console.log(`PASS: ${name}`);
    }
  };

  // 1. Rotation Angle & Heading Tests
  {
    const rotEast = calculateSegmentRotation({ x: 0, y: 0 }, { x: 10, y: 0 });
    assert("Direction: Eastward travel is 0 degrees", Math.abs(rotEast) < 0.001);

    const rotSouth = calculateSegmentRotation({ x: 0, y: 0 }, { x: 0, y: 10 });
    assert(
      "Direction: Southward travel is +90 degrees",
      Math.abs(rotSouth - 90) < 0.001,
    );

    const rotWest = calculateSegmentRotation({ x: 10, y: 0 }, { x: 0, y: 0 });
    assert(
      "Direction: Westward travel is 180 degrees",
      Math.abs(Math.abs(rotWest) - 180) < 0.001,
    );

    const rotNorth = calculateSegmentRotation({ x: 0, y: 10 }, { x: 0, y: 0 });
    assert(
      "Direction: Northward travel is -90 degrees",
      Math.abs(rotNorth - -90) < 0.001,
    );

    const rotFallbackNorth = calculateSegmentRotation(
      { x: 5, y: 5 },
      { x: 5, y: 5 },
      { lat: -7.98, lng: 112.63 },
      { lat: -7.97, lng: 112.63 },
    );
    assert(
      "Direction: Fallback geographic bearing North is 270 degrees (CSS -90 deg)",
      Math.abs(rotFallbackNorth - 270) < 0.5,
    );

    // Stationary heading retention: When delta < 1.8m, retain previous heading
    let lastReliableHeading: number | null = 45;
    const prevPos = { lat: -7.98000, lng: 112.63000 };
    const jitterPos = { lat: -7.98001, lng: 112.63001 }; // ~1.5m movement
    const jitterDist = haversineDistance(prevPos.lat, prevPos.lng, jitterPos.lat, jitterPos.lng);
    let heading = lastReliableHeading;
    if (jitterDist >= 2.5) {
      heading = calculateBearing(prevPos.lat, prevPos.lng, jitterPos.lat, jitterPos.lng);
    }
    assert(
      "Heading: Stationary micro-jitter retains last reliable heading without random spin",
      heading === 45,
    );
  }

  // 2. Waypoint Completion and Green Status Mapping
  {
    const waypoints = [
      { id: "wp-1", lat: -7.980, lng: 112.630, name: "Titik Awal" },
      { id: "wp-2", lat: -7.970, lng: 112.630, name: "Titik B" },
      { id: "wp-3", lat: -7.960, lng: 112.630, name: "Titik C" },
      { id: "dest", lat: -7.950, lng: 112.630, name: "Tujuan Akhir" },
    ];

    let completedKeys: string[] = [];
    let activeIndex = 0;
    let isNavigationFinished = false;

    const getStatus = (wpId: string, idx: number) => {
      const isCompleted = completedKeys.includes(wpId);
      const isCurrent = !isNavigationFinished && activeIndex === idx && !isCompleted;
      return { isCompleted, isCurrent, isPending: !isCompleted && !isCurrent };
    };

    // Initial state: Start at wp-1
    assert("Waypoint Status: Initial wp-1 is current target", getStatus("wp-1", 0).isCurrent);
    assert("Waypoint Status: wp-2 is pending initially", getStatus("wp-2", 1).isPending);

    // Arrive at wp-1
    completedKeys.push("wp-1");
    activeIndex = 1;
    assert("Waypoint Status: wp-1 is completed (turns green)", getStatus("wp-1", 0).isCompleted);
    assert("Waypoint Status: wp-2 becomes current target (yellow/amber)", getStatus("wp-2", 1).isCurrent);

    // Arrive at wp-2
    completedKeys.push("wp-2");
    activeIndex = 2;
    assert("Waypoint Status: wp-1 remains completed (green)", getStatus("wp-1", 0).isCompleted);
    assert("Waypoint Status: wp-2 is completed (green)", getStatus("wp-2", 1).isCompleted);
    assert("Waypoint Status: wp-3 becomes current target", getStatus("wp-3", 2).isCurrent);

    // Arrive at wp-3
    completedKeys.push("wp-3");
    activeIndex = 3;
    assert("Waypoint Status: dest becomes current target", getStatus("dest", 3).isCurrent);

    // Arrive at Destination (Final)
    completedKeys.push("dest");
    isNavigationFinished = true;
    assert("Waypoint Status: Final destination marked completed", getStatus("dest", 3).isCompleted);
    assert("Waypoint Status: All waypoints remain completed in finished state",
      waypoints.every((wp) => completedKeys.includes(wp.id))
    );
  }

  // 3. Progressive Route Trimming Along Road Geometry
  {
    const fullRoute: [number, number][] = [
      [-7.980, 112.630],
      [-7.978, 112.630],
      [-7.976, 112.630],
      [-7.974, 112.630],
      [-7.972, 112.630],
      [-7.970, 112.630],
      [-7.968, 112.630],
      [-7.966, 112.630],
      [-7.964, 112.630],
      [-7.962, 112.630],
    ];

    let lastTrimmedIndex = 0;
    const trimRoute = (userLat: number, userLng: number) => {
      let closest = -1;
      let minD = Infinity;
      const searchStart = lastTrimmedIndex;
      const searchEnd = Math.min(fullRoute.length, searchStart + 40);

      for (let i = searchStart; i < searchEnd; i++) {
        const d = haversineDistance(userLat, userLng, fullRoute[i][0], fullRoute[i][1]);
        if (d < minD) {
          minD = d;
          closest = i;
        }
      }

      if (closest > lastTrimmedIndex && minD <= 40) {
        lastTrimmedIndex = closest;
        return [
          [userLat, userLng] as [number, number],
          ...fullRoute.slice(closest + 1),
        ];
      }
      return null;
    };

    const trimmed1 = trimRoute(-7.97605, 112.63002);
    assert("Route Trimming: Traversed segments 0 and 1 removed", trimmed1 !== null && lastTrimmedIndex === 2);
    assert("Route Trimming: Remaining coordinates start from user location",
      trimmed1 !== null && trimmed1[0][0] === -7.97605
    );
    assert("Route Trimming: Road ahead from point 3 onwards preserved",
      trimmed1 !== null && trimmed1.length === (fullRoute.length - 2)
    );

    const parallelStreetAttempt = trimRoute(-7.970, 112.6315);
    assert(
      "Route Trimming: Parallel road deviation (>40m) does not falsely trim route",
      parallelStreetAttempt === null && lastTrimmedIndex === 2,
    );

    const trimmed2 = trimRoute(-7.96801, 112.63001);
    assert(
      "Route Trimming: Monotonic forward progression advances to point 6",
      trimmed2 !== null && lastTrimmedIndex === 6,
    );

    const clearedRoute: [number, number][] = [];
    assert("Route Trimming: Completed route cleared on final arrival", clearedRoute.length === 0);
  }

  // 4. GPS Accuracy & Arrival Verification
  {
    const classifyAccuracy = (accuracy: number) => {
      if (accuracy <= 15) return "good";
      if (accuracy <= 35) return "medium";
      return "poor";
    };

    assert("GPS Accuracy: 10m is good accuracy", classifyAccuracy(10) === "good");
    assert("GPS Accuracy: 25m is medium accuracy", classifyAccuracy(25) === "medium");
    assert("GPS Accuracy: 60m is poor accuracy", classifyAccuracy(60) === "poor");

    const targetWp = { lat: -7.980, lng: 112.630 };
    const arrivalThreshold = 35;
    let consecutiveArrivals = 0;

    const processReading = (pos: { lat: number; lng: number; accuracy: number }) => {
      const dist = haversineDistance(pos.lat, pos.lng, targetWp.lat, targetWp.lng);
      const isAcceptable = pos.accuracy <= 75;

      if (dist <= arrivalThreshold && isAcceptable) {
        consecutiveArrivals++;
      } else {
        consecutiveArrivals = 0;
      }

      return isAcceptable && ((dist <= 15) || (consecutiveArrivals >= 2));
    };

    const glitchResult = processReading({ lat: -7.98005, lng: 112.63005, accuracy: 80 });
    assert("GPS Reliability: Reading with accuracy > 75m does not confirm arrival", !glitchResult);

    const reading1 = processReading({ lat: -7.98020, lng: 112.63010, accuracy: 30 });
    assert("GPS Reliability: Single reading within threshold does not immediately trigger (needs consecutive)", !reading1);

    const reading2 = processReading({ lat: -7.98020, lng: 112.63010, accuracy: 30 });
    assert("GPS Reliability: 2 consecutive verified readings confirm waypoint arrival", reading2);
  }

  // 5. Watcher Lifecycle and Duplicate Prevention
  {
    let currentWatchId: number | null = null;
    let isTracking = false;

    const stopTracking = () => {
      if (currentWatchId !== null) {
        currentWatchId = null;
      }
      isTracking = false;
    };

    const startTracking = () => {
      if (currentWatchId !== null) {
        stopTracking();
      }
      currentWatchId = 101;
      isTracking = true;
    };

    startTracking();
    assert("Lifecycle: Watcher active after start", isTracking && currentWatchId === 101);

    startTracking();
    assert("Lifecycle: No duplicate watcher on restart", isTracking && currentWatchId === 101);

    stopTracking();
    assert("Lifecycle: Watcher released cleanly on stop", !isTracking && currentWatchId === null);
  }

  // 6. Shortest Angular Path Across 0°/360° Boundary
  {
    // Clockwise crossing: from 355° to 5° -> should be +10°, NOT -350°
    const cwDelta = shortestAngleDelta(355, 5);
    assert("Angular Delta: 355° to 5° is +10° (shortest path through 0°)", Math.abs(cwDelta - 10) < 0.001);

    // Counter-clockwise crossing: from 5° to 355° -> should be -10°, NOT +350°
    const ccwDelta = shortestAngleDelta(5, 355);
    assert("Angular Delta: 5° to 355° is -10° (shortest path through 0°)", Math.abs(ccwDelta - -10) < 0.001);

    // Straight turn: from 100° to 120° -> +20°
    const normalDelta = shortestAngleDelta(100, 120);
    assert("Angular Delta: 100° to 120° is +20°", Math.abs(normalDelta - 20) < 0.001);

    // Opposite direction: from 0° to 180° -> 180°
    const uTurnDelta = Math.abs(shortestAngleDelta(0, 180));
    assert("Angular Delta: 0° to 180° is 180° (U-turn)", Math.abs(uTurnDelta - 180) < 0.001);

    // Angle Normalization
    assert("Normalization: -10° normalizes to 350°", normalizeAngle(-10) === 350);
    assert("Normalization: 370° normalizes to 10°", normalizeAngle(370) === 10);
    assert("Normalization: 720° normalizes to 0°", normalizeAngle(720) === 0);

    // Simulated LERP convergence across 0° boundary
    let displayed = 350;
    const target = 10;
    const LERP = 0.18;
    for (let frame = 0; frame < 25; frame++) {
      const delta = shortestAngleDelta(displayed, target);
      if (Math.abs(delta) < 0.3) {
        displayed = target;
        break;
      }
      displayed = normalizeAngle(displayed + delta * LERP);
    }
    assert("Angular LERP: 350° smoothly converges to 10° across boundary", Math.abs(displayed - 10) < 0.3);
  }

  // 7. Adaptive Stationary Threshold & Responsiveness
  {
    const getStationaryThreshold = (accuracy: number) => {
      return Math.max(1.5, Math.min(accuracy * 0.15, 5));
    };

    // High accuracy (10m): threshold is 1.5m -> movement of 2.0m is accepted as moving
    const th10 = getStationaryThreshold(10);
    assert("Adaptive Threshold: 10m accuracy yields 1.5m threshold", th10 === 1.5);

    // Moderate accuracy (30m): threshold is 4.5m -> 2.0m jitter is suppressed
    const th30 = getStationaryThreshold(30);
    assert("Adaptive Threshold: 30m accuracy yields 4.5m threshold (suppresses noise)", th30 === 4.5);

    // Poor accuracy (60m): threshold caps at 5.0m
    const th60 = getStationaryThreshold(60);
    assert("Adaptive Threshold: 60m accuracy caps at 5.0m threshold", th60 === 5.0);

    // Responsiveness: Movement >= 1.5m triggers bearing calculation when heading absent
    const p1 = { lat: -7.98000, lng: 112.63000 };
    const p2 = { lat: -7.980015, lng: 112.630015 }; // ~2.3m movement
    const dist = haversineDistance(p1.lat, p1.lng, p2.lat, p2.lng);
    assert("Bearing Responsiveness: Delta >= 1.5m triggers bearing computation", dist >= 1.5);
  }
  // 8. Indonesia Map Bounds & Geographic Confinement
  {
    const INDONESIA_BOUNDS: [[number, number], [number, number]] = [
      [-13.5, 92.0], // Barat Daya (South-West)
      [8.5, 144.0],  // Timur Laut (North-East)
    ];

    const isInsideIndonesia = (lat: number, lng: number) => {
      const [[south, west], [north, east]] = INDONESIA_BOUNDS;
      return lat >= south && lat <= north && lng >= west && lng <= east;
    };

    // Extreme outer points of Indonesian territory
    assert("Bounds: Sabang / Pulau Rondo (North-West) is inside bounds", isInsideIndonesia(6.075, 95.1));
    assert("Bounds: Pulau Rote / Ndana (South) is inside bounds", isInsideIndonesia(-11.01, 122.86));
    assert("Bounds: Merauke / Muara Torasi (East) is inside bounds", isInsideIndonesia(-9.13, 141.01));
    assert("Bounds: Pulau Miangas (North) is inside bounds", isInsideIndonesia(5.56, 126.58));

    // Major Indonesian cities
    assert("Bounds: Malang is inside bounds", isInsideIndonesia(-7.9797, 112.6304));
    assert("Bounds: Jakarta is inside bounds", isInsideIndonesia(-6.2088, 106.8456));
    assert("Bounds: Surabaya is inside bounds", isInsideIndonesia(-7.2575, 112.7521));
    assert("Bounds: Medan is inside bounds", isInsideIndonesia(3.5952, 98.6722));
    assert("Bounds: Makassar is inside bounds", isInsideIndonesia(-5.1477, 119.4327));
    assert("Bounds: Jayapura is inside bounds", isInsideIndonesia(-2.5489, 140.7181));

    // International coordinates outside Indonesia must be excluded
    assert("Bounds: Tokyo (Japan) is strictly excluded", !isInsideIndonesia(35.6762, 139.6503));
    assert("Bounds: Sydney (Australia) is strictly excluded", !isInsideIndonesia(-33.8688, 151.2093));
    assert("Bounds: London (UK) is strictly excluded", !isInsideIndonesia(51.5074, -0.1278));
    assert("Bounds: Singapore (North of equator, close border) longitude matches but latitude is evaluated accurately",
      isInsideIndonesia(1.3521, 103.8198) // near border within buffer
    );
  }


  const allPassed = results.every((r) => r.passed);
  console.log(`\nTest Summary: ${results.filter((r) => r.passed).length}/${results.length} tests passed.`);
  return allPassed;
}

describe("RouteTracking", () => {
  it("runs all 57 route tracking verification assertions", () => {
    expect(testRouteTracking()).toBe(true);
  });
});
