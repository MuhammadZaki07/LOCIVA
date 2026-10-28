import { useState, useEffect, useCallback, useRef } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from "@/components/ui/Modal";
import { Map, MapTileLayer, MapZoomControl, MapMarker } from "@/components/ui/shadcn-ui/map";
import { UserLocationMarker } from "@/components/maps/UserLocationMarker";
import { useMapEvents, useMap } from "react-leaflet";
import type L from "leaflet";
import { MapPin, Check, Crosshair, Navigation } from "lucide-react";

// Default coordinate fallback: Malang (matching MapPage / view-map)
const DEFAULT_CENTER: [number, number] = [-7.9797, 112.6304];

// Batas wilayah kepulauan Indonesia: Barat Daya (Samudra Hindia / selatan Rote) s/d Timur Laut (Laut Natuna Utara / Papua timur)
const INDONESIA_BOUNDS: [[number, number], [number, number]] = [
  [-13.5, 92.0],
  [8.5, 144.0],
];

// ─── Click handler inside the map ──────────────────────────────────────────────
const PickerClickHandler: React.FC<{
  onMapClick: (lat: number, lng: number) => void;
}> = ({ onMapClick }) => {
  const map = useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });

  useEffect(() => {
    map.getContainer().style.cursor = "crosshair";
    return () => {
      map.getContainer().style.cursor = "";
    };
  }, [map]);

  return null;
};

// ─── Resize invalidator when modal opens ───────────────────────────────────────
const MapResizeHandler: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 300);
    return () => clearTimeout(timer);
  }, [map]);

  return null;
};

// ─── Props ─────────────────────────────────────────────────────────────────────
interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
}

