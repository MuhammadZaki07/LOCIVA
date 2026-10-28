import React, { useRef, useMemo } from 'react';
import { MapMarker, MapPopup, MapCircle } from '@/components/ui/shadcn-ui/map';
import L from 'leaflet';
import type { CandidateId } from './CandidateTabs';

interface CandidateMarkerProps {
  id: CandidateId;
  lat: number;
  lng: number;
  radius: number;
  onDragEnd: (id: CandidateId, lat: number, lng: number) => void;
  onClick: (id: CandidateId) => void;
}

const colorMap: Record<string, string> = {
  A: '#5b5bd6',
  B: '#2f9e6b',
  C: '#c4922a',
  D: '#e11d48',
  E: '#8b5cf6',
};

export const CandidateMarker: React.FC<CandidateMarkerProps> = ({
  id, lat, lng, radius, onDragEnd, onClick
}) => {
  const markerRef = useRef<L.Marker>(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const pos = marker.getLatLng();
          onDragEnd(id, pos.lat, pos.lng);
        }
      },
      click() {
        onClick(id);
      }
    }),
    [id, onDragEnd, onClick]
  );

  const markerColor = colorMap[id] || '#0891b2';

  const iconNode = (
    <div style={{
      backgroundColor: markerColor, 
      width: '30px', 
      height: '30px', 
      borderRadius: '50%', 
      border: '3px solid white', 
      boxShadow: '0 2px 5px rgba(0,0,0,0.3)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      color: 'white', 
      fontWeight: 'bold', 
      fontFamily: 'sans-serif', 
      fontSize: '14px',
      cursor: 'grab',
    }}>
      {id}
    </div>
  );

  return (
    <>
      <MapMarker
        position={[lat, lng]}
        icon={iconNode}
        iconAnchor={[15, 15]}
        popupAnchor={[0, -15]}
        draggable={true}
        eventHandlers={eventHandlers}
        ref={markerRef}
      >
        <MapPopup>
          <div className="p-1 text-center font-sans">
            <span className="font-bold text-slate-800 text-sm block">Kandidat {id}</span>
            <span className="text-xs text-slate-500 block">Radius: {radius}m</span>
            <span className="text-[10px] text-muted block mt-1">Geser pin untuk memindahkan</span>
          </div>
        </MapPopup>
      </MapMarker>
      <MapCircle
        center={[lat, lng]}
        radius={radius}
        pathOptions={{
          color: markerColor,
          fillColor: markerColor,
          fillOpacity: 0.12,
          weight: 2,
          dashArray: '4, 4'
        }}
      />
    </>
  );
};
