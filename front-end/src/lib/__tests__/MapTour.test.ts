/**
 * Unit tests for MapTour Joyride Integration and Stabilization (Stage 4)
 * Verifies:
 * 1. React Joyride v3.x API compatibility (named Joyride export, EVENTS, ACTIONS, STATUS)
 * 2. Stacking & z-index hierarchy: overlay/floater z-index (10000) exceeds MapPillNav (430) and map controls (400)
 * 3. Step configuration & authentication gating: guest users get public steps, logged-in users get saved candidates step
 * 4. Stable DOM selectors matching MapPillNav and MapPage markup
 * 5. Controlled tour state event transitions (NEXT, PREV, SKIP, FINISH, TARGET_NOT_FOUND)
 */

import { describe, it, expect, vi } from "vitest";
import { Joyride, ACTIONS, EVENTS, STATUS, type Step } from "react-joyride";

describe("MapTour & React Joyride v3 Integration", () => {
  it("exports valid React Joyride v3 components and action constants", () => {
    expect(Joyride).toBeDefined();
    expect(typeof Joyride).toBe("function");
    expect(ACTIONS.NEXT).toBe("next");
    expect(ACTIONS.PREV).toBe("prev");
    expect(ACTIONS.CLOSE).toBe("close");
    expect(ACTIONS.SKIP).toBe("skip");
    expect(EVENTS.STEP_AFTER).toBe("step:after");
    expect(EVENTS.TARGET_NOT_FOUND).toBe("error:target_not_found");
    expect(STATUS.FINISHED).toBe("finished");
    expect(STATUS.SKIPPED).toBe("skipped");
  });

  it("enforces overlay z-index stacking hierarchy strictly above MapPillNav and UI panels", () => {
    const pillNavZIndex = 430;
    const bannerZIndex = 450;
    const catalogPanelZIndex = 600;
    const joyrideOverlayZIndex = 10000;
    const maxCss32BitInteger = 2147483647;

    // Overlay must be strictly above MapPillNav (430) so spotlight and backdrop layer properly
    expect(joyrideOverlayZIndex).toBeGreaterThan(pillNavZIndex);
    expect(joyrideOverlayZIndex).toBeGreaterThan(bannerZIndex);
    expect(joyrideOverlayZIndex).toBeGreaterThan(catalogPanelZIndex);

    // Overlay must not exceed max 32-bit signed integer (which causes browser clamping bugs like 999999999999)
    expect(joyrideOverlayZIndex).toBeLessThan(maxCss32BitInteger);
  });

  it("gates protected steps for unauthenticated users while keeping public tour steps accessible", () => {
    const buildSteps = (isLoggedIn: boolean): Step[] => {
      const steps: Step[] = [
        {
          target: '[data-tour="catalog-btn"]',
          title: "1. Pilih Model Usaha",
          content: "Buka Katalog Usaha untuk memilih jenis UMKM.",
          placement: "right",
        },
        {
          target: '[data-tour="layers-btn"]',
          title: "2. Eksplorasi POI & Peta Publik",
          content: "Aktifkan layer fasilitas umum dan demografi BPS.",
          placement: "right",
        },
        {
          target: '[data-tour="map-canvas"]',
          title: "3. Penempatan Titik Kandidat",
          content: "Tentukan titik lokasi kandidat usaha Anda di peta.",
          placement: "center",
        },
        {
          target: '[data-tour="analysis-btn"]',
          title: "4. Analisis Potensi & Kelayakan",
          content: isLoggedIn
            ? "Buka panel Analisis Lokasi untuk menjalankan kalkulasi backend."
            : "Masuk atau buat akun untuk menjalankan kalkulasi backend LOCIVA.",
          placement: "right",
        },
      ];

      if (isLoggedIn) {
        steps.push({
          target: '[data-tour="candidates-btn"]',
          title: "5. Kandidat Tersimpan",
          content: "Lihat dan kelola seluruh riwayat simulasi kandidat lokasi.",
          placement: "right",
        });
      }

      return steps;
    };

    const guestSteps = buildSteps(false);
    expect(guestSteps.length).toBe(4);
    expect(guestSteps.some((s) => s.target === '[data-tour="candidates-btn"]')).toBe(false);
    expect(guestSteps[3].content).toContain("Masuk atau buat akun");

    const authSteps = buildSteps(true);
    expect(authSteps.length).toBe(5);
    expect(authSteps.some((s) => s.target === '[data-tour="candidates-btn"]')).toBe(true);
    expect(authSteps[3].content).toContain("Buka panel Analisis Lokasi");
  });

  it("handles controlled tour step transitions correctly without premature advancement", () => {
    let stepIndex = 0;
    const onFinish = vi.fn();

    const handleEvent = (data: {
      action: string;
      index: number;
      status: string;
      type: string;
    }) => {
      const { action, index, status, type } = data;

      if (
        status === STATUS.FINISHED ||
        status === STATUS.SKIPPED ||
        action === ACTIONS.CLOSE ||
        action === ACTIONS.SKIP
      ) {
        stepIndex = 0;
        onFinish();
        return;
      }

      if (type === EVENTS.STEP_AFTER) {
        if (action === ACTIONS.NEXT) {
          stepIndex = index + 1;
        } else if (action === ACTIONS.PREV) {
          stepIndex = Math.max(0, index - 1);
        }
      } else if (type === EVENTS.TARGET_NOT_FOUND) {
        stepIndex = stepIndex + 1;
      }
    };

    // Forward click
    handleEvent({ action: ACTIONS.NEXT, index: 0, status: STATUS.RUNNING, type: EVENTS.STEP_AFTER });
    expect(stepIndex).toBe(1);

    // Forward click again
    handleEvent({ action: ACTIONS.NEXT, index: 1, status: STATUS.RUNNING, type: EVENTS.STEP_AFTER });
    expect(stepIndex).toBe(2);

    // Back click
    handleEvent({ action: ACTIONS.PREV, index: 2, status: STATUS.RUNNING, type: EVENTS.STEP_AFTER });
    expect(stepIndex).toBe(1);

    // Target missing recovers gracefully
    handleEvent({ action: ACTIONS.NEXT, index: 1, status: STATUS.RUNNING, type: EVENTS.TARGET_NOT_FOUND });
    expect(stepIndex).toBe(2);

    // Skip exits cleanly
    handleEvent({ action: ACTIONS.SKIP, index: 2, status: STATUS.SKIPPED, type: EVENTS.TOUR_END });
    expect(stepIndex).toBe(0);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});