// ─── Component ─────────────────────────────────────────────────────────────────
export function LocationPickerModal({ isOpen, onClose, onConfirm, initialLat, initialLng }: LocationPickerModalProps) {
  const mapRef = useRef<L.Map>(null);

  // User GPS location
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
    accuracy?: number;
  } | null>(null);

  // Selected position for the business marker
  const [selectedPos, setSelectedPos] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Map center
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);

  // Check whether we are in edit mode with existing saved coordinates
  const hasSavedCoords =
    initialLat !== undefined &&
    initialLng !== undefined &&
    !isNaN(initialLat) &&
    !isNaN(initialLng) &&
    initialLat !== 0 &&
    initialLng !== 0;

  // Initialize state whenever modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (hasSavedCoords) {
      // Edit mode: retain marker at the stored business coordinates
      const saved: [number, number] = [initialLat!, initialLng!];
      setSelectedPos({ lat: initialLat!, lng: initialLng! });
      setMapCenter(saved);
      mapRef.current?.setView(saved, 15);
    } else {
      // Create mode: no business location selected yet
      setSelectedPos(null);
    }

    // Geolocation detection
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserLocation({ lat, lng, accuracy: pos.coords.accuracy });

          // If create mode, center map on user's current location
          if (!hasSavedCoords) {
            setMapCenter([lat, lng]);
            mapRef.current?.flyTo([lat, lng], 15);
          }
        },
        (err) => {
          console.info("LocationPicker geolocation info:", err.message);
          // If denied/unavailable, fallback remains DEFAULT_CENTER
          if (!hasSavedCoords) {
            setMapCenter(DEFAULT_CENTER);
          }
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
      );
    }
  }, [isOpen, initialLat, initialLng, hasSavedCoords]);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setSelectedPos({ lat, lng });
  }, []);

  const handleCenterOnUser = () => {
    if (userLocation) {
      mapRef.current?.flyTo([userLocation.lat, userLocation.lng], 16);
    } else if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserLocation({ lat, lng, accuracy: pos.coords.accuracy });
          mapRef.current?.flyTo([lat, lng], 16);
        },
        (err) => console.info("Geolocation error:", err.message),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
      );
    }
  };

  const handleConfirm = () => {
    if (selectedPos) {
      onConfirm(selectedPos.lat, selectedPos.lng);
    }
  };

  return (
    <Modal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ModalContent size="xl" className="max-w-2xl p-0 overflow-hidden" showClose={true}>
        {/* Header */}
        <ModalHeader className="px-5 pt-5 pb-3 mb-0 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="clay-inset flex size-8 items-center justify-center rounded-full text-primary shrink-0">
              <MapPin size={16} />
            </div>
            <div>
              <ModalTitle className="text-base font-bold text-ink">Pilih Lokasi di Peta</ModalTitle>
              <ModalDescription className="text-xs text-muted mt-0.5">
                {hasSavedCoords
                  ? "Lokasi tersimpan ditampilkan. Klik pada peta untuk memindahkan lokasi usaha."
                  : "Klik pada peta untuk menentukan titik lokasi usaha Anda."}
              </ModalDescription>
            </div>
          </div>
        </ModalHeader>

        {/* Map Body */}
        <ModalBody className="p-0">
          <div className="relative w-full h-[380px] sm:h-[420px]">
            <Map
              ref={mapRef}
              center={mapCenter}
              zoom={14}
              minZoom={4}
              maxZoom={19}
              maxBounds={INDONESIA_BOUNDS}
              maxBoundsViscosity={1.0}
              className="w-full h-full !rounded-none !min-h-0"
            >
              {/* Basemap tile — identical to MapPage / view-map */}
              <MapTileLayer
                key="default"
                name="Default"
                bounds={INDONESIA_BOUNDS}
                noWrap={true}
                minZoom={4}
                maxZoom={19}
              />
              <MapZoomControl position="bottom-3 right-3" />
              <MapResizeHandler />
              <PickerClickHandler onMapClick={handleMapClick} />

              {/* User GPS location marker (identical to view-map) */}
              {userLocation && (
                <UserLocationMarker lat={userLocation.lat} lng={userLocation.lng} accuracy={userLocation.accuracy} />
              )}

              {/* Selected business marker */}
              {selectedPos && (
                <MapMarker
                  position={[selectedPos.lat, selectedPos.lng]}
                  icon={
                    <div className="flex items-center justify-center">
                      <div className="relative">
                        <div className="absolute -inset-2 rounded-full bg-primary/25 animate-ping" />
                        <div
                          style={{
                            background: "linear-gradient(135deg, #6c6ce2 0%, #4747b8 100%)",
                            width: "30px",
                            height: "30px",
                            borderRadius: "10px",
                            border: "2px solid #ffffff",
                            boxShadow: "0 4px 10px rgba(71,71,184,0.45), inset 0 1px 1px rgba(255,255,255,0.8)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <MapPin size={16} className="text-white" />
                        </div>
                      </div>
                    </div>
                  }
                  iconAnchor={[15, 15]}
                />
              )}
            </Map>

            {/* Locate Me button on map */}
            <button
              type="button"
              onClick={handleCenterOnUser}
              title="Pusatkan ke lokasi saya"
              aria-label="Pusatkan ke lokasi saya"
              className="absolute top-3 right-3 z-[400] p-2 bg-white/90 hover:bg-white text-ink hover:text-primary rounded-xl shadow-md border border-slate-200 backdrop-blur-xs transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            >
              <Navigation size={13} className="text-primary" />
              <span className="hidden sm:inline">Lokasi Saya</span>
            </button>

            {/* Floating hint when no marker has been placed */}
            {!selectedPos && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[400] pointer-events-none">
                <div className="bg-black/75 text-white px-4 py-2 rounded-full font-medium text-xs flex items-center gap-2 shadow-xl animate-bounce border border-white/20">
                  <Crosshair size={14} className="text-primary-soft" />
                  <span>Klik di peta untuk menandai lokasi usaha</span>
                </div>
              </div>
            )}
          </div>
        </ModalBody>

        {/* Footer */}
        <ModalFooter className="px-5 py-3.5 mt-0 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Coordinates display */}
          <div className="flex items-center gap-2">
            {selectedPos ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary-soft text-primary text-xs font-bold">
                <MapPin size={13} />
                <span>
                  {selectedPos.lat.toFixed(6)}, {selectedPos.lng.toFixed(6)}
                </span>
              </div>
            ) : (
              <span className="text-xs text-muted italic">Belum ada lokasi dipilih</span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 text-muted font-bold text-xs hover:text-ink transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedPos}
              className="px-4 py-2 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary-deep shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Check size={14} />
              <span>Gunakan Lokasi Ini</span>
            </button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
