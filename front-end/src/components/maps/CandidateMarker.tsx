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

const colorMap: Record<CandidateId, string> = {
  A: '#5b5bd6',
  B: '#2f9e6b',
  C: '#c4922a',
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

  const iconNode = (
    <div style={{
      backgroundColor: colorMap[id], 
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
        <MapPopup className="lociva-popup-wrapper">
          <div className="p-3 text-center space-y-1">
            <p className="font-bold text-ink text-sm">Candidate {id}</p>
            <p className="text-xs text-muted">Drag marker to adjust location</p>
            <p className="text-[10px] text-slate-400 font-mono">
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </p>
          </div>
        </MapPopup>
      </MapMarker>
      
      <MapCircle
        center={[lat, lng]}
        radius={radius}
        pathOptions={{
          color: colorMap[id],
          fillColor: colorMap[id],
          fillOpacity: 0.1,
          weight: 2,
          dashArray: '4'
        }}
      />
    </>
  );
};
