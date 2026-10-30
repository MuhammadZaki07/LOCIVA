import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Joyride,
  ACTIONS,
  EVENTS,
  STATUS,
  type EventHandler,
  type Step,
} from "react-joyride";

export interface MapTourProps {
  run: boolean;
  onFinish: () => void;
  isLoggedIn: boolean;
  hasSelectedBusiness?: boolean;
  hasCandidate?: boolean;
}

const TOUR_STORAGE_KEY = "lociva_map_tour_completed_v1";

const markTourCompleted = (): void => {
  try {
    localStorage.setItem(TOUR_STORAGE_KEY, "1");
  } catch {
    /* noop */
  }
};

export const MapTour: React.FC<MapTourProps> = ({
  run,
  onFinish,
  isLoggedIn,
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const prevRunRef = useRef(run);

  // Reset to step 0 whenever the tour is (re)launched (run false -> true).
  // This is an intentional one-time sync so replays start at the first step.
  useEffect(() => {
    if (run && !prevRunRef.current) {
      setStepIndex(0);
    }
    prevRunRef.current = run;
  }, [run]);

  const handleFinishOrSkip = useCallback(() => {
    markTourCompleted();
    setStepIndex(0);
    onFinish();
  }, [onFinish]);

  const handleJoyrideEvent = useCallback<EventHandler>(
    (data) => {
      const { action, index, status, type } = data;

      // Handle tour exit (finish, skip, or close button / ESC)
      if (
        status === STATUS.FINISHED ||
        status === STATUS.SKIPPED ||
        action === ACTIONS.CLOSE ||
        action === ACTIONS.SKIP
      ) {
        handleFinishOrSkip();
        return;
      }

      // Handle controlled step progression
      if (type === EVENTS.STEP_AFTER) {
        if (action === ACTIONS.NEXT) {
          setStepIndex(index + 1);
        } else if (action === ACTIONS.PREV) {
          setStepIndex(Math.max(0, index - 1));
        }
      } else if (type === EVENTS.TARGET_NOT_FOUND) {
        // If a target is unexpectedly absent, advance safely to prevent tour freezing
        setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
      }
    },
    [handleFinishOrSkip]
  );

  // Stable steps using reliably mounted DOM target selectors
  const steps: Step[] = [
    {
      target: '[data-tour="catalog-btn"]',
      title: "1. Pilih Model Usaha",
      content:
        "Buka Katalog Usaha untuk memilih jenis UMKM (seperti Warung Kopi, Laundry, Mart) atau pilih dari usaha terdaftar Anda.",
      placement: "right",
    },
    {
      target: '[data-tour="layers-btn"]',
      title: "2. Eksplorasi POI & Peta Publik",
      content:
        "Aktifkan layer fasilitas umum (POI lokal), demografi BPS, serta laporan warga langsung pada peta interaktif.",
      placement: "right",
    },
    {
      target: '[data-tour="map-canvas"]',
      title: "3. Penempatan Titik Kandidat",
      content:
        "Tentukan titik lokasi kandidat usaha Anda di peta. Anda dapat menempatkan dan membandingkan hingga 8 titik kandidat lokasi untuk evaluasi komparatif.",
      placement: "center",
    },
    {
      target: '[data-tour="analysis-btn"]',
      title: "4. Analisis Potensi & Kelayakan",
      content: isLoggedIn
        ? "Buka panel Analisis Lokasi untuk menjalankan kalkulasi backend LOCIVA, melihat skor potensi pasar, kepadatan kompetitor, dan kesesuaian wilayah."
        : "Masuk atau buat akun untuk menjalankan kalkulasi backend LOCIVA, melihat skor potensi pasar, dan menguji kelayakan lokasi.",
      placement: "right",
    },
  ];

  if (isLoggedIn) {
    steps.push({
      target: '[data-tour="candidates-btn"]',
      title: "5. Kandidat Tersimpan",
      content:
        "Lihat dan kelola seluruh riwayat simulasi kandidat lokasi yang telah tersimpan di akun Anda dengan filter usaha aktif dan pencarian server-side.",
      placement: "right",
    });
  }

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      onEvent={handleJoyrideEvent}
      options={{
        primaryColor: "#4f46e5",
        textColor: "#1e293b",
        backgroundColor: "#ffffff",
        arrowColor: "#ffffff",
        overlayColor: "rgba(2, 6, 23, 0.90)",
        zIndex: 10000,
        showProgress: true,
        targetWaitTimeout: 1500,
        spotlightClicks: true,
      }}
      styles={{
        overlay: {
          zIndex: 10000,
        },
        tooltip: {
          zIndex: 10001,
          borderRadius: "1rem",
          padding: "1rem",
          maxWidth: "360px",
          boxShadow:
            "0 20px 25px -5px rgb(0 0 0 / 0.2), 0 8px 10px -6px rgb(0 0 0 / 0.15)",
        },
        beacon: {
          zIndex: 10002,
          width: 14,
          height: 14,
          backgroundColor: "#4f46e5",
          border: "2.5px solid #ffffff",
          boxShadow:
            "0 0 0 4px rgba(79, 70, 229, 0.35), 0 2px 8px rgba(0, 0, 0, 0.25)",
        },
        highlightElement: {
          outline: "3px solid #4f46e5",
          outlineOffset: "3px",
        },
        buttonPrimary: {
          backgroundColor: "#4f46e5",
          borderRadius: "0.75rem",
          fontSize: "0.75rem",
          fontWeight: 700,
          padding: "0.5rem 1rem",
          color: "#ffffff",
        },
        buttonBack: {
          color: "#64748b",
          fontSize: "0.75rem",
          fontWeight: 600,
          marginRight: "0.5rem",
        },
        buttonSkip: {
          color: "#94a3b8",
          fontSize: "0.75rem",
        },
      }}
      locale={{
        back: "Kembali",
        close: "Tutup",
        last: "Selesai",
        next: "Lanjut",
        skip: "Lewati Tur",
      }}
    />
  );
};
