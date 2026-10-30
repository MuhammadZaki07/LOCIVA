import React, { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Search,
  Navigation,
  Plus,
  Trash2,
  ArrowUpDown,
  Save,
  Route,
  Sparkles,
  Share2,
  Clock,
  MapPin,
  RefreshCw,
  CheckCircle2,
  X,
  Check,
  Target,
  Bot,
  Loader2,
  AlertCircle,
  Lightbulb,
  Radar,
  CircleDot,
  Play,
  Flag,
  ChevronDown,
  ChevronUp,
  Info,
  Layers,
} from "lucide-react";
import api from "@/context/apiClient";
import { useDebounce } from "@/hooks/useDebounce";
import { RouteLocationSearch } from "./RouteLocationSearch";
import { fetchPlacesAround } from "@/lib/Osm";
import {
  calculateRoute,
  type RouteWaypoint,
  type RouteCalculationResult,
} from "@/lib/routing";
import {
  streamAiAnalysis,
  buildAreaAnalysisSystemMessage,
  buildAreaAnalysisPrompt,
  validateAndMapAiResponse,
  requestAreaRoutePlan,
  convertAiAreaResponseToWaypoints,
  type AiAreaRouteResponse,
  type AiRoutePoint,
  type AiRouteCandidate,
  type AiRouteRecommendation,
} from "@/lib/aiRoutePlanner";
import { useToast } from "@/components/ui/Toast";

export interface SavedRouteItem {
  id: string;
  name: string;
  waypoints: RouteWaypoint[];
  route_coordinates?: [number, number][];
  start_location_name?: string;
  end_location_name?: string;
  distance?: number;
  estimated_duration?: number;
  status: string;
  is_shared: boolean;
  notes?: string;
  created_at?: string;
}

interface UserBusinessOption {
  id: number | string;
  name: string;
  latitude?: number | string;
  longitude?: number | string;
  lat?: number | string;
  lng?: number | string;
}

export interface TrackingLocationUpdate {
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number | null;
  speed?: number | null;
  targetWaypointName?: string;
  targetDistanceMeters?: number;
  currentWaypointIndex?: number;
  totalWaypoints?: number;
  completedWaypointKeys?: string[];
  isFinished?: boolean;
}

interface VendorRoutePanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeWaypoints: RouteWaypoint[];
  onWaypointsChange: (waypoints: RouteWaypoint[]) => void;
  onRouteCalculated: (result: RouteCalculationResult | null) => void;
  currentCalculation: RouteCalculationResult | null;
  mapCenter: [number, number];
  userLocation: { lat: number; lng: number } | null;
  onSelectStartPoint: () => void;
  onTrackingLocationChange?: (location: TrackingLocationUpdate | null) => void;
  onSelectWaypoint: () => void;
  /** Spot Jitu: callback untuk memilih area di peta */
  onSelectAnalysisArea?: () => void;
  /** Spot Jitu: callback saat titik pusat area diubah */
  onAnalysisAreaCenterChange?: (center: { lat: number; lng: number } | null) => void;
  /** Spot Jitu: koordinat area yang dipilih dari peta */
  analysisAreaCenter?: { lat: number; lng: number } | null;
  /** Spot Jitu: radius analisis dalam meter */
  spotJituRadius?: number;
  /** Spot Jitu: callback saat radius analisis berubah */
  onSpotJituRadiusChange?: (radius: number) => void;
  /** Spot Jitu: hasil rekomendasi rute area lengkap dari AI */
  aiAreaResponse?: AiAreaRouteResponse | null;
  /** Spot Jitu: callback saat hasil rekomendasi rute area berubah */
  onAiAreaResponseChange?: (res: AiAreaRouteResponse | null) => void;
  /** Spot Jitu: ID titik yang sedang disorot/diinspeksi */
  highlightedStopId?: string | number | null;
  /** Spot Jitu: callback untuk menyorot titik tertentu */
  onHighlightStopId?: (id: string | number | null) => void;
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
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

