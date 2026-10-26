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
  spacing = 300,
}: RouteDirectionArrowsProps) {
  const map = useMap();
  const { L } = useLeaflet();

  useEffect(() => {
    if (!L || positions.length < 2) return;

    let arrows: LayerGroup | null = null;

    const drawArrows = () => {
      if (arrows) {
        map.removeLayer(arrows);
      }

      arrows = L.layerGroup().addTo(map);

      const points = positions.map(([lat, lng]) => L.latLng(lat, lng));

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

        if (length === 0) continue;

        segments.push({
          start,
          end,
          length,
          cumulative: totalLength,
        });

        totalLength += length;
      }

      if (totalLength < spacing) return;

      // Maksimal 4 panah untuk satu rute.
      const arrowCount = Math.min(4, Math.floor(totalLength / spacing));

      if (arrowCount === 0) return;

      const getPointAtDistance = (distance: number) => {
        const segment = segments.find(
          (item) =>
            distance >= item.cumulative &&
            distance <= item.cumulative + item.length,
        );

        if (!segment) return null;

        const fraction = (distance - segment.cumulative) / segment.length;

        const lat =
          segment.start.lat + (segment.end.lat - segment.start.lat) * fraction;

        const lng =
          segment.start.lng + (segment.end.lng - segment.start.lng) * fraction;

        const startPoint = map.latLngToLayerPoint(segment.start);
        const endPoint = map.latLngToLayerPoint(segment.end);
        const angle = endPoint.subtract(startPoint);

        return {
          latLng: L.latLng(lat, lng),
          rotation: (Math.atan2(angle.y, angle.x) * 180) / Math.PI,
        };
      };

      // Sebarkan kandidat secara merata sepanjang rute.
      const candidates = Array.from(
        { length: arrowCount },
        (_, i) => ((i + 1) * totalLength) / (arrowCount + 1),
      );

      const acceptedPoints: ReturnType<typeof getPointAtDistance>[] = [];

      // Jarak minimum visual antarpanah: 80 piksel.
      const minPixelDistance = 80;

      for (const distance of candidates) {
        const candidate = getPointAtDistance(distance);

        if (!candidate) continue;

        const pixel = map.latLngToLayerPoint(candidate.latLng);

        const tooClose = acceptedPoints.some((existing) => {
          if (!existing) return false;

          const existingPixel = map.latLngToLayerPoint(existing.latLng);

          return pixel.distanceTo(existingPixel) < minPixelDistance;
        });

        if (!tooClose) {
          acceptedPoints.push(candidate);
        }
      }

      for (const point of acceptedPoints) {
        if (!point) continue;

        const icon = L.divIcon({
          className: "",
          iconSize: [12, 12],
          iconAnchor: [6, 6],
          html: `
            <div style="
              width: 12px;
              height: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: ${color};
              font-size: 12px;
              font-weight: 700;
              line-height: 12px;
              text-shadow:
                -1px -1px 0 white,
                 1px -1px 0 white,
                -1px  1px 0 white,
                 1px  1px 0 white;
              transform: rotate(${point.rotation}deg);
            ">➤</div>
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

    map.on("zoomend", drawArrows);

    return () => {
      map.off("zoomend", drawArrows);

      if (arrows) {
        map.removeLayer(arrows);
      }
    };
  }, [L, map, positions, color, spacing]);

  return null;
}
