import { useState } from "react";
import { Camera, MapPin, Check, ThumbsUp, AlertTriangle, Droplets, Trash2, Lightbulb, Clock } from "lucide-react";
import { civicReports, reportStatuses, type CivicReportItem } from "../../data/mock";
import { DemoNote, Eyebrow, Section } from "../ui/Section";
import { MapPreview } from "./MapPreview";

export function CivicReport() {
  const [selectedId, setSelectedId] = useState(civicReports[0].id);
  const [confirmedReports, setConfirmedReports] = useState<Record<string, boolean>>({});

  const report = civicReports.find((r) => r.id === selectedId) ?? civicReports[0];
  const isConfirmedByUser = !!confirmedReports[report.id];
  const currentConfirmCount = report.confirmations + (isConfirmedByUser ? 1 : 0);

  function toggleConfirmation(id: string) {
    setConfirmedReports((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  function getCategoryIcon(cat: CivicReportItem["category"]) {
    switch (cat) {
      case "flood":
        return <Droplets size={12} />;
      case "waste":
        return <Trash2 size={12} />;
      case "light":
        return <Lightbulb size={12} />;
      case "road":
      default:
        return <AlertTriangle size={12} />;
    }
  }

  return (
    <Section id="reports">
      <div className="mb-8 max-w-xl">
        <Eyebrow>civic intelligence</Eyebrow>
        <h2 className="font-display text-[28px] leading-snug font-medium tracking-[-0.02em] text-ink md:text-[32px]">
          Understand what is happening around you.
        </h2>
        <p className="mt-3 text-[15px] leading-7 text-muted">
          Citizens pin ground realities on the map, upload photos, and let neighbors verify what they see. These reports feed area-condition signals directly into the platform rather than sitting in a siloed complaint box.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        {/* Map Preview with Civic Markers */}
        <div>
          <MapPreview variant="civic" showScore={false} catchment={false} />
          {/* Report category pills selector */}
          <div className="mt-3.5 flex flex-wrap gap-2">
            {civicReports.map((item) => {
              const isSelected = selectedId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`clay-press inline-flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[12px] font-medium transition-all ${
                    isSelected ? "clay-primary text-white" : "clay text-ink"
                  }`}
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: item.tone }}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Report Inspection & Action Card */}
        <div className="clay flex flex-col justify-between rounded-[18px] p-5 sm:p-6">
          <div>
            <div className="flex items-center justify-between border-b border-[#ececf6] pb-3">
              <div className="flex items-center gap-2">
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full text-white"
                  style={{ background: report.tone }}
                >
                  {getCategoryIcon(report.category)}
                </span>
                <p className="text-[13px] font-medium text-ink">{report.label}</p>
              </div>
              <span className="flex items-center gap-1 text-[11px] text-muted">
                <Clock size={11} /> {report.timeAgo}
              </span>
            </div>

            {/* Pinned location & details */}
            <div className="mt-4 space-y-3 text-[13px]">
              <div>
                <span className="flex items-center gap-1.5 text-[11px] text-muted">
                  <MapPin size={12} className="text-primary" /> pinned location
                </span>
                <p className="clay-soft mt-1 rounded-[10px] px-3 py-2 text-ink">
                  {report.streetName}
                </p>
              </div>

              {/* Photo preview tile */}
              <div>
                <span className="flex items-center gap-1.5 text-[11px] text-muted">
                  <Camera size={12} className="text-primary" /> field photo
                </span>
                <div className="clay-soft mt-1 flex items-center justify-between rounded-[10px] p-2.5 text-[12px] text-muted">
                  <div className="flex items-center gap-2">
                    <div
                      className="flex h-10 w-12 items-center justify-center rounded-[6px] text-[10px] text-white"
                      style={{ background: report.tone }}
                    >
                      photo
                    </div>
                    <div>
                      <p className="font-medium text-ink">field_capture_{report.category}.jpg</p>
                      <p className="text-[10px] text-muted">geo-tagged · verified coordinates</p>
                    </div>
                  </div>
                  <span className="rounded-[4px] bg-[#f0f0f8] px-1.5 py-0.5 text-[10px] text-muted">
                    view
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <span className="text-[11px] text-muted">description</span>
                <p className="mt-1 text-[13px] leading-relaxed text-ink">
                  {report.note}
                </p>
              </div>
            </div>

            {/* Status progression stepper */}
            <div className="mt-5 border-t border-[#ececf6] pt-4">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-medium text-ink">report lifecycle</p>
                <span className="text-[11px] font-medium text-primary">
                  status: {report.status}
                </span>
              </div>
              <ol className="mt-2.5 flex flex-wrap gap-1">
                {reportStatuses.map((status) => {
                  const isActive = status === report.status;
                  return (
                    <li
                      key={status}
                      className={`rounded-[8px] px-2 py-1 text-[11px] font-medium transition-all ${
                        isActive
                          ? "clay-primary text-white"
                          : "bg-primary-soft/60 text-muted"
                      }`}
                    >
                      {status}
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>

          {/* Neighbor confirmation button */}
          <div className="mt-6 border-t border-[#ececf6] pt-4">
            <button
              type="button"
              onClick={() => toggleConfirmation(report.id)}
              className={`clay-press flex w-full items-center justify-center gap-2 rounded-[12px] px-4 py-2.5 text-[13px] font-medium transition-all ${
                isConfirmedByUser
                  ? "bg-[#e8f6ee] text-potential border border-potential/20"
                  : "clay text-ink"
              }`}
            >
              {isConfirmedByUser ? (
                <>
                  <Check size={14} className="text-potential" />
                  <span>you and {currentConfirmCount - 1} neighbors confirmed this</span>
                </>
              ) : (
                <>
                  <ThumbsUp size={14} className="text-primary" />
                  <span>confirm this is still happening ({currentConfirmCount})</span>
                </>
              )}
            </button>
            <DemoNote>
              Civic reports act as ground signals. Neighbors verify conditions to maintain data fresh and actionable.
            </DemoNote>
          </div>
        </div>
      </div>
    </Section>
  );
}