export function getWaypointKey(wp: RouteWaypoint, index: number): string {
  if ((wp as any).id != null) return String((wp as any).id);
  return `${wp.lat.toFixed(6)},${wp.lng.toFixed(6)},${index}`;
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

export const VendorRoutePanel: React.FC<VendorRoutePanelProps> = ({
  isOpen,
  onClose,
  activeWaypoints,
  onWaypointsChange,
  onRouteCalculated,
  currentCalculation,
  mapCenter,
  userLocation,
  onSelectStartPoint,
  onTrackingLocationChange,
  onSelectWaypoint,
  onSelectAnalysisArea,
  onAnalysisAreaCenterChange,
  analysisAreaCenter,
  spotJituRadius: propSpotJituRadius,
  onSpotJituRadiusChange,
  aiAreaResponse: propAiAreaResponse,
  onAiAreaResponseChange,
  highlightedStopId: propHighlightedStopId,
  onHighlightStopId,
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<
    "planner" | "saved" | "recommendations"
  >("planner");
  const [routeName, setRouteName] = useState("Rute Keliling Harian");
  const [routeNotes, setRouteNotes] = useState("");
  const [routeStatus] = useState<"active" | "planned">("active");
  const [isShared, setIsShared] = useState(false);
  const [isRoundtrip, setIsRoundtrip] = useState(false);
  const [businesses, setBusinesses] = useState<UserBusinessOption[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>("");
  const [loadingBusinesses, setLoadingBusinesses] = useState(false);

  // Loading states
  const [isCalculating, setIsCalculating] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const isLocatingRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedRoutes, setSavedRoutes] = useState<SavedRouteItem[]>([]);
  const [savedRoutesSearch, setSavedRoutesSearch] = useState("");
  const [savedRoutesPage, setSavedRoutesPage] = useState(1);
  const [savedRoutesTotalPages, setSavedRoutesTotalPages] = useState(1);
  const [savedRoutesTotal, setSavedRoutesTotal] = useState(0);
  const debouncedSavedRoutesSearch = useDebounce(savedRoutesSearch, 400);

  // Mobile Bottom Sheet Snap State (diangkat ke atas / ke bawah pada handphone)
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 768;
    }
    return false;
  });
  const [windowHeight, setWindowHeight] = useState<number>(() => {
    if (typeof window !== "undefined") {
      return window.innerHeight;
    }
    return 800;
  });
  const [sheetSnap, setSheetSnap] = useState<"collapsed" | "half" | "expanded">("half");
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setWindowHeight(window.innerHeight);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getMobileSnapHeight = (
    snap: "collapsed" | "half" | "expanded",
    h: number,
  ) => {
    if (snap === "collapsed") return 140;
    if (snap === "half") return Math.round(h * 0.55);
    return Math.round(h * 0.88);
  };

  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (typeof window === "undefined" || window.innerWidth >= 768) return;
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("input") ||
      target.closest("select") ||
      target.closest("a")
    ) {
      return;
    }

    isDraggingRef.current = true;
    setIsDragging(true);
    startYRef.current = e.clientY;
    const currentH = dragHeight ?? getMobileSnapHeight(sheetSnap, windowHeight);
    startHeightRef.current = currentH;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const deltaY = startYRef.current - e.clientY; // drag UP is positive
    const minH = 120;
    const maxH = Math.round(windowHeight * 0.90);
    const nextH = Math.max(minH, Math.min(maxH, startHeightRef.current + deltaY));
    setDragHeight(nextH);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}

    const finalH = dragHeight ?? startHeightRef.current;
    const delta = finalH - startHeightRef.current;

    const collapsedH = 140;
    const halfH = Math.round(windowHeight * 0.55);
    const expandedH = Math.round(windowHeight * 0.88);

    if (delta > 35) {
      if (startHeightRef.current <= collapsedH + 30) {
        setSheetSnap("half");
      } else {
        setSheetSnap("expanded");
      }
    } else if (delta < -35) {
      if (startHeightRef.current >= expandedH - 30) {
        setSheetSnap("half");
      } else {
        setSheetSnap("collapsed");
      }
    } else {
      const dCollapsed = Math.abs(finalH - collapsedH);
      const dHalf = Math.abs(finalH - halfH);
      const dExpanded = Math.abs(finalH - expandedH);
      const min = Math.min(dCollapsed, dHalf, dExpanded);
      if (min === dCollapsed) setSheetSnap("collapsed");
      else if (min === dHalf) setSheetSnap("half");
      else setSheetSnap("expanded");
    }

    setDragHeight(null);
  };

  const handleToggleSnap = () => {
    setSheetSnap((prev) => {
      if (prev === "collapsed") return "half";
      if (prev === "half") return "expanded";
      return "collapsed";
    });
  };
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [showRouteSettings, setShowRouteSettings] = useState(false);

  const [isLoggedIn] = useState(() => Boolean(localStorage.getItem("token")));

  // Sequential Navigation State
  const [trackingRouteId, setTrackingRouteId] = useState<string | null>(null);
  const [isRouteStarted, setIsRouteStarted] = useState(false);
  const [isNavigationFinished, setIsNavigationFinished] = useState(false);
  const [activeWaypointIndex, setActiveWaypointIndex] = useState(0);
  const [currentWaypointKey, setCurrentWaypointKey] = useState<string | null>(null);
  const [completedWaypointKeys, setCompletedWaypointKeys] = useState<string[]>([]);
  const [gpsAccuracyLevel, setGpsAccuracyLevel] = useState<"good" | "medium" | "poor">("good");
  const [targetDistanceMeters, setTargetDistanceMeters] = useState<number | null>(null);

  const trackingWatchId = useRef<number | null>(null);
  const targetsRef = useRef<RouteWaypoint[]>([]);
  const targetKeysRef = useRef<string[]>([]);
  const activeWaypointIndexRef = useRef(0);
  const currentCalcRef = useRef<RouteCalculationResult | null>(currentCalculation);
  const prevLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastTrimmedIndexRef = useRef<number>(0);
  const userLocationRef = useRef(userLocation);
  const fullRouteCoordinatesRef = useRef<[number, number][]>([]);
  const lastReliableHeadingRef = useRef<number | null>(null);
  const lastSignificantPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const consecutiveArrivalReadingsRef = useRef<number>(0);
  const offRouteReadingsRef = useRef<number>(0);
  const completedWaypointKeysRef = useRef<string[]>([]);
  const lastBroadcastHeadingRef = useRef<number | null>(null);

  useEffect(() => {
    currentCalcRef.current = currentCalculation;
  }, [currentCalculation]);

  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

  useEffect(() => {
    completedWaypointKeysRef.current = completedWaypointKeys;
  }, [completedWaypointKeys]);

  const stopTracking = useCallback(() => {
    if (trackingWatchId.current !== null) {
      navigator.geolocation.clearWatch(trackingWatchId.current);
      trackingWatchId.current = null;
    }

    setTrackingRouteId(null);
    setIsRouteStarted(false);
    setIsNavigationFinished(false);
    setActiveWaypointIndex(0);
    activeWaypointIndexRef.current = 0;
    setCurrentWaypointKey(null);
    setCompletedWaypointKeys([]);
    completedWaypointKeysRef.current = [];
    targetsRef.current = [];
    targetKeysRef.current = [];
    prevLocationRef.current = null;
    lastTrimmedIndexRef.current = 0;
    consecutiveArrivalReadingsRef.current = 0;
    offRouteReadingsRef.current = 0;
    fullRouteCoordinatesRef.current = [];
    lastReliableHeadingRef.current = null;
    lastSignificantPositionRef.current = null;
    lastBroadcastHeadingRef.current = null;
    setTargetDistanceMeters(null);
    onTrackingLocationChange?.(null);
  }, [onTrackingLocationChange]);

  const startNavigationSession = (
    waypointsToNavigate: RouteWaypoint[],
    routeId: string | null = null,
  ) => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      toast({
        title: "GPS Tidak Didukung",
        description: "Browser ini tidak mendukung pelacakan lokasi.",
        variant: "error",
      });
      return;
    }

    if (waypointsToNavigate.length === 0) {
      toast({
        title: "Titik Belum Cukup",
        description: "Tambahkan titik tujuan sebelum memulai navigasi.",
        variant: "error",
      });
      return;
    }

    // Clear any previous watcher
    if (trackingWatchId.current !== null) {
      navigator.geolocation.clearWatch(trackingWatchId.current);
      trackingWatchId.current = null;
    }

    // Reset session states
    setIsNavigationFinished(false);
    setTrackingRouteId(routeId);
    setIsRouteStarted(true);
    lastTrimmedIndexRef.current = 0;
    consecutiveArrivalReadingsRef.current = 0;
    offRouteReadingsRef.current = 0;
    prevLocationRef.current = null;
    lastReliableHeadingRef.current = null;
    lastSignificantPositionRef.current = null;

    // Build target queue with their keys
    const currentUserLat = userLocationRef.current?.lat;
    const currentUserLng = userLocationRef.current?.lng;
    const firstWp = waypointsToNavigate[0];

    const isStartingAtFirst =
      firstWp?.name?.toLowerCase().includes("lokasi saya") ||
      (currentUserLat != null &&
        currentUserLng != null &&
        haversineDistance(currentUserLat, currentUserLng, firstWp.lat, firstWp.lng) < 40);

    let initialCompleted: string[] = [];
    let targets: { wp: RouteWaypoint; key: string }[] = [];

    if (isStartingAtFirst && waypointsToNavigate.length > 1) {
      const firstKey = getWaypointKey(firstWp, 0);
      initialCompleted = [firstKey];
      targets = waypointsToNavigate.slice(1).map((wp, idx) => ({
        wp,
        key: getWaypointKey(wp, idx + 1),
      }));
    } else {
      targets = waypointsToNavigate.map((wp, idx) => ({
        wp,
        key: getWaypointKey(wp, idx),
      }));
    }

    if (targets.length === 0) {
      targets = [
        {
          wp: waypointsToNavigate[waypointsToNavigate.length - 1],
          key: getWaypointKey(
            waypointsToNavigate[waypointsToNavigate.length - 1],
            waypointsToNavigate.length - 1,
          ),
        },
      ];
    }

    setCompletedWaypointKeys(initialCompleted);
    completedWaypointKeysRef.current = initialCompleted;
    targetsRef.current = targets.map((t) => t.wp);
    targetKeysRef.current = targets.map((t) => t.key);

    setActiveWaypointIndex(0);
    activeWaypointIndexRef.current = 0;
    setCurrentWaypointKey(targets[0].key);

    // Initial GPS acquisition to begin route along road
    const launchWatcher = (startLat: number, startLng: number) => {
      const routePoints: RouteWaypoint[] = [
        { lat: startLat, lng: startLng, name: "Posisi Pengguna" },
        ...targets.map((t) => t.wp),
      ];

      calculateRoute(routePoints)
        .then((result) => {
          fullRouteCoordinatesRef.current = result.coordinates;
          lastTrimmedIndexRef.current = 0;
          onRouteCalculated(result);
        })
        .catch((err) => {
          console.warn("Calculating route from GPS location failed:", err);
        });

      // Start watching live position
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const currentPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };

          // 1. Accuracy assessment
          const accuracy = currentPos.accuracy ?? 30;
          if (accuracy <= 15) setGpsAccuracyLevel("good");
          else if (accuracy <= 35) setGpsAccuracyLevel("medium");
          else setGpsAccuracyLevel("poor");

          const isAccuracyAcceptable = accuracy <= 75;

          // 2. Stationary / Jitter detection
          let isStationary = false;
          if (prevLocationRef.current) {
            const movedDist = haversineDistance(
              prevLocationRef.current.lat,
              prevLocationRef.current.lng,
              currentPos.lat,
              currentPos.lng,
            );
            // Stationary threshold scales with GPS accuracy: at 10m accuracy
            // we trust 2m deltas; at 30m accuracy we need 5m+ to consider real movement.
            const stationaryThreshold = Math.max(1.5, Math.min(accuracy * 0.15, 5));
            if (movedDist < stationaryThreshold) {
              isStationary = true;
            }
          }

          // 3. Reliable Heading Calculation
          let heading: number | null = null;
          if (
            typeof position.coords.heading === "number" &&
            !isNaN(position.coords.heading) &&
            position.coords.heading >= 0 &&
            (position.coords.speed == null || position.coords.speed > 0.3)
          ) {
            heading = position.coords.heading;
            lastReliableHeadingRef.current = heading;
          } else if (!isStationary && lastSignificantPositionRef.current) {
            const moveDelta = haversineDistance(
              lastSignificantPositionRef.current.lat,
              lastSignificantPositionRef.current.lng,
              currentPos.lat,
              currentPos.lng,
            );
            if (moveDelta >= 1.5) {
              heading = calculateBearing(
                lastSignificantPositionRef.current.lat,
                lastSignificantPositionRef.current.lng,
                currentPos.lat,
                currentPos.lng,
              );
              lastSignificantPositionRef.current = currentPos;
              lastReliableHeadingRef.current = heading;
            } else {
              heading = lastReliableHeadingRef.current;
            }
          } else {
            if (!lastSignificantPositionRef.current) {
              lastSignificantPositionRef.current = currentPos;
            }
            heading = lastReliableHeadingRef.current;
          }

          if (!isStationary) {
            prevLocationRef.current = currentPos;
          }

          // 3b. Immediately broadcast heading-only update for arrow responsiveness
          // This fires BEFORE the expensive arrival/trimming logic so the arrow
          // rotates in the same animation frame as the GPS callback, without waiting
          // for OSRM recalculation or setState batching in heavier paths.
          if (heading !== lastBroadcastHeadingRef.current) {
            lastBroadcastHeadingRef.current = heading;
            onTrackingLocationChange?.({
              lat: currentPos.lat,
              lng: currentPos.lng,
              accuracy: currentPos.accuracy,
              heading,
              speed: position.coords.speed,
              currentWaypointIndex: activeWaypointIndexRef.current,
              totalWaypoints: targets.length,
              completedWaypointKeys: completedWaypointKeysRef.current,
              isFinished: false,
            });
          }

          // 4. Target Waypoint Arrival & Sequential Progression
          const currentTargetIndex = activeWaypointIndexRef.current;
          const currentTarget = targets[currentTargetIndex];

          let distToTarget = 0;
          if (currentTarget) {
            distToTarget = haversineDistance(
              currentPos.lat,
              currentPos.lng,
              currentTarget.wp.lat,
              currentTarget.wp.lng,
            );
            setTargetDistanceMeters(Math.round(distToTarget));

            const arrivalThreshold = Math.max(25, Math.min(accuracy, 45));

            if (distToTarget <= arrivalThreshold && isAccuracyAcceptable) {
              consecutiveArrivalReadingsRef.current += 1;
            } else {
              consecutiveArrivalReadingsRef.current = 0;
            }

            const hasArrived =
              isAccuracyAcceptable && (distToTarget <= 15 || consecutiveArrivalReadingsRef.current >= 2);

            if (hasArrived) {
              consecutiveArrivalReadingsRef.current = 0;
              const reachedKey = currentTarget.key;

              if (!completedWaypointKeysRef.current.includes(reachedKey)) {
                const nextCompleted = [
                  ...completedWaypointKeysRef.current,
                  reachedKey,
                ];
                completedWaypointKeysRef.current = nextCompleted;
                setCompletedWaypointKeys(nextCompleted);
              }

              const isFinal = currentTargetIndex >= targets.length - 1;

              if (isFinal) {
                toast({
                  title: "Tujuan Akhir Tercapai!",
                  description: `Anda telah tiba di ${currentTarget.wp.name || "titik tujuan"}. Navigasi selesai.`,
                  variant: "success",
                });

                setIsNavigationFinished(true);
                setCurrentWaypointKey(null);
                fullRouteCoordinatesRef.current = [];
                lastTrimmedIndexRef.current = 0;
                setTargetDistanceMeters(0);

                onRouteCalculated({
                  coordinates: [],
                  distanceKm: 0,
                  durationMinutes: 0,
                });

                if (trackingWatchId.current !== null) {
                  navigator.geolocation.clearWatch(trackingWatchId.current);
                  trackingWatchId.current = null;
                }

                onTrackingLocationChange?.({
                  lat: currentPos.lat,
                  lng: currentPos.lng,
                  accuracy: currentPos.accuracy,
                  heading,
                  currentWaypointIndex: targets.length,
                  totalWaypoints: targets.length,
                  completedWaypointKeys: completedWaypointKeysRef.current,
                  isFinished: true,
                });

                return;
              } else {
                toast({
                  title: "Titik Singgah Tercapai!",
                  description: `Tiba di ${currentTarget.wp.name || `Titik ${currentTargetIndex + 1}`}. Melanjutkan ke titik berikutnya...`,
                  variant: "success",
                });

                const nextIndex = currentTargetIndex + 1;
                activeWaypointIndexRef.current = nextIndex;
                setActiveWaypointIndex(nextIndex);
                setCurrentWaypointKey(targets[nextIndex].key);

                const remainingTargets = targets.slice(nextIndex).map((t) => t.wp);
                calculateRoute([
                  {
                    lat: currentPos.lat,
                    lng: currentPos.lng,
                    name: "Posisi Pengguna",
                  },
                  ...remainingTargets,
                ])
                  .then((res) => {
                    fullRouteCoordinatesRef.current = res.coordinates;
                    lastTrimmedIndexRef.current = 0;
                    onRouteCalculated(res);
                  })
                  .catch((err) => {
                    console.warn("Recalculating remaining route failed:", err);
                  });
              }
            }
          }

          // 5. Progressive Route Trimming Along Road Geometry
          const fullCoords = fullRouteCoordinatesRef.current;
          if (fullCoords.length > 3 && isAccuracyAcceptable) {
            let closestIdx = -1;
            let minD = Infinity;

            const searchStart = lastTrimmedIndexRef.current;
            const searchEnd = Math.min(fullCoords.length, searchStart + 40);

            for (let i = searchStart; i < searchEnd; i++) {
              const [cLat, cLng] = fullCoords[i];
              const d = haversineDistance(
                currentPos.lat,
                currentPos.lng,
                cLat,
                cLng,
              );
              if (d < minD) {
                minD = d;
                closestIdx = i;
              }
            }

            if (closestIdx > lastTrimmedIndexRef.current && minD <= 40) {
              lastTrimmedIndexRef.current = closestIdx;
              offRouteReadingsRef.current = 0;

              const remainingCoords: [number, number][] = [
                [currentPos.lat, currentPos.lng],
                ...fullCoords.slice(closestIdx + 1),
              ];

              const calc = currentCalcRef.current;
              onRouteCalculated({
                coordinates: remainingCoords,
                distanceKm: calc?.distanceKm ?? 0,
                durationMinutes: calc?.durationMinutes ?? 0,
              });
            } else if (minD > 75) {
              offRouteReadingsRef.current += 1;
              if (offRouteReadingsRef.current >= 3) {
                offRouteReadingsRef.current = 0;
                const remainingWps = targets
                  .slice(activeWaypointIndexRef.current)
                  .map((t) => t.wp);

                calculateRoute([
                  {
                    lat: currentPos.lat,
                    lng: currentPos.lng,
                    name: "Posisi Pengguna",
                  },
                  ...remainingWps,
                ])
                  .then((res) => {
                    fullRouteCoordinatesRef.current = res.coordinates;
                    lastTrimmedIndexRef.current = 0;
                    onRouteCalculated(res);
                    toast({
                      title: "Menyesuaikan Rute",
                      description: "Rute otomatis diperbarui mengikuti posisi Anda.",
                      variant: "info",
                    });
                  })
                  .catch(() => { });
              }
            }
          }

          // 6. Broadcast tracking location update
          onTrackingLocationChange?.({
            lat: currentPos.lat,
            lng: currentPos.lng,
            accuracy: currentPos.accuracy,
            heading,
            speed: position.coords.speed,
            targetWaypointName: currentTarget?.wp.name,
            targetDistanceMeters: Math.round(distToTarget),
            currentWaypointIndex: currentTargetIndex,
            totalWaypoints: targets.length,
            completedWaypointKeys: completedWaypointKeysRef.current,
            isFinished: false,
          });
        },
        (error) => {
          const message =
            error.code === error.PERMISSION_DENIED
              ? "Izinkan akses lokasi pada browser untuk memulai navigasi."
              : error.code === error.TIMEOUT
                ? "Waktu pengambilan lokasi habis. Memeriksa kembali sinyal GPS..."
                : error.code === error.POSITION_UNAVAILABLE
                  ? "Sinyal GPS atau layanan lokasi tidak tersedia."
                  : "Lokasi GPS tidak tersedia.";

          toast({
            title: "Peringatan GPS",
            description: message,
            variant: "error",
          });

          if (error.code === error.PERMISSION_DENIED) {
            stopTracking();
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 20000,
        },
      );

      trackingWatchId.current = watchId;
    };

    if (userLocationRef.current) {
      launchWatcher(userLocationRef.current.lat, userLocationRef.current.lng);
    } else {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          launchWatcher(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          launchWatcher(waypointsToNavigate[0].lat, waypointsToNavigate[0].lng);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 2000 },
      );
    }
  };

  const handleStartPlannerTracking = () => {
    if (isRouteStarted) {
      stopTracking();
      toast({
        title: "Navigasi Dihentikan",
        description: "Pelacakan rute telah diakhiri.",
      });
      return;
    }
    startNavigationSession(activeWaypoints, null);
  };

  const handleStartTracking = (route: SavedRouteItem) => {
    if (route.status !== "active") return;
    if (Array.isArray(route.waypoints) && route.waypoints.length > 0) {
      onWaypointsChange(route.waypoints);
      setRouteName(route.name);
      setIsShared(route.is_shared);
      startNavigationSession(route.waypoints, route.id);
    }
  };

  // Recommendations state
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  // AI Route Assistant state ("Spot Jitu" AI route planner)
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiRecommendation, setAiRecommendation] =
    useState<AiRouteRecommendation | null>(null);
  const aiAbortControllerRef = useRef<AbortController | null>(null);

  // Spot Jitu: Area-based AI analysis state
  const [localSpotJituRadius, setLocalSpotJituRadius] = useState<number>(2000);
  const spotJituRadius = propSpotJituRadius ?? localSpotJituRadius;
  const setSpotJituRadius = useCallback((r: number) => {
    setLocalSpotJituRadius(r);
    onSpotJituRadiusChange?.(r);
  }, [onSpotJituRadiusChange]);
  const [spotJituNearbyBusinesses, setSpotJituNearbyBusinesses] = useState<AiRouteCandidate[]>([]);
  const [spotJituLoadingNearby, setSpotJituLoadingNearby] = useState(false);
  const [spotJituStreamText, setSpotJituStreamText] = useState<string>("");
  const [spotJituStreaming, setSpotJituStreaming] = useState(false);
  const spotJituStreamRef = useRef<AbortController | null>(null);

  // Spot Jitu: Area-based Complete AI Route state
  const [localAiAreaResponse, setLocalAiAreaResponse] = useState<AiAreaRouteResponse | null>(null);
  const currentAreaResponse = propAiAreaResponse !== undefined ? propAiAreaResponse : localAiAreaResponse;
  const setAreaResponse = useCallback((res: AiAreaRouteResponse | null) => {
    setLocalAiAreaResponse(res);
    onAiAreaResponseChange?.(res);
  }, [onAiAreaResponseChange]);

  const [localHighlightedStopId, setLocalHighlightedStopId] = useState<string | number | null>(null);
  const currentHighlightedStopId = propHighlightedStopId !== undefined ? propHighlightedStopId : localHighlightedStopId;
  const setHighlightedStop = useCallback((id: string | number | null) => {
    setLocalHighlightedStopId(id);
    onHighlightStopId?.(id);
  }, [onHighlightStopId]);

  const [isAiPlanning, setIsAiPlanning] = useState(false);
  const [aiPlanStage, setAiPlanStage] = useState<"idle" | "fetching_osm" | "analyzing_ai" | "calculating_route">("idle");
  const [showAnalysisFactors, setShowAnalysisFactors] = useState(true);
  const [customPromptNotes, setCustomPromptNotes] = useState("");

  // Cleanup AI request on unmount
  useEffect(() => {
    return () => {
      aiAbortControllerRef.current?.abort();
      spotJituStreamRef.current?.abort();
    };
  }, []);

  const [selectedStart, setSelectedStart] = useState<{
    lat: number;
    lng: number;
    name: string;
    displayName: string;
  } | null>(null);

  const [selectedEnd, setSelectedEnd] = useState<{
    lat: number;
    lng: number;
    name: string;
    displayName: string;
  } | null>(null);

  const handleSelectRouteStart = (
    lat: number,
    lng: number,
    name: string,
    displayName: string,
  ) => {
    const start = { lat, lng, name, displayName };
    setSelectedStart(start);
    if (trackingWatchId.current !== null) {
      stopTracking();
    } else {
      setIsRouteStarted(false);
    }

    const stops = activeWaypoints.slice(1);
    const end = selectedEnd;

    onWaypointsChange([
      { lat, lng, name, stop_duration: 0 },
      ...(end
        ? [
          ...stops.filter((wp) => wp.lat !== end.lat || wp.lng !== end.lng),
          {
            lat: end.lat,
            lng: end.lng,
            name: end.name,
            stop_duration: 0,
          },
        ]
        : stops),
    ]);

    onRouteCalculated(null);
  };

  const handleSelectRouteEnd = (
    lat: number,
    lng: number,
    name: string,
    displayName: string,
  ) => {
    const end = { lat, lng, name, displayName };
    setSelectedEnd(end);
    if (trackingWatchId.current !== null) {
      stopTracking();
    } else {
      setIsRouteStarted(false);
    }

    const start = selectedStart;
    if (!start && activeWaypoints.length === 0) {
      toast({
        title: "Select a Starting Point",
        description:
          "Choose a starting point before selecting the destination.",
        variant: "error",
      });
      return;
    }

    const startPoint = start
      ? {
        lat: start.lat,
        lng: start.lng,
        name: start.name,
        stop_duration: 0,
      }
      : activeWaypoints[0];

    const middleStops = activeWaypoints.slice(1, selectedEnd ? -1 : undefined);

    onWaypointsChange([
      startPoint,
      ...middleStops,
      { lat, lng, name, stop_duration: 0 },
    ]);

    onRouteCalculated(null);
  };

  useEffect(() => {
    if (!isLoggedIn) {
      onWaypointsChange([]);
      onRouteCalculated(null);
    }
  }, [isLoggedIn, onWaypointsChange, onRouteCalculated]);

  const handleUseCurrentLocation = () => {
    // Collapse to peek height on mobile when using current location
    if (window.innerWidth < 768) {
      setSheetSnap("collapsed");
    }
    if (isLocatingRef.current) return;

    if (!navigator.geolocation) {
      toast({
        title: "GPS Tidak Didukung",
        description: "Browser Anda tidak mendukung fitur lokasi.",
        variant: "error",
      });
      return;
    }

    isLocatingRef.current = true;
    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;

        const start = {
          lat,
          lng,
          name: "Lokasi Saya (Titik Awal)",
          stop_duration: 0,
        };

        // Pertahankan titik singgah yang sudah ada.
        const stops = activeWaypoints.slice(1);
        const end = selectedEnd;

        const updatedStops = end
          ? [
            ...stops.filter(
              (wp) => wp.lat !== end.lat || wp.lng !== end.lng,
            ),
            {
              lat: end.lat,
              lng: end.lng,
              name: end.name,
              stop_duration: 0,
            },
          ]
          : stops;

        if (trackingWatchId.current !== null) {
          stopTracking();
        } else {
          setIsRouteStarted(false);
        }

        setSelectedStart({
          lat,
          lng,
          name: start.name,
          displayName: start.name,
        });

        onWaypointsChange([start, ...updatedStops]);
        onRouteCalculated(null);

        toast({
          title: "Lokasi Berhasil Didapatkan",
          description: "Lokasi Anda ditetapkan sebagai titik awal rute.",
          variant: "success",
        });

        isLocatingRef.current = false;
        setIsLocating(false);
      },
      (error) => {
        let description = "Gagal mendapatkan lokasi Anda.";

        if (error.code === error.PERMISSION_DENIED) {
          description = "Izinkan akses lokasi melalui pengaturan browser.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          description = "Informasi lokasi tidak tersedia.";
        } else if (error.code === error.TIMEOUT) {
          description = "Permintaan lokasi terlalu lama. Coba lagi.";
        }

        toast({
          title: "Gagal Mendapatkan Lokasi",
          description,
          variant: "error",
        });

        isLocatingRef.current = false;
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 20000,
      },
    );
  };

  const fetchSavedRoutes = useCallback(async (page = 1, search = "") => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setLoadingSaved(true);
    try {
      const res = await api.get("/vendor-routes", {
        params: {
          page,
          per_page: 8,
          search: search.trim() || undefined,
        },
      });
      if (res.data?.success && res.data?.data?.data) {
        setSavedRoutes(res.data.data.data);
        if (res.data.data.meta) {
          setSavedRoutesTotalPages(res.data.data.meta.last_page || 1);
          setSavedRoutesTotal(res.data.data.meta.total || 0);
        }
      } else if (res.data?.success && Array.isArray(res.data?.data)) {
        setSavedRoutes(res.data.data);
      }
    } catch (err) {
      console.warn("Gagal mengambil rute tersimpan:", err);
    } finally {
      setLoadingSaved(false);
    }
  }, []);

  const fetchBusinesses = useCallback(async () => {
    setLoadingBusinesses(true);

    try {
      const res = await api.get("/businesses/user");

      const data = res.data?.data;
      const items = Array.isArray(data)
        ? data
        : Array.isArray(data?.Data)
          ? data.Data
          : Array.isArray(data?.data)
            ? data.data
            : [];

      setBusinesses(items);
    } catch (error) {
      console.error("Gagal mengambil bisnis pengguna:", error);
      setBusinesses([]);
    } finally {
      setLoadingBusinesses(false);
    }
  }, []);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  const fetchRecommendations = useCallback(async () => {
    setLoadingRecs(true);
    try {
      const targetLat = activeWaypoints[0]?.lat || mapCenter[0];
      const targetLng = activeWaypoints[0]?.lng || mapCenter[1];
      const res = await api.get("/vendor-routes/recommendations", {
        params: { lat: targetLat, lng: targetLng, radius: 4000 },
      });
      if (res.data?.success && res.data?.data?.recommendations) {
        setRecommendations(res.data.data.recommendations);
      }
    } catch (err) {
      console.warn("Gagal mengambil rekomendasi jualan:", err);
    } finally {
      setLoadingRecs(false);
    }
  }, [activeWaypoints, mapCenter]);

  useEffect(() => {
    if (activeTab === "saved") {
      fetchSavedRoutes(savedRoutesPage, debouncedSavedRoutesSearch);
    } else if (activeTab === "recommendations") {
      fetchRecommendations();
    }
  }, [activeTab, savedRoutesPage, debouncedSavedRoutesSearch, fetchSavedRoutes, fetchRecommendations]);

  const [showAddStopNotice, setShowAddStopNotice] = useState(false);

  const handleAddStop = () => {
    if (activeWaypoints.length === 0) {
      toast({
        title: "Tentukan Titik Awal",
        description: "Pilih titik awal terlebih dahulu.",
        variant: "error",
      });
      return;
    }

    if (activeWaypoints.length >= 8) {
      toast({
        title: "Batas Titik",
        description: "Maksimal 8 titik dalam satu rute.",
        variant: "error",
      });
      return;
    }

    setShowAddStopNotice(true);
    onSelectWaypoint();
  };

  const handleRemoveStop = (index: number) => {
    if (trackingWatchId.current !== null) {
      stopTracking();
    }
    const updated = activeWaypoints.filter((_, i) => i !== index);

    onWaypointsChange(updated);
    onRouteCalculated(null);
  };

  const handleMoveStop = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= activeWaypoints.length) return;

    if (trackingWatchId.current !== null) {
      stopTracking();
    }
    const copy = [...activeWaypoints];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;

    onWaypointsChange(copy);
    onRouteCalculated(null);
  };

  const handleUpdateStop = (index: number, fields: Partial<RouteWaypoint>) => {
    const copy = [...activeWaypoints];
    copy[index] = { ...copy[index], ...fields };
    onWaypointsChange(copy);
  };

  const handleCalculateRoute = async () => {
    if (activeWaypoints.length < 2) {
      toast({
        title: "Titik Belum Cukup",
        description: "Tambahkan minimal 1 titik tujuan atau titik singgah.",
        variant: "error",
      });
      return;
    }

    if (trackingWatchId.current !== null) {
      stopTracking();
    }

    setIsCalculating(true);
    try {
      const calculationPoints = isRoundtrip
        ? [...activeWaypoints, activeWaypoints[0]]
        : activeWaypoints;

      const result = await calculateRoute(calculationPoints);
      onRouteCalculated(result);

      toast({
        title: "Rute Berhasil Dihitung",
        description: `Jarak: ${result.distanceKm} km · Est. waktu: ${result.durationMinutes} menit`,
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: "Gagal Menghitung Rute",
        description:
          err.message || "Pastikan titik berada di jaringan jalan yang valid.",
        variant: "error",
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSaveRoute = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast({
        title: "Masuk Akun Dibutuhkan",
        description: "Silakan masuk untuk menyimpan rute ke database.",
        variant: "error",
      });
      return;
    }

    if (activeWaypoints.length < 2) {
      toast({
        title: "Perhatian",
        description: "Tambahkan titik tujuan sebelum menyimpan.",
        variant: "error",
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        business_id: selectedBusinessId || null,
        name: routeName.trim() || "Rute Usaha Keliling",
        start_location_name: activeWaypoints[0].name || "Titik Awal",
        end_location_name:
          activeWaypoints[activeWaypoints.length - 1].name || "Titik Akhir",
        waypoints: activeWaypoints,
        route_coordinates: currentCalculation?.coordinates ?? [],
        distance: currentCalculation?.distanceKm ?? 0,
        estimated_duration: currentCalculation?.durationMinutes ?? 0,
        status: routeStatus,
        is_shared: isShared,
        notes: routeNotes.trim() || null,
      };

      const res = await api.post("/vendor-routes", payload);
      if (res.data?.success) {
        toast({
          title: "Rute Tersimpan",
          description: "Rencana rute berhasil disimpan ke database LOCIVA.",
          variant: "success",
        });
        fetchSavedRoutes();
      }
    } catch (err: any) {
      toast({
        title: "Gagal Menyimpan Rute",
        description:
          err.response?.data?.message ||
          "Terjadi kesalahan saat menyimpan rute.",
        variant: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddRecommendationToRoute = (rec: any) => {
    if (activeWaypoints.length === 0) {
      toast({
        title: "Tentukan Titik Awal",
        description:
          "Pilih titik awal melalui peta atau lokasi Anda saat ini sebelum menambahkan rekomendasi.",
        variant: "error",
      });
      return;
    }
    if (activeWaypoints.length >= 8) {
      toast({
        title: "Batas Titik",
        description: "Maksimal 8 titik singgah dalam satu rute.",
        variant: "error",
      });
      return;
    }

    if (trackingWatchId.current !== null) {
      stopTracking();
    }

    const updated = [
      ...activeWaypoints,
      {
        lat: rec.lat,
        lng: rec.lng,
        name: rec.name,
        stop_duration: 60,
      },
    ];

    onWaypointsChange(updated);
    toast({
      title: "Titik Rekomendasi Ditambahkan",
      description: `${rec.name} dimasukkan sebagai titik singgah rute.`,
      variant: "success",
    });
    setActiveTab("planner");
  };

  const handleApplyAiRoute = async () => {
    if (!aiRecommendation || aiRecommendation.waypoints.length < 2) return;

    // Pastikan session tracking nonaktif, jangan memulai tracking otomatis (persyaratan #8)
    if (trackingWatchId.current !== null) {
      stopTracking();
    } else {
      setIsRouteStarted(false);
    }

    const newWaypoints = aiRecommendation.waypoints;
    onWaypointsChange(newWaypoints);
    setRouteName(aiRecommendation.routeName);
    setActiveTab("planner");

    toast({
      title: "Menerapkan Rute AI...",
      description: "Menghitung jaringan jalan nyata dengan OSRM...",
    });

    try {
      const calcResult = await calculateRoute(newWaypoints);
      onRouteCalculated(calcResult);
      toast({
        title: "Rute Rekomendasi AI Diterapkan",
        description: `${newWaypoints.length} titik (${calcResult.distanceKm.toFixed(1)} km) siap dijalankan.`,
        variant: "success",
      });
    } catch (err: any) {
      console.warn("Kalkulasi rute OSRM gagal:", err);
      toast({
        title: "Titik Rute AI Diterapkan",
        description:
          "Titik singgah berhasil diterapkan, namun jalur jalan raya otomatis gagal dihitung.",
        variant: "warning",
      });
    }
  };

  const handleApplyAiAreaRoute = async () => {
    if (!currentAreaResponse) return;

    // Pastikan session tracking nonaktif, jangan memulai tracking otomatis (persyaratan #8)
    if (trackingWatchId.current !== null) {
      stopTracking();
    } else {
      setIsRouteStarted(false);
    }

    const waypoints = convertAiAreaResponseToWaypoints(currentAreaResponse);
    onWaypointsChange(waypoints);
    setRouteName(currentAreaResponse.route_name);
    setActiveTab("planner");

    if (
      currentAreaResponse.route_coordinates &&
      currentAreaResponse.route_coordinates.length > 0
    ) {
      const metrics = currentAreaResponse.route_metrics;
      onRouteCalculated({
        coordinates: currentAreaResponse.route_coordinates,
        distanceKm:
          metrics.distance_km ??
          (metrics.distance_meters ? metrics.distance_meters / 1000 : 0),
        durationMinutes:
          metrics.duration_minutes ??
          (metrics.duration_seconds ? Math.round(metrics.duration_seconds / 60) : 0),
        summary: currentAreaResponse.route_name,
      });
      toast({
        title: "Rute Rekomendasi AI Diterapkan",
        description: `${waypoints.length} titik (${(metrics.distance_km ?? (metrics.distance_meters ? metrics.distance_meters / 1000 : 0)).toFixed(1)} km) aktif di peta.`,
        variant: "success",
      });
    } else {
      try {
        const calcResult = await calculateRoute(waypoints);
        onRouteCalculated(calcResult);
        toast({
          title: "Rute Rekomendasi AI Diterapkan",
          description: `${waypoints.length} titik (${calcResult.distanceKm.toFixed(1)} km) aktif di peta.`,
          variant: "success",
        });
      } catch (err: any) {
        console.warn("Kalkulasi rute OSRM gagal:", err);
      }
    }
  };

  // ── SPOT JITU: Fetch bisnis terdekat berdasarkan area yang dipilih ──
  const fetchNearbyForSpotJitu = useCallback(async (
    center: { lat: number; lng: number },
    radius: number,
  ) => {
    setSpotJituLoadingNearby(true);
    setSpotJituNearbyBusinesses([]);
    setAiError(null);

    const candidates: AiRouteCandidate[] = [];
    const seenIds = new Set<string>();

    try {
      // Ambil rekomendasi POI dari backend
      const recRes = await api.get("/vendor-routes/recommendations", {
        params: { lat: center.lat, lng: center.lng, radius },
      });
      if (recRes.data?.success && Array.isArray(recRes.data.data?.recommendations)) {
        for (const rec of recRes.data.data.recommendations) {
          const key = String(rec.id);
          if (!seenIds.has(key)) {
            seenIds.add(key);
            candidates.push({
              id: rec.id,
              name: rec.name,
              category: rec.category,
              lat: Number(rec.lat),
              lng: Number(rec.lng),
              address: rec.address,
              footfall_score: rec.footfall_score,
            });
          }
        }
      }
    } catch (err) {
      console.warn("Gagal mengambil POI recommendations:", err);
    }

    try {
      // Ambil bisnis terdaftar LOCIVA dalam radius
      const bizRes = await api.get("/businesses/map", {
        params: { lat: center.lat, lng: center.lng, radius },
      });
      const bizData = bizRes.data?.data;
      const bizItems = Array.isArray(bizData) ? bizData : [];
      for (const b of bizItems) {
        const bLat = Number(b.latitude ?? b.lat);
        const bLng = Number(b.longitude ?? b.lng);
        if (!isNaN(bLat) && !isNaN(bLng)) {
          const key = `biz-${b.id}`;
          if (!seenIds.has(key)) {
            seenIds.add(key);
            candidates.push({
              id: key,
              name: b.name,
              category: b.business_type_name || b.category || "usaha",
              lat: bLat,
              lng: bLng,
              address: b.address,
            });
          }
        }
      }
    } catch (err) {
      console.warn("Gagal mengambil bisnis peta:", err);
    }

    // Tambahkan bisnis user jika dalam radius
    if (Array.isArray(businesses)) {
      for (const b of businesses) {
        const bLat = Number(b.latitude ?? b.lat);
        const bLng = Number(b.longitude ?? b.lng);
        if (!isNaN(bLat) && !isNaN(bLng)) {
          const dist = haversineDistance(center.lat, center.lng, bLat, bLng);
          if (dist <= radius) {
            const key = `user-biz-${b.id}`;
            if (!seenIds.has(key)) {
              seenIds.add(key);
              candidates.push({
                id: key,
                name: b.name,
                category: "user_business",
                lat: bLat,
                lng: bLng,
                is_user_business: true,
              });
            }
          }
        }
      }
    }

    setSpotJituNearbyBusinesses(candidates);
    setSpotJituLoadingNearby(false);
    return candidates;
  }, [businesses]);

  // ── SPOT JITU: Jalankan analisis AI streaming ──
  const handleSpotJituAnalysis = async () => {
    const center = analysisAreaCenter;
    if (!center) {
      toast({
        title: "Pilih Area Dulu",
        description: "Klik lokasi di peta untuk menentukan pusat area analisis.",
        variant: "error",
      });
      return;
    }

    // Fetch nearby jika belum ada
    let candidates = spotJituNearbyBusinesses;
    if (candidates.length === 0) {
      candidates = await fetchNearbyForSpotJitu(center, spotJituRadius);
    }

    if (candidates.length < 2) {
      setAiError(
        "Ditemukan kurang dari 2 lokasi terverifikasi di area ini. Coba perbesar radius atau pilih lokasi di kawasan kota.",
      );
      return;
    }

    // Tentukan konteks bisnis (dari bisnis user yang dipilih, jika ada)
    const selectedBiz = businesses.find((b) => String(b.id) === selectedBusinessId);
    const bizContext = selectedBiz
      ? { name: selectedBiz.name, category: "usaha_keliling" }
      : null;

    // Abort previous stream
    spotJituStreamRef.current?.abort();
    const controller = new AbortController();
    spotJituStreamRef.current = controller;

    setSpotJituStreaming(true);
    setSpotJituStreamText("");
    setAiError(null);
    setAiRecommendation(null);

    try {
      const systemMsg = buildAreaAnalysisSystemMessage();
      const userMsg = buildAreaAnalysisPrompt(bizContext, candidates, spotJituRadius);

      const fullText = await streamAiAnalysis(systemMsg, userMsg, {
        signal: controller.signal,
        onToken: (_token, accumulated) => {
          setSpotJituStreamText(accumulated);
        },
        onDone: (text) => {
          setSpotJituStreamText(text);
        },
        onError: (err) => {
          setAiError(err.message);
        },
      });

      // Coba parse rekomendasi rute dari teks yang dihasilkan
      try {
        const recommendation = validateAndMapAiResponse(fullText, candidates);
        setAiRecommendation(recommendation);
      } catch {
        // AI mungkin tidak menghasilkan JSON valid — tidak apa, teks analisis tetap ditampilkan
        console.warn("AI tidak menghasilkan rekomendasi rute JSON yang valid, tapi analisis teks tersedia.");
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      const msg =
        err?.message || "Gagal menghubungi layanan AI. Silakan coba kembali.";
      setAiError(msg);
    } finally {
      setSpotJituStreaming(false);
    }
  };

  // ── SPOT JITU: Jalankan perancangan rute area AI lengkap (Backend + Overpass + OSRM) ──
  const handleStartAiAreaPlan = async () => {
    let center = analysisAreaCenter;
    if (!center && selectedBusinessId) {
      const biz = businesses.find((b) => String(b.id) === selectedBusinessId);
      const bLat = Number(biz?.latitude ?? biz?.lat);
      const bLng = Number(biz?.longitude ?? biz?.lng);
      if (!isNaN(bLat) && !isNaN(bLng)) {
        center = { lat: bLat, lng: bLng };
        onAnalysisAreaCenterChange?.(center);
      }
    }

    if (!center) {
      toast({
        title: "Pilih Area Dulu",
        description: "Klik lokasi di peta atau pilih bisnis yang memiliki titik koordinat sebagai acuan area analisis.",
        variant: "error",
      });
      return;
    }

    setAiError(null);
    setIsAiPlanning(true);
    setAiPlanStage("fetching_osm");

    try {
      // 1. Ambil data tempat sekitar dari OpenStreetMap
      let externalPlaces: any[] = [];
      try {
        externalPlaces = await fetchPlacesAround(center.lat, center.lng, spotJituRadius);
      } catch (osmErr) {
        console.warn("Gagal mengambil data OpenStreetMap, melanjutkan dengan data lokal:", osmErr);
      }

      setAiPlanStage("analyzing_ai");

      const selectedBiz = businesses.find((b) => String(b.id) === selectedBusinessId);

      // 2. Kirim permintaan perancangan rute area lengkap ke backend Laravel
      const response = await requestAreaRoutePlan({
        business_id: selectedBiz ? selectedBiz.id : undefined,
        business_name: selectedBiz?.name,
        center,
        radius_meters: spotJituRadius,
        external_places: externalPlaces,
        prompt: customPromptNotes.trim() || undefined,
      });

      setAiPlanStage("calculating_route");
      setAreaResponse(response);
      toast({
        title: "Rekomendasi Rute Siap",
        description: `AI berhasil merancang ${response.route_name} dengan ${response.recommended_waypoints.length + 2} titik perjalanan.`,
        variant: "success",
      });
    } catch (err: any) {
      const isInsufficient = Boolean(
        err?.response?.data?.errors?.insufficient_data ||
        err?.response?.data?.insufficient_data
      );
      // Axios timeout: err.code === 'ECONNABORTED' or err.message includes 'timeout'
      const isClientTimeout =
        err?.code === "ECONNABORTED" ||
        (typeof err?.message === "string" && err.message.toLowerCase().includes("timeout"));
      // Server-side 504/524 (Cloudflare tunnel or upstream AI slow)
      const isServerTimeout =
        err?.response?.status === 504 ||
        err?.response?.status === 524;

      const errorMsg = isInsufficient
        ? "Data geografis tidak mencukupi di radius ini (< 2 lokasi terverifikasi). Coba perbesar radius atau pilih kawasan perkotaan yang lebih ramai."
        : isClientTimeout
          ? "Koneksi ke server melebihi batas waktu. Server AI mungkin sedang sibuk — coba lagi dalam beberapa saat, atau kurangi radius analisis agar data lebih sedikit."
          : isServerTimeout
            ? (err?.response?.data?.message ||
               "Server AI terlalu lama merespons (timeout 504/524). Coba kurangi radius analisis atau coba kembali dalam beberapa menit.")
            : err?.response?.data?.message ||
              err?.message ||
              "Gagal merancang rute dengan AI. Silakan coba kembali.";
      setAiError(errorMsg);
      toast({
        title: "Gagal Merancang Rute",
        description: errorMsg,
        variant: "error",
      });
    } finally {
      setIsAiPlanning(false);
      setAiPlanStage("idle");
    }
  };

  // ── SPOT JITU: Auto-fetch nearby saat area/radius berubah ──
  useEffect(() => {
    if (analysisAreaCenter && activeTab === "recommendations") {
      fetchNearbyForSpotJitu(analysisAreaCenter, spotJituRadius);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisAreaCenter, spotJituRadius]);

  const handleLoadSavedRoute = (route: SavedRouteItem) => {
    if (Array.isArray(route.waypoints) && route.waypoints.length > 0) {
      if (trackingWatchId.current !== null) {
        stopTracking();
      }

      onWaypointsChange(route.waypoints);
      setRouteName(route.name);
      setIsShared(route.is_shared);
      setActiveTab("planner");

      if (
        Array.isArray(route.route_coordinates) &&
        route.route_coordinates.length > 1
      ) {
        onRouteCalculated({
          coordinates: route.route_coordinates,
          distanceKm: route.distance || 0,
          durationMinutes: route.estimated_duration || 0,
        });
      } else if (route.waypoints.length >= 2) {
        calculateRoute(route.waypoints)
          .then((res) => onRouteCalculated(res))
          .catch(() => { });
      }

      toast({
        title: "Rute Dimuat",
        description: `Rute "${route.name}" dimuat ke peta.`,
        variant: "success",
      });
    }
  };

  const handleUpdateRouteStatus = async (
    routeId: string,
    status: "active" | "planned",
  ) => {
    const is_shared = status === "active";

    try {
      await api.patch(`/vendor-routes/${routeId}`, {
        status,
        is_shared,
      });

      setSavedRoutes((prev) =>
        prev.map((route) =>
          route.id === routeId ? { ...route, status, is_shared } : route,
        ),
      );

      toast({
        title: "Status Berhasil Diubah",
        description: `Status rute sekarang ${status === "active"
          ? "Aktif dan dibagikan"
          : "Tidak Aktif dan tidak dibagikan"
          }.`,
        variant: "success",
      });
    } catch (error: any) {
      toast({
        title: "Gagal Mengubah Status",
        description:
          error.response?.data?.message ?? "Status rute gagal diperbarui.",
        variant: "error",
      });
    }
  };

  const handleDeleteRoute = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.delete(`/vendor-routes/${id}`);
      setSavedRoutes((prev) => prev.filter((r) => r.id !== id));
      if (trackingRouteId === id) {
        stopTracking();
      }
      toast({
        title: "Rute Dihapus",
        description: "Rencana rute berhasil dihapus dari database.",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Gagal Menghapus",
        description: "Tidak dapat menghapus rute.",
        variant: "error",
      });
    }
  };

  const isTrackingActive = isRouteStarted || trackingRouteId !== null;

  return (
    <div
      className={cn(
        // Desktop: floating panel anchored left next to nav pill (IDENTICAL to previous desktop layout)
        "md:fixed md:z-[430] md:left-20 md:top-6 md:bottom-6 md:w-[28rem] md:rounded-3xl md:bg-white md:shadow-2xl md:border md:border-slate-200/80 md:overflow-hidden md:flex md:flex-col",
        // Mobile: draggable bottom sheet anchored bottom
        "max-md:fixed max-md:z-[430] max-md:inset-x-0 max-md:bottom-0 max-md:w-full max-md:rounded-t-3xl max-md:rounded-b-none max-md:bg-white max-md:shadow-2xl max-md:border-t max-md:border-slate-200/80 max-md:overflow-hidden max-md:flex max-md:flex-col",
        !isOpen && "hidden",
      )}
      style={
        isMobile
          ? {
              height: isDragging
                ? `${dragHeight}px`
                : `${getMobileSnapHeight(sheetSnap, windowHeight)}px`,
              maxHeight: "90vh",
              transition: isDragging
                ? "none"
                : "height 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
            }
          : {
              maxHeight: "calc(100vh - 3rem)",
            }
      }
    >
      {/* Header with touch/drag handlers for mobile */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="p-4 border-b border-slate-200 bg-white/95 backdrop-blur-xs select-none max-md:cursor-grab max-md:active:cursor-grabbing max-md:touch-none shrink-0"
      >
        {/* Mobile bottom sheet drag handle */}
        <div
          data-mobile-drag-handle
          onClick={handleToggleSnap}
          className="md:hidden flex flex-col items-center justify-center -mt-1.5 mb-2 py-1 cursor-pointer select-none"
          title="Ketuk atau geser untuk ubah ukuran panel"
        >
          <div className="w-12 h-1.5 rounded-full bg-slate-300 transition-colors hover:bg-slate-400" />
          <div className="flex items-center gap-1 text-[10px] text-muted font-medium mt-1">
            {sheetSnap === "collapsed" && (
              <span className="flex items-center gap-0.5 text-primary font-semibold">
                <ChevronUp size={12} /> Buka panel rute
              </span>
            )}
            {sheetSnap === "half" && (
              <span className="flex items-center gap-1 text-slate-500">
                <ChevronUp size={11} /> Tarik ke atas / bawah <ChevronDown size={11} />
              </span>
            )}
            {sheetSnap === "expanded" && (
              <span className="flex items-center gap-0.5 text-slate-500">
                <ChevronDown size={12} /> Perkecil panel
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Route size={18} />
            </div>
            <div>
              <h2 className="text-lg font-display font-bold text-ink">
                Rute Usaha Keliling
              </h2>
              <p className="text-[11px] text-muted">
                Perencana jalur jualan gerobak & usaha mobile
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Mobile Snap Toggle button */}
            <button
              type="button"
              onClick={handleToggleSnap}
              title={sheetSnap === "collapsed" ? "Perbesar panel" : "Perkecil panel"}
              className="md:hidden p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-muted cursor-pointer"
            >
              {sheetSnap === "collapsed" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-muted cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("planner")}
            className={cn(
              "py-1.5 rounded-lg transition-all text-center cursor-pointer",
              activeTab === "planner"
                ? "bg-white text-ink shadow-xs"
                : "text-muted hover:text-ink",
            )}
          >
            Perencana
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("recommendations")}
            className={cn(
              "py-1.5 rounded-lg transition-all text-center cursor-pointer flex items-center justify-center gap-1",
              activeTab === "recommendations"
                ? "bg-white text-ink shadow-xs"
                : "text-muted hover:text-ink",
            )}
          >
            <Sparkles size={11} className="text-amber-500" />
            Spot Jitu
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("saved")}
            className={cn(
              "py-1.5 rounded-lg transition-all text-center cursor-pointer",
              activeTab === "saved"
                ? "bg-white text-ink shadow-xs"
                : "text-muted hover:text-ink",
            )}
          >
            Rute Saya
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      {!isLoggedIn ? (
        <div className="flex-1 min-h-0 flex items-center justify-center p-6">
          <div className="w-full max-w-sm text-center space-y-4">
            <div className="mx-auto size-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Route size={28} />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-ink">Login Diperlukan</h3>
              <p className="text-sm text-muted leading-relaxed">
                Silakan login terlebih dahulu untuk menggunakan perencana rute
                usaha keliling, melihat rekomendasi, dan menyimpan rute Anda.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                window.location.href = "/login?redirect=/view-maps";
              }}
              className="w-full py-2.5 rounded-xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary-deep transition-all shadow-sm"
            >
              Login Sekarang
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4">
          {/* ACTIVE NAVIGATION STATUS BANNER */}
          {isNavigationFinished ? (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-800 text-white shadow-xl space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={18} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white">Navigasi Selesai!</p>
                  <p className="text-[11px] text-emerald-100">
                    Semua titik singgah dan tujuan berhasil dikunjungi.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={stopTracking}
                className="w-full py-2 px-3 rounded-xl bg-white text-emerald-800 font-bold text-xs hover:bg-emerald-50 transition-colors shadow-sm cursor-pointer"
              >
                Selesai & Reset Status Rute
              </button>
            </div>
          ) : isTrackingActive ? (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-800 text-white shadow-lg space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Navigasi Langsung
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/25 text-blue-100 font-mono">
                    Titik {activeWaypointIndex + 1}/{targetsRef.current.length || activeWaypoints.length}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/25 flex items-center gap-1">
                    <span className={`size-1.5 rounded-full ${gpsAccuracyLevel === "good" ? "bg-emerald-400" : gpsAccuracyLevel === "medium" ? "bg-amber-400" : "bg-red-400"
                      }`} />
                    <span className="text-[10px] text-blue-100">
                      {gpsAccuracyLevel === "good" ? "GPS Baik" : gpsAccuracyLevel === "medium" ? "GPS Sedang" : "GPS Lemah"}
                    </span>
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 pt-1">
                <div className="size-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Navigation size={16} className="text-white fill-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-blue-200">
                    Menuju ke titik sasaran:
                  </p>
                  <p className="text-sm font-bold text-white truncate">
                    {targetsRef.current[activeWaypointIndex]?.name ||
                      activeWaypoints[activeWaypointIndex]?.name ||
                      `Titik ${activeWaypointIndex + 1}`}
                  </p>
                </div>
                {targetDistanceMeters != null && (
                  <div className="text-right shrink-0 border-l border-white/20 pl-2.5">
                    <p className="text-xs font-extrabold text-blue-200">
                      {targetDistanceMeters >= 1000
                        ? `${(targetDistanceMeters / 1000).toFixed(1)} km`
                        : `${targetDistanceMeters} m`}
                    </p>
                    <p className="text-[9px] text-blue-300">sisa jarak</p>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-white/20 flex items-center justify-between gap-2">
                <p className="text-[10px] text-blue-200">
                  Peta berputar otomatis mengikuti arah perjalanan.
                </p>
                <button
                  type="button"
                  onClick={stopTracking}
                  className="px-2.5 py-1 rounded-lg bg-red-600/90 hover:bg-red-700 text-white font-bold text-xs shrink-0 cursor-pointer transition-colors shadow-sm"
                >
                  Akhiri Navigasi
                </button>
              </div>
            </div>
          ) : null}

          {/* TAB 1: PLANNER */}
          {activeTab === "planner" && (
            <div className="space-y-4">
              {/* ROUTE LOCATIONS */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-ink">
                    Route Locations
                  </h3>

                  {activeWaypoints.length >= 2 && (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                      {activeWaypoints.length} titik
                    </span>
                  )}
                </div>

                <div className="flex gap-3">
                  <div className="flex flex-col items-center pt-3">
                    <span className="size-3 rounded-full border-[3px] border-emerald-600 bg-white shrink-0" />
                    <span className="w-px flex-1 min-h-8 border-l-2 border-dotted border-slate-300" />
                    <span className="size-3 rounded-sm bg-indigo-600 shrink-0" />
                  </div>

                  <div className="flex-1 min-w-0 space-y-3">
                    <div>
                      <RouteLocationSearch
                        label="Starting Point"
                        placeholder="Search starting location..."
                        onSelect={handleSelectRouteStart}
                      />

                      {activeWaypoints[0] && (
                        <p className="mt-1 text-[10px] text-emerald-700 truncate">
                          Titik awal: {activeWaypoints[0].name}
                        </p>
                      )}
                    </div>

                    <div>
                      <RouteLocationSearch
                        label="Destination"
                        placeholder="Search destination..."
                        onSelect={handleSelectRouteEnd}
                      />

                      {activeWaypoints.length >= 2 && (
                        <p className="mt-1 text-[10px] text-indigo-700 truncate">
                          Tujuan:{" "}
                          {activeWaypoints[activeWaypoints.length - 1].name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={isLocating}
                    title="Gunakan lokasi saat ini sebagai titik awal"
                    aria-label="Gunakan lokasi saat ini sebagai titik awal"
                    className="w-full py-2 rounded-xl bg-white border border-slate-200 text-ink font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <Navigation
                      size={13}
                      className={cn(isLocating && "animate-spin")}
                    />
                    {isLocating ? "Memuat Lokasi..." : "Lokasi Saya"}
                  </button>

                  <button
                    type="button"
                    onClick={onSelectStartPoint}
                    className="w-full py-2 rounded-xl bg-white border border-slate-200 text-ink font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
                  >
                    <MapPin size={13} />
                    Pilih di Peta
                  </button>
                </div>
              </div>

              {/* WAYPOINTS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink">
                    Titik Singgah ({activeWaypoints.length} titik)
                  </span>

                  <button
                    type="button"
                    onClick={handleAddStop}
                    disabled={
                      activeWaypoints.length === 0 ||
                      activeWaypoints.length >= 8
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary-soft text-primary text-xs font-semibold hover:bg-primary/20 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus size={12} />
                    Tambah Titik
                  </button>
                </div>

                {showAddStopNotice && (
                  <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50">
                    <div className="flex items-start gap-2">
                      <MapPin
                        size={16}
                        className="text-emerald-700 shrink-0 mt-0.5"
                      />

                      <div className="flex-1">
                        <p className="text-xs font-bold text-emerald-900">
                          Pilih Posisi di Peta
                        </p>
                        <p className="text-[11px] text-emerald-800 mt-1">
                          Klik lokasi yang ingin dijadikan titik singgah pada
                          peta.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowAddStopNotice(false)}
                        className="text-emerald-700 hover:text-emerald-900"
                        aria-label="Tutup notifikasi"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {activeWaypoints.length === 0 ? (
                  <div className="p-4 bg-white rounded-xl border border-dashed border-slate-300 text-center">
                    <MapPin size={20} className="mx-auto text-slate-400 mb-2" />
                    <p className="text-xs font-semibold text-ink">
                      Belum ada titik perjalanan
                    </p>
                    <p className="text-[11px] text-muted mt-1">
                      Cari titik awal dan tujuan di atas.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[28vh] overflow-y-auto overflow-x-hidden overscroll-contain space-y-2 pr-1">
                    {activeWaypoints.map((wp, idx) => {
                      const isFirst = idx === 0;
                      const isLast = idx === activeWaypoints.length - 1;
                      const wpKey = getWaypointKey(wp, idx);
                      const isCompleted = completedWaypointKeys.includes(wpKey);
                      const isCurrent =
                        (isTrackingActive && !isNavigationFinished) &&
                        (currentWaypointKey === wpKey || (!currentWaypointKey && idx === activeWaypointIndex));

                      return (
                        <div
                          key={wpKey}
                          className={cn(
                            "p-3 rounded-xl border shadow-xs space-y-2 transition-all duration-200",
                            isCompleted
                              ? "bg-emerald-50/90 border-emerald-400/80 shadow-emerald-100/50"
                              : isCurrent
                                ? "bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/30"
                                : "bg-white border-slate-200/90",
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span
                                className={cn(
                                  "size-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0",
                                  isCompleted
                                    ? "bg-emerald-600"
                                    : isCurrent
                                      ? "bg-amber-600 animate-pulse"
                                      : isFirst
                                        ? "bg-emerald-600"
                                        : isLast
                                          ? "bg-indigo-600"
                                          : "bg-slate-700",
                                )}
                              >
                                {isCompleted ? (
                                  <Check size={11} strokeWidth={3} />
                                ) : (
                                  idx + 1
                                )}
                              </span>

                              <input
                                type="text"
                                value={wp.name || ""}
                                onChange={(e) =>
                                  handleUpdateStop(idx, {
                                    name: e.target.value,
                                  })
                                }
                                className="w-full min-w-0 text-xs font-semibold text-ink bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary focus:outline-none px-1"
                                placeholder={
                                  isFirst
                                    ? "Titik Awal"
                                    : isLast
                                      ? "Titik Tujuan"
                                      : `Titik Singgah ${idx + 1}`
                                }
                              />
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {isCompleted && (
                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-1 border border-emerald-300/60">
                                  <CheckCircle2 size={11} className="text-emerald-700" />
                                  Selesai
                                </span>
                              )}
                              {isCurrent && !isCompleted && (
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded flex items-center gap-1 border border-amber-300/60">
                                  <Target size={10} className="text-amber-600 animate-spin" />
                                  Target
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => handleMoveStop(idx, "up")}
                                disabled={isFirst || isTrackingActive}
                                className="p-1 text-muted hover:text-ink disabled:opacity-30 cursor-pointer"
                                title="Pindah ke atas"
                              >
                                <ArrowUpDown size={12} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleRemoveStop(idx)}
                                disabled={isTrackingActive}
                                className="p-1 text-red-500 hover:text-red-700 disabled:opacity-30 cursor-pointer"
                                title="Hapus titik"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 text-[11px] text-muted pt-1 border-t border-slate-100">
                            <span className="flex items-center gap-1 min-w-0">
                              <MapPin size={10} className="shrink-0" />
                              <span className="truncate">
                                {wp.lat.toFixed(4)}, {wp.lng.toFixed(4)}
                              </span>
                            </span>

                            <div className="flex items-center gap-1 shrink-0">
                              <Clock size={10} />
                              <span>Mangkal:</span>
                              <input
                                type="number"
                                value={wp.stop_duration || 0}
                                onChange={(e) =>
                                  handleUpdateStop(idx, {
                                    stop_duration: Math.max(
                                      0,
                                      Number(e.target.value),
                                    ),
                                  })
                                }
                                className="w-12 px-1 py-0.5 text-right bg-slate-100 rounded text-ink"
                                min="0"
                                step="15"
                              />
                              <span>menit</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ROUTE SETTINGS: COLLAPSIBLE */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowRouteSettings((prev) => !prev)}
                  className="w-full p-3 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Route size={14} className="text-primary" />
                    <div>
                      <p className="text-xs font-bold text-ink">
                        Pengaturan Rute
                      </p>
                      <p className="text-[10px] text-muted mt-0.5">
                        Nama, bisnis, catatan, dan opsi rute
                      </p>
                    </div>
                  </div>

                  <span className="text-xs text-muted">
                    {showRouteSettings ? "Tutup" : "Buka"}
                  </span>
                </button>

                {showRouteSettings && (
                  <div className="p-3 border-t border-slate-100 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-muted mb-1">
                        Nama Rute:
                      </label>
                      <input
                        type="text"
                        value={routeName}
                        onChange={(e) => setRouteName(e.target.value)}
                        placeholder="Contoh: Rute Bakso Siang SCBD"
                        className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary border border-slate-200"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted mb-1">
                        Bisnis Terkait:
                      </label>
                      <select
                        value={selectedBusinessId}
                        onChange={(e) => setSelectedBusinessId(e.target.value)}
                        disabled={loadingBusinesses}
                        className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs border border-slate-200"
                      >
                        <option value="">
                          {loadingBusinesses
                            ? "Memuat bisnis..."
                            : "Pilih bisnis (opsional)"}
                        </option>

                        {businesses.map((business) => (
                          <option key={business.id} value={String(business.id)}>
                            {business.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted mb-1">
                        Catatan Rute:
                      </label>
                      <input
                        type="text"
                        value={routeNotes}
                        onChange={(e) => setRouteNotes(e.target.value)}
                        placeholder="Catatan untuk perjalanan"
                        className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary border border-slate-200"
                      />
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl space-y-3 border border-slate-100 text-xs">
                      <label className="flex items-center justify-between gap-3 cursor-pointer">
                        <span className="text-ink font-medium">
                          Kembali ke Titik Awal (Roundtrip)
                        </span>
                        <input
                          type="checkbox"
                          checked={isRoundtrip}
                          onChange={(e) => {
                            setIsRoundtrip(e.target.checked);
                            onRouteCalculated(null);
                            if (trackingWatchId.current !== null) {
                              stopTracking();
                            } else {
                              setIsRouteStarted(false);
                            }
                          }}
                          className="accent-primary"
                        />
                      </label>

                      <label className="flex items-center justify-between gap-3 cursor-pointer">
                        <span className="text-ink font-medium flex items-center gap-1">
                          <Share2 size={12} className="text-primary" />
                          Bagikan Rute ke Peta Publik
                        </span>
                        <input
                          type="checkbox"
                          checked={isShared}
                          onChange={(e) => setIsShared(e.target.checked)}
                          className="accent-primary"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* CALCULATION SUMMARY */}
              {currentCalculation && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                    <span>
                      {isTrackingActive
                        ? "Jalur Navigasi Nyata (Tersisa):"
                        : "Hasil Perhitungan Rute Jalan Raya:"}
                    </span>
                    <CheckCircle2 size={14} className="text-emerald-600" />
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs text-emerald-900 pt-1">
                    <span>
                      Jarak: <b>{currentCalculation.distanceKm} km</b>
                    </span>
                    <span>
                      Waktu: <b>{currentCalculation.durationMinutes} menit</b>
                    </span>
                  </div>

                  {currentCalculation.summary && (
                    <p className="text-[10px] text-emerald-700 pt-0.5">
                      {currentCalculation.summary}
                    </p>
                  )}
                </div>
              )}

              {/* ACTION BUTTONS: KEEP ORIGINAL POSITION AND LAYOUT */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={
                    currentCalculation
                      ? isTrackingActive
                        ? () => {
                          stopTracking();
                          toast({
                            title: "Navigasi Dihentikan",
                            description: "Pelacakan rute telah dihentikan.",
                            variant: "success",
                          });
                        }
                        : handleStartPlannerTracking
                      : handleCalculateRoute
                  }
                  disabled={
                    isCalculating ||
                    (!currentCalculation && activeWaypoints.length < 2)
                  }
                  className={cn(
                    "min-w-0 py-2.5 px-2 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-60",
                    isTrackingActive
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-primary hover:bg-primary-deep",
                  )}
                >
                  {isCalculating ? (
                    <>
                      <RefreshCw size={14} className="animate-spin shrink-0" />
                      <span className="text-center">Menghitung Jalur...</span>
                    </>
                  ) : currentCalculation ? (
                    isTrackingActive ? (
                      <>
                        <X size={14} className="shrink-0" />
                        <span className="text-center">Akhiri Rute</span>
                      </>
                    ) : (
                      <>
                        <Navigation size={14} className="shrink-0" />
                        <span className="text-center">Mulai Rute</span>
                      </>
                    )
                  ) : (
                    <>
                      <Navigation size={14} className="shrink-0" />
                      <span className="text-center">
                        Hitung Jalur Jalan Nyata
                      </span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSaveRoute}
                  disabled={isSaving || activeWaypoints.length < 2}
                  className="min-w-0 py-2.5 px-2 rounded-xl bg-white border border-slate-200 text-ink font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw
                        size={14}
                        className="animate-spin text-primary shrink-0"
                      />
                      <span className="text-center">Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} className="text-primary shrink-0" />
                      <span className="text-center">Simpan ke Database</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: SPOT JITU — Area-based AI Route Analysis */}
          {activeTab === "recommendations" && (
            <div className="space-y-4">
              {/* ── STEP 1: Pilih Bisnis Konteks ──────────────────────── */}
              <div className="p-3 bg-gradient-to-br from-indigo-50/90 via-purple-50/70 to-emerald-50/60 rounded-2xl border border-indigo-200/80 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <div className="size-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                    <Sparkles size={14} className="text-amber-300" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-indigo-950 flex items-center gap-1.5">
                      Spot Jitu AI
                      <span className="text-[9.5px] uppercase tracking-wider font-extrabold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">
                        DeepSeek
                      </span>
                    </h4>
                    <p className="text-[10.5px] text-indigo-800/80">
                      Analisis area & rancang rute optimal dengan AI
                    </p>
                  </div>
                </div>

                {/* Pilih bisnis konteks */}
                <div className="space-y-1.5">
                  <label className="text-[10.5px] font-semibold text-indigo-900/80 block">
                    1. Konteks Usaha (opsional)
                  </label>
                  <select
                    value={selectedBusinessId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedBusinessId(val);
                      const biz = businesses.find((b) => String(b.id) === val);
                      const bLat = Number(biz?.latitude ?? biz?.lat);
                      const bLng = Number(biz?.longitude ?? biz?.lng);
                      if (!isNaN(bLat) && !isNaN(bLng) && !analysisAreaCenter) {
                        onAnalysisAreaCenterChange?.({ lat: bLat, lng: bLng });
                      }
                    }}
                    className="w-full text-xs p-2 rounded-xl border border-indigo-200 bg-white/95 text-ink focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    disabled={isAiPlanning || spotJituStreaming}
                  >
                    <option value="">— Tanpa konteks spesifik —</option>
                    {businesses.map((b) => (
                      <option key={b.id} value={String(b.id)}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ── STEP 2: Pilih Area di Peta ────────────────────────── */}
                <div className="space-y-1.5">
                  <label className="text-[10.5px] font-semibold text-indigo-900/80 block">
                    2. Pilih Area Analisis di Peta
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isAiPlanning || spotJituStreaming}
                      onClick={() => onSelectAnalysisArea?.()}
                      className="flex-1 py-2 px-3 rounded-xl border-2 border-dashed border-indigo-300 bg-white/80 text-indigo-800 font-semibold text-xs hover:bg-indigo-50 hover:border-indigo-400 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <CircleDot size={14} className="text-indigo-600" />
                      {analysisAreaCenter
                        ? `📍 ${analysisAreaCenter.lat.toFixed(4)}, ${analysisAreaCenter.lng.toFixed(4)}`
                        : "Klik Lokasi di Peta"}
                    </button>
                  </div>
                  {!analysisAreaCenter && (
                    <p className="text-[10px] text-indigo-700/60 italic">
                      Klik tombol di atas, lalu klik titik di peta sebagai pusat area
                    </p>
                  )}
                </div>

                {/* ── STEP 3: Pilih Radius ──────────────────────────────── */}
                <div className="space-y-1.5">
                  <label className="text-[10.5px] font-semibold text-indigo-900/80 block">
                    3. Radius Analisis
                  </label>
                  <div className="flex items-center gap-2">
                    {[1000, 2000, 3000, 5000].map((r) => (
                      <button
                        key={r}
                        type="button"
                        disabled={isAiPlanning || spotJituStreaming}
                        onClick={() => setSpotJituRadius(r)}
                        className={cn(
                          "flex-1 py-1.5 rounded-xl text-[10.5px] font-bold transition-all cursor-pointer border",
                          spotJituRadius === r
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : "bg-white text-indigo-800 border-indigo-200 hover:bg-indigo-50",
                        )}
                      >
                        {r >= 1000 ? `${r / 1000} km` : `${r}m`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── STEP 4: Preferensi Tambahan (opsional) ─────────────── */}
                <div className="space-y-1.5">
                  <label className="text-[10.5px] font-semibold text-indigo-900/80 block">
                    4. Catatan Preferensi Rute (opsional)
                  </label>
                  <input
                    type="text"
                    value={customPromptNotes}
                    onChange={(e) => setCustomPromptNotes(e.target.value)}
                    disabled={isAiPlanning || spotJituStreaming}
                    placeholder="Contoh: Fokus dekat kampus saat jam siang, hindari tanjakan..."
                    className="w-full text-xs p-2 rounded-xl border border-indigo-200 bg-white/95 text-ink placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>

                {/* ── Tombol Analisis Area AI Lengkap ─────────────────── */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-indigo-100">
                  <span className="text-[10.5px] text-muted flex items-center gap-1">
                    <Lightbulb size={12} className="text-amber-500 shrink-0" />
                    DeepSeek + OpenStreetMap + OSRM
                  </span>

                  <button
                    type="button"
                    disabled={isAiPlanning || (!analysisAreaCenter && !selectedBusinessId)}
                    onClick={() => void handleStartAiAreaPlan()}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {isAiPlanning ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Menganalisis...</span>
                      </>
                    ) : (
                      <>
                        <Radar size={13} />
                        <span>Rancang Rute AI</span>
                      </>
                    )}
                  </button>
                </div>

                {/* ── Status Tahapan AI ───────────────────────────────── */}
                {isAiPlanning && (
                  <div className="p-2.5 bg-indigo-50/80 border border-indigo-200 rounded-xl flex items-center gap-2 text-indigo-900 text-xs animate-pulse">
                    <Loader2 size={14} className="animate-spin text-indigo-600 shrink-0" />
                    <span className="text-[11px] font-medium">
                      {aiPlanStage === "fetching_osm" && "📡 Mengumpulkan fasilitas umum sekitar (OpenStreetMap)..."}
                      {aiPlanStage === "analyzing_ai" && "🤖 AI menganalisis area & merancang alur rute optimal..."}
                      {aiPlanStage === "calculating_route" && "🚗 Menghitung jalur jaringan jalan & durasi (OSRM)..."}
                      {aiPlanStage === "idle" && "Memproses rute..."}
                    </span>
                  </div>
                )}

                {/* ── Error alert ────────────────────────────────────── */}
                {aiError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-800 text-[11px]">
                    <AlertCircle size={14} className="shrink-0 text-rose-600 mt-0.5" />
                    <span className="flex-1">{aiError}</span>
                  </div>
                )}

                {/* ── COMPLETE AI ROUTE RECOMMENDATION CARD ──────────── */}
                {currentAreaResponse && !isAiPlanning && (
                  <div className="p-3 bg-white rounded-xl border-2 border-emerald-500/80 shadow-md space-y-3 animate-in fade-in slide-in-from-top-2">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                      <div className="min-w-0">
                        <span className="text-[9.5px] uppercase font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full inline-block mb-1">
                          Rekomendasi Rute Lengkap
                        </span>
                        <h4 className="font-bold text-ink text-sm truncate">
                          {currentAreaResponse.route_name}
                        </h4>
                        <p className="text-[10px] text-muted truncate">
                          Konteks Usaha: {currentAreaResponse.selected_business.name} (
                          {currentAreaResponse.selected_business.business_type || "Usaha Keliling"})
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAreaResponse(null)}
                        className="text-muted hover:text-ink cursor-pointer p-0.5 shrink-0"
                        title="Tutup pratinjau"
                      >
                        <X size={15} />
                      </button>
                    </div>

                    {/* Metrics Banner */}
                    <div className="grid grid-cols-3 gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-100 text-center">
                      <div>
                        <span className="text-[9.5px] text-muted block">Jarak Total</span>
                        <span className="text-xs font-extrabold text-ink">
                          {currentAreaResponse.route_metrics.distance_km != null
                            ? `${currentAreaResponse.route_metrics.distance_km} km`
                            : currentAreaResponse.route_metrics.distance_meters != null
                              ? `${(currentAreaResponse.route_metrics.distance_meters / 1000).toFixed(1)} km`
                              : "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9.5px] text-muted block">Estimasi Waktu</span>
                        <span className="text-xs font-extrabold text-ink">
                          {currentAreaResponse.route_metrics.duration_minutes != null
                            ? `${currentAreaResponse.route_metrics.duration_minutes} mnt`
                            : currentAreaResponse.route_metrics.duration_seconds != null
                              ? `${Math.round(currentAreaResponse.route_metrics.duration_seconds / 60)} mnt`
                              : "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9.5px] text-muted block">Total Titik</span>
                        <span className="text-xs font-extrabold text-indigo-700">
                          {currentAreaResponse.recommended_waypoints.length + 2} titik
                        </span>
                      </div>
                    </div>

                    {/* Timeline Titik Perjalanan */}
                    <div className="space-y-2">
                      <p className="text-[10.5px] font-bold text-muted uppercase tracking-wider">
                        Runtutan Perjalanan Rute:
                      </p>

                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                        {/* 1. START POINT */}
                        <div
                          onClick={() => setHighlightedStop(currentAreaResponse.start_point.id)}
                          className={cn(
                            "p-2 rounded-xl text-xs border transition-all cursor-pointer space-y-1",
                            currentHighlightedStopId === currentAreaResponse.start_point.id
                              ? "bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-300"
                              : "bg-slate-50/80 border-slate-200/80 hover:bg-slate-100/70",
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <div className="size-5 rounded-full bg-emerald-600 text-white font-extrabold text-[9px] flex items-center justify-center shrink-0">
                              <Play size={10} className="fill-white translate-x-0.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                                  START
                                </span>
                                <p className="text-xs font-bold text-ink truncate">
                                  {currentAreaResponse.start_point.name}
                                </p>
                              </div>
                            </div>
                            <span className="text-[9px] font-semibold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-100 shrink-0">
                              {currentAreaResponse.start_point.source === "business"
                                ? "Bisnis"
                                : currentAreaResponse.start_point.source === "internal_poi"
                                  ? "POI"
                                  : "Fasum"}
                            </span>
                          </div>
                          <p className="text-[10.5px] text-slate-600 leading-snug pl-7">
                            {currentAreaResponse.start_point.reason}
                          </p>
                        </div>

                        {/* 2. INTERMEDIATE WAYPOINTS */}
                        {currentAreaResponse.recommended_waypoints.map((wp, idx) => (
                          <div
                            key={`wp-${wp.id}-${idx}`}
                            onClick={() => setHighlightedStop(wp.id)}
                            className={cn(
                              "p-2 rounded-xl text-xs border transition-all cursor-pointer space-y-1",
                              currentHighlightedStopId === wp.id
                                ? "bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-300"
                                : "bg-slate-50/80 border-slate-200/80 hover:bg-slate-100/70",
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <div className="size-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                                {idx + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs font-bold text-ink truncate">
                                    {wp.name}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-muted">
                                  <span className="capitalize">{wp.category || "Fasilitas"}</span>
                                  <span>•</span>
                                  <span>Mangkal ~{wp.stop_duration_minutes || 30} mnt</span>
                                </div>
                              </div>
                              <span className="text-[9px] font-semibold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-100 shrink-0">
                                {wp.source === "business"
                                  ? "Bisnis"
                                  : wp.source === "internal_poi"
                                    ? "POI"
                                    : "Fasum"}
                              </span>
                            </div>
                            <p className="text-[10.5px] text-slate-600 leading-snug pl-7">
                              {wp.reason}
                            </p>
                          </div>
                        ))}

                        {/* 3. END POINT */}
                        <div
                          onClick={() => setHighlightedStop(currentAreaResponse.end_point.id)}
                          className={cn(
                            "p-2 rounded-xl text-xs border transition-all cursor-pointer space-y-1",
                            currentHighlightedStopId === currentAreaResponse.end_point.id
                              ? "bg-rose-50/80 border-rose-400 ring-2 ring-rose-300"
                              : "bg-slate-50/80 border-slate-200/80 hover:bg-slate-100/70",
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <div className="size-5 rounded-full bg-rose-600 text-white font-extrabold text-[9px] flex items-center justify-center shrink-0">
                              <Flag size={10} className="fill-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-bold bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded">
                                  END
                                </span>
                                <p className="text-xs font-bold text-ink truncate">
                                  {currentAreaResponse.end_point.name}
                                </p>
                              </div>
                            </div>
                            <span className="text-[9px] font-semibold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-100 shrink-0">
                              {currentAreaResponse.end_point.source === "business"
                                ? "Bisnis"
                                : currentAreaResponse.end_point.source === "internal_poi"
                                  ? "POI"
                                  : "Fasum"}
                            </span>
                          </div>
                          <p className="text-[10.5px] text-slate-600 leading-snug pl-7">
                            {currentAreaResponse.end_point.reason}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Faktor Analisis Geografis (Collapsible) */}
                    {Array.isArray(currentAreaResponse.analysis_factors) &&
                      currentAreaResponse.analysis_factors.length > 0 && (
                        <div className="rounded-xl border border-indigo-200/80 bg-white overflow-hidden shadow-2xs">
                          <button
                            type="button"
                            onClick={() => setShowAnalysisFactors((prev) => !prev)}
                            className="w-full p-2.5 flex items-center justify-between text-left hover:bg-indigo-50/50 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-1.5">
                              <Layers size={13} className="text-indigo-600" />
                              <span className="text-xs font-bold text-indigo-950">
                                Faktor Pertimbangan Geografis (
                                {currentAreaResponse.analysis_factors.length})
                              </span>
                            </div>
                            {showAnalysisFactors ? (
                              <ChevronUp size={14} className="text-indigo-600" />
                            ) : (
                              <ChevronDown size={14} className="text-indigo-600" />
                            )}
                          </button>
                          {showAnalysisFactors && (
                            <div className="p-2 pt-0 space-y-1.5 border-t border-indigo-100 mt-1 max-h-48 overflow-y-auto">
                              {currentAreaResponse.analysis_factors.map((factor, idx) => (
                                <div
                                  key={idx}
                                  className="p-2 rounded-lg bg-indigo-50/40 border border-indigo-100/70 text-[11px] space-y-0.5"
                                >
                                  <div className="font-bold text-indigo-900 flex items-center gap-1">
                                    <span className="size-1.5 rounded-full bg-indigo-500 shrink-0" />
                                    <span>{factor.factor}</span>
                                  </div>
                                  <p className="text-slate-700 pl-2.5">
                                    <span className="font-semibold text-slate-900">Temuan: </span>
                                    {factor.finding}
                                  </p>
                                  <p className="text-indigo-800 pl-2.5">
                                    <span className="font-semibold text-indigo-950">Dampak: </span>
                                    {factor.impact_on_route}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                    {/* Penjelasan Rute AI */}
                    <div className="p-2.5 bg-gradient-to-br from-indigo-50/60 to-purple-50/60 rounded-xl border border-indigo-100 space-y-1">
                      <div className="flex items-center gap-1.5 text-indigo-950 font-bold text-xs">
                        <Info size={13} className="text-indigo-600" />
                        <span>Penjelasan & Rasional Rute AI</span>
                      </div>
                      <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-line">
                        {currentAreaResponse.explanation}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAreaResponse(null)}
                        className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer text-center"
                      >
                        Rancang Ulang
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyAiAreaRoute}
                        className="flex-[2] py-2 px-3 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Check size={14} />
                        <span>Terapkan Rute ke Peta</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── MANUAL POI RECOMMENDATION CARDS (TERDEKAT) ───────────── */}
              <div className="space-y-3 pt-1">
                <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/80">
                  <h4 className="font-bold text-xs text-amber-900 flex items-center gap-1.5 mb-1">
                    <Sparkles size={13} className="text-amber-600" />
                    Titik Mangkal Satuan Berpotensi
                  </h4>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Dihitung dari kepadatan fasilitas umum pejalan kaki tinggi
                    (kampus, sekolah, pasar, sentral transit) di sekitar titik acuan Anda.
                  </p>
                </div>

                {loadingRecs ? (
                  <div className="py-8 text-center space-y-2">
                    <RefreshCw className="size-5 text-primary animate-spin mx-auto" />
                    <p className="text-xs text-muted">
                      Menganalisis titik ramai di sekitar...
                    </p>
                  </div>
                ) : recommendations.length === 0 ? (
                  <div className="text-center py-8 text-muted text-xs">
                    Tidak ada rekomendasi di radius ini. Coba geser pusat peta ke
                    kawasan kota.
                  </div>
                ) : (
                  recommendations.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-primary bg-primary-soft px-1.5 py-0.5 rounded">
                            {rec.category}
                          </span>
                          <h4 className="font-bold text-ink text-xs mt-1">
                            {rec.name}
                          </h4>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                          Skor Ramai: {rec.footfall_score}
                        </span>
                      </div>

                      <p className="text-[11px] text-muted leading-relaxed">
                        {rec.reason}
                      </p>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <span className="text-[10.5px] text-muted">
                          ~{rec.distance_meters}m dari titik acuan
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAddRecommendationToRoute(rec)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[10.5px] hover:bg-emerald-700 transition-colors cursor-pointer"
                        >
                          + Jadikan Titik Singgah
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SAVED ROUTES */}
          {activeTab === "saved" && (
            <div className="space-y-3">
              {/* Search bar */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari rute tersimpan..."
                  value={savedRoutesSearch}
                  onChange={(e) => {
                    setSavedRoutesSearch(e.target.value);
                    setSavedRoutesPage(1);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-primary"
                />
              </div>

              {loadingSaved ? (
                <div className="py-12 text-center space-y-2">
                  <RefreshCw className="size-5 text-primary animate-spin mx-auto" />
                  <p className="text-xs text-muted">
                    Memuat rute tersimpan dari database...
                  </p>
                </div>
              ) : savedRoutes.length === 0 ? (
                <div className="text-center py-12 text-muted text-xs space-y-1">
                  <Route size={24} className="mx-auto text-slate-300 mb-1" />
                  <p className="font-semibold text-ink">
                    {debouncedSavedRoutesSearch ? "Tidak ada rute yang cocok" : "Belum ada rute tersimpan"}
                  </p>
                  <p>
                    {debouncedSavedRoutesSearch
                      ? "Coba kata kunci pencarian yang lain."
                      : 'Gunakan tab "Perencana" untuk membuat dan menyimpan rute Anda.'}
                  </p>
                </div>
              ) : (
                savedRoutes.map((route) => (
                  <div
                    key={route.id}
                    onClick={() => handleLoadSavedRoute(route)}
                    className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-primary/50 transition-all cursor-pointer space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-emerald-500" />
                          <h4 className="font-bold text-ink text-xs">
                            {route.name}
                          </h4>
                        </div>
                        <p className="text-[11px] text-muted mt-0.5">
                          {route.start_location_name || "Awal"} &rarr;{" "}
                          {route.end_location_name || "Akhir"}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        {route.is_shared && (
                          <span className="text-[10px] text-primary bg-primary-soft px-1.5 py-0.5 rounded font-semibold">
                            Publik
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteRoute(route.id, e)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted pt-1 border-t border-slate-100">
                      <span>{route.waypoints?.length || 0} titik singgah</span>
                      <span>
                        {route.distance
                          ? `${route.distance} km`
                          : "Estimasi jarak"}
                      </span>
                    </div>

                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="pt-2 border-t border-slate-100"
                    >
                      <label className="block text-xs font-semibold text-muted mb-2">
                        Status Rute:
                      </label>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(["active", "planned"] as const).map((status) => {
                          const isCurrent = route.status === status;

                          return (
                            <button
                              key={status}
                              type="button"
                              onClick={() =>
                                handleUpdateRouteStatus(route.id, status)
                              }
                              className={`clay-press rounded-[10px] px-2.5 py-1.5
          text-[10px] font-semibold transition-all cursor-pointer
          ${isCurrent
                                  ? "clay-primary text-white shadow-sm"
                                  : "bg-white text-muted border border-slate-200 hover:text-ink"
                                }`}
                            >
                              {status === "active" ? "Active" : "Inactive"}
                            </button>
                          );
                        })}

                        {(route.status === "active" ||
                          trackingRouteId === route.id) && (
                            <button
                              type="button"
                              onClick={() => {
                                if (trackingRouteId === route.id) {
                                  stopTracking();

                                  toast({
                                    title: "Navigasi Dihentikan",
                                    description:
                                      "Pelacakan GPS telah dihentikan.",
                                    variant: "success",
                                  });
                                } else {
                                  handleStartTracking(route);
                                }
                              }}
                              className={`clay-press rounded-[10px] px-2.5 py-1.5
        text-[10px] font-semibold transition-all cursor-pointer
        ${trackingRouteId === route.id
                                  ? "bg-red-600 text-white shadow-sm"
                                  : "bg-emerald-600 text-white shadow-sm"
                                }`}
                            >
                              {trackingRouteId === route.id
                                ? "Akhiri Navigasi"
                                : "Mulai Navigasi"}
                            </button>
                          )}
                      </div>
                    </div>
                  </div>
                ))
              )}

              {/* Server-side Pagination for Saved Routes */}
              {savedRoutesTotalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-muted">
                  <span>
                    Hal {savedRoutesPage} dari {savedRoutesTotalPages} ({savedRoutesTotal} rute)
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={savedRoutesPage <= 1}
                      onClick={() => setSavedRoutesPage((p) => Math.max(1, p - 1))}
                      className="px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Sebelumnya
                    </button>
                    <button
                      type="button"
                      disabled={savedRoutesPage >= savedRoutesTotalPages}
                      onClick={() => setSavedRoutesPage((p) => p + 1)}
                      className="px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Selanjutnya
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
