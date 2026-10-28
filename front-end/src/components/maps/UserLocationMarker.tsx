import React, { useEffect, useRef, useCallback } from "react";
import { MapCircle, useLeaflet } from "@/components/ui/shadcn-ui/map";
import { useMap } from "react-leaflet";

interface UserLocationMarkerProps {
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number | null;
}

/**
 * Computes the shortest angular delta between two bearings (both in [0, 360)).
 * Returns a value in (-180, 180].
 */
export function shortestAngleDelta(from: number, to: number): number {
  const diff = ((to - from + 540) % 360) - 180;
  return diff;
}

/**
 * Normalizes an angle to [0, 360).
 */
export function normalizeAngle(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * UserLocationMarker renders the user's GPS position as a smooth, responsive
 * navigation arrow that rotates according to real-time heading via direct DOM
 * manipulation inside a requestAnimationFrame loop — entirely bypassing React
 * re-renders for heading updates to eliminate flicker and marker recreation.
 *
 * Architecture:
 *  - The Leaflet Marker is created imperatively once and added to the map.
 *  - Its div icon contains a stable DOM tree with the arrow SVG.
 *  - Heading is stored in a ref and smoothly interpolated via rAF.
 *  - The transform style is applied directly to the icon element.
 *  - Lat/lng/accuracy updates use setLatLng / circle radius update (low-frequency).
 */
export const UserLocationMarker: React.FC<UserLocationMarkerProps> = ({
  lat,
  lng,
  accuracy = 30,
  heading,
}) => {
  const map = useMap();
  const { L } = useLeaflet();

  // --- Refs (never cause re-render) ---
  const markerRef = useRef<any>(null);
  const arrowElRef = useRef<HTMLElement | null>(null);
  const displayedHeadingRef = useRef<number | null>(null);
  const targetHeadingRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const hasHeadingRef = useRef<boolean>(false);

  // --- Build stable SVG icon HTML ---
  const buildIconHtml = useCallback(() => {
    return `
      <div class="ulm-root" style="width:36px;height:36px;position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer;">
        <!-- Navigation arrow (shown when heading available) -->
        <div class="ulm-arrow" style="display:none;width:36px;height:36px;position:relative;display:flex;align-items:center;justify-content:center;">
          <!-- Light cone / beam -->
          <div style="position:absolute;top:-24px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:14px solid transparent;border-right:14px solid transparent;border-bottom:28px solid rgba(37,99,235,0.22);filter:blur(2px);pointer-events:none;"></div>
          <!-- Google Maps Navigation Arrow SVG -->
          <svg viewBox="0 0 24 24" width="30" height="30" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35));flex-shrink:0;">
            <path d="M12 2 L20 20 L12 16 L4 20 Z" fill="#2563eb" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round"/>
          </svg>
        </div>
        <!-- Pulsing dot (shown when no heading available) -->
        <div class="ulm-dot" style="position:relative;display:flex;align-items:center;justify-content:center;width:24px;height:24px;">
          <span style="position:absolute;display:inline-flex;width:100%;height:100%;border-radius:50%;background:#60a5fa;opacity:0.75;animation:ulm-ping 1.2s cubic-bezier(0,0,0.2,1) infinite;"></span>
          <span style="position:relative;display:inline-flex;width:16px;height:16px;border-radius:50%;border:2px solid white;background:#2563eb;box-shadow:0 2px 6px rgba(0,0,0,0.25);"></span>
        </div>
      </div>
      <style>
        @keyframes ulm-ping {
          75%,100% { transform: scale(2); opacity: 0; }
        }
      </style>
    `;
  }, []);

  // --- Build popup content ---
  const buildPopupContent = useCallback((cLat: number, cLng: number, acc: number, head?: number | null) => {
    const accLabel = acc <= 15 ? "Baik" : acc <= 35 ? "Sedang" : "Rendah";
    const accClass = acc <= 15 ? "#059669" : acc <= 35 ? "#d97706" : "#dc2626";
    const headText = typeof head === "number" && !isNaN(head)
      ? `<span style="background:#eff6ff;color:#1d4ed8;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;">Arah: ${Math.round(head)}°</span>`
      : "";

    return `
      <div style="padding:8px 12px;text-align:center;font-family:system-ui,sans-serif;min-width:140px;">
        <p style="font-weight:700;font-size:13px;color:#0f172a;margin:0 0 2px 0;">Lokasi GPS Anda</p>
        <p style="font-size:10px;color:#64748b;font-family:monospace;margin:0 0 6px 0;">${cLat.toFixed(5)}, ${cLng.toFixed(5)}</p>
        <div style="display:flex;align-items:center;justify-content:center;gap:4px;flex-wrap:wrap;">
          <span style="background:#f1f5f9;color:${accClass};padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;">
            Akurasi: ~${Math.round(acc)}m (${accLabel})
          </span>
          ${headText}
        </div>
      </div>
    `;
  }, []);

  // --- Create marker imperatively (once on mount) ---
  useEffect(() => {
    if (!map || !L) return;

    const icon = L.divIcon({
      html: buildIconHtml(),
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -20],
      className: "route-direction-arrow-marker",
    });

    const marker = L.marker([lat, lng], { icon, zIndexOffset: 1000 });
    marker.bindPopup(buildPopupContent(lat, lng, accuracy, heading));
    marker.addTo(map);
    markerRef.current = marker;

    const iconEl = marker.getElement();
    if (iconEl) {
      const arrowDiv = iconEl.querySelector(".ulm-arrow") as HTMLElement | null;
      if (arrowDiv) arrowElRef.current = arrowDiv;
    }

    return () => {
      marker.remove();
      markerRef.current = null;
      arrowElRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, L]);

  // --- Update marker lat/lng and popup content when position changes ---
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      markerRef.current.setPopupContent(buildPopupContent(lat, lng, accuracy, heading));
    }
  }, [lat, lng, accuracy, heading, buildPopupContent]);

  // --- Update target heading ref whenever heading prop changes ---
  useEffect(() => {
    const hasH = typeof heading === "number" && !isNaN(heading);
    hasHeadingRef.current = hasH;
    if (hasH) {
      targetHeadingRef.current = normalizeAngle(heading!);
      // Initialize displayed heading immediately on first arrival
      if (displayedHeadingRef.current === null) {
        displayedHeadingRef.current = targetHeadingRef.current;
      }
    }

    // Toggle arrow vs dot visibility in live DOM
    const iconEl = markerRef.current?.getElement?.();
    if (iconEl) {
      const arrowDiv = iconEl.querySelector(".ulm-arrow") as HTMLElement | null;
      const dotDiv = iconEl.querySelector(".ulm-dot") as HTMLElement | null;
      if (arrowDiv) {
        arrowDiv.style.display = hasH ? "flex" : "none";
        arrowElRef.current = arrowDiv;
      }
      if (dotDiv) {
        dotDiv.style.display = hasH ? "none" : "flex";
      }
    }
  }, [heading]);

  // --- rAF smooth interpolation loop ---
  useEffect(() => {
    const LERP_FACTOR = 0.18; // ~60ms response lag at 60fps for snappy feel
    const CONVERGENCE_THRESHOLD = 0.3; // degrees

    let running = true;

    const tick = () => {
      if (!running) return;

      const target = targetHeadingRef.current;
      const displayed = displayedHeadingRef.current;
      const arrowEl = arrowElRef.current;

      if (arrowEl && target !== null && displayed !== null) {
        const delta = shortestAngleDelta(displayed, target);

        let nextAngle: number;
        if (Math.abs(delta) < CONVERGENCE_THRESHOLD) {
          nextAngle = target;
        } else {
          nextAngle = normalizeAngle(displayed + delta * LERP_FACTOR);
        }

        displayedHeadingRef.current = nextAngle;
        arrowEl.style.transform = `rotate(${nextAngle}deg)`;
        arrowEl.style.willChange = "transform";
      }

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      running = false;
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  return (
    <>
      <MapCircle
        center={[lat, lng]}
        radius={Math.max(8, Math.min(accuracy, 80))}
        pathOptions={{
          color: "#3b82f6",
          fillColor: "#3b82f6",
          fillOpacity: 0.08,
          weight: 1,
        }}
      />
    </>
  );
};
