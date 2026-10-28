import { useEffect } from "react";
import { useMap } from "react-leaflet";
import type { LayerGroup, LatLng } from "leaflet";
import { useLeaflet } from "@/components/ui/shadcn-ui/map";

interface RouteDirectionArrowsProps {
  positions: [number, number][];
  color: string;
  spacing?: number;
}

export default function RouteDirectionArrows({
  positions,
  color,
  spacing = 100,
}: RouteDirectionArrowsProps) {
  const map = useMap();
  const { L } = useLeaflet();

  useEffect(() => {
    if (!L || !Array.isArray(positions) || positions.length < 2) return;

    // Filter valid coordinate pairs
    const validPositions = positions.filter(
      (pos): pos is [number, number] =>
        Array.isArray(pos) &&
        pos.length >= 2 &&
        typeof pos[0] === "number" &&
        Number.isFinite(pos[0]) &&
        typeof pos[1] === "number" &&
        Number.isFinite(pos[1]),
    );

    if (validPositions.length < 2) return;

    let arrows: LayerGroup | null = null;

    const drawArrows = () => {
      if (arrows) {
        map.removeLayer(arrows);
      }

      arrows = L.layerGroup().addTo(map);

      const points = validPositions.map(([lat, lng]) => L.latLng(lat, lng));

      const segments: {
        start: LatLng;
        end: LatLng;
        length: number;
        cumulative: number;
      }[] = [];

      let totalLength = 0;

      for (let i = 1; i < points.length; i++) {
        const start = points[i - 1];
        const end = points[i];
        const length = start.distanceTo(end);

        if (length <= 0) continue;

        segments.push({
          start,
          end,
          length,
          cumulative: totalLength,
        });

        totalLength += length;
      }

      if (totalLength <= 0 || segments.length === 0) return;

      const getPointAtDistance = (distance: number) => {
        const targetDist = Math.max(0, Math.min(distance, totalLength));

        const segment =
          segments.find(
            (item) =>
              targetDist >= item.cumulative &&
              targetDist <= item.cumulative + item.length,
          ) || segments[segments.length - 1];

        if (!segment || segment.length <= 0) return null;

        const fraction = Math.max(
          0,
          Math.min(1, (targetDist - segment.cumulative) / segment.length),
        );

        const lat =
          segment.start.lat + (segment.end.lat - segment.start.lat) * fraction;
        const lng =
          segment.start.lng + (segment.end.lng - segment.start.lng) * fraction;

        const startPoint = map.latLngToLayerPoint(segment.start);
        const endPoint = map.latLngToLayerPoint(segment.end);
        const dx = endPoint.x - startPoint.x;
        const dy = endPoint.y - startPoint.y;

        let rotation = 0;
        if (Math.hypot(dx, dy) > 0.001) {
          rotation = (Math.atan2(dy, dx) * 180) / Math.PI;
        } else {
          // Spherical bearing fallback if segment pixel length collapses at low zoom
          const dLng = (segment.end.lng - segment.start.lng) * (Math.PI / 180);
          const lat1 = segment.start.lat * (Math.PI / 180);
          const lat2 = segment.end.lat * (Math.PI / 180);
          const y = Math.sin(dLng) * Math.cos(lat2);
          const x =
            Math.cos(lat1) * Math.sin(lat2) -
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
          const bearing = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
          rotation = (bearing - 90 + 360) % 360;
        }

        return {
          latLng: L.latLng(lat, lng),
          rotation,
        };
      };

      // Determine step distance along route
      const stepMeters = Math.max(30, Math.min(spacing || 80, 150));
      const candidates: number[] = [];

      if (totalLength < stepMeters) {
        // For short routes, evaluate middle point
        candidates.push(totalLength / 2);
      } else {
        // Distribute candidate points along the path
        for (let d = stepMeters * 0.5; d < totalLength; d += stepMeters) {
          candidates.push(d);
        }
      }

      const acceptedPoints: { latLng: LatLng; rotation: number }[] = [];
      const acceptedPixels: LatLng[] = []; // store pixel coordinates

      // Minimum visual pixel distance between consecutive arrows on screen
      const minPixelDistance = 75;
      const bounds = map.getBounds().pad(0.2); // Include slightly beyond viewport
      const maxArrows = 70; // Cap to keep smooth 60fps rendering

      for (const distance of candidates) {
        if (acceptedPoints.length >= maxArrows) break;

        const candidate = getPointAtDistance(distance);
        if (!candidate) continue;

        // Skip arrows not in current visible map area
        if (!bounds.contains(candidate.latLng)) continue;

        const pixel = map.latLngToLayerPoint(candidate.latLng);

        const tooClose = acceptedPixels.some((p) => {
          const dx = pixel.x - p.lat; // reusing LatLng container for x, y
          const dy = pixel.y - p.lng;
          return Math.hypot(dx, dy) < minPixelDistance;
        });

        if (!tooClose) {
          acceptedPoints.push(candidate);
          acceptedPixels.push(L.latLng(pixel.x, pixel.y));
        }
      }

      for (const point of acceptedPoints) {
        const icon = L.divIcon({
          className: "route-direction-arrow-marker",
          iconSize: [16, 16],
          iconAnchor: [8, 8],
          html: `
            <div style="
              width: 16px;
              height: 16px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: transparent;
              border: none;
              padding: 0;
              margin: 0;
              pointer-events: none;
            ">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                style="
                  display: block;
                  transform: rotate(${point.rotation}deg);
                  transform-origin: 8px 8px;
                  filter: drop-shadow(0px 1px 1.5px rgba(0, 0, 0, 0.4));
                "
              >
                <path
                  d="M4 2.5 L13 8 L4 13.5 L6.8 8 Z"
                  fill="${color}"
                  stroke="#ffffff"
                  stroke-width="1.5"
                  stroke-linejoin="round"
                  stroke-linecap="round"
                />
              </svg>
            </div>
          `,
        });

        L.marker(point.latLng, {
          icon,
          interactive: false,
          keyboard: false,
          zIndexOffset: 500,
        }).addTo(arrows);
      }
    };

    drawArrows();

    const handleMapChange = () => {
      drawArrows();
    };

    map.on("zoomend", handleMapChange);
    map.on("moveend", handleMapChange);
    map.on("resize", handleMapChange);

    return () => {
      map.off("zoomend", handleMapChange);
      map.off("moveend", handleMapChange);
      map.off("resize", handleMapChange);

      if (arrows) {
        map.removeLayer(arrows);
      }
    };
  }, [L, map, positions, color, spacing]);

  return null;
}
