import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ClayButton } from "@/components/ui/ClayButton";
import {
  Store,
  ArrowRight,
  MapPin,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";

export default function UserDashboard() {
  const { user } = useAuth();

  const savedSimulations = [
    {
      id: "sim-1",
      name: "Central Corridor Cafe",
      type: "Specialty Cafe",
      location: "Jl. Sudirman (Primary Corridor)",
      radius: "400 m catchment",
      score: 74,
      tone: "consideration",
      toneColor: "bg-[#fff8e7] text-consider",
      notes: "Strong foot traffic; watch 2 verified sidewalk defects.",
    },
    {
      id: "sim-2",
      name: "Campus Gate Grab-and-Go",
      type: "Food Cart",
      location: "South Campus Avenue",
      radius: "250 m catchment",
      score: 84,
      tone: "potential",
      toneColor: "bg-[#e8f6ee] text-potential",
      notes: "Exceptional morning student pedestrian volume (90 pts).",
    },
    {
      id: "sim-3",
      name: "Inner Block Grooming",
      type: "Barber",
      location: "West Residential Lane",
      radius: "600 m catchment",
      score: 78,
      tone: "potential",
      toneColor: "bg-[#e8f6ee] text-potential",
      notes: "Solid residential loyalty profile; low direct rivalry.",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="clay rounded-[22px] p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="rounded-full bg-primary-soft px-3 py-1 text-[11.5px] font-medium text-primary">
              entrepreneur workspace
            </span>
            <h1 className="mt-2 font-display text-[26px] font-medium tracking-tight text-ink sm:text-[32px]">
              Welcome back, {user?.name || "Explorer"}
            </h1>
            <p className="mt-1 text-[14px] leading-relaxed text-muted">
              Here are your active location simulations, evaluated catchments, and verified ground signals.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <ClayButton href="/#product" className="!rounded-[12px] text-[13px]">
              new simulation
            </ClayButton>
            <ClayButton href="/#reports" variant="secondary" className="!rounded-[12px] text-[13px]">
              report area issue
            </ClayButton>
          </div>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="clay clay-lift rounded-[16px] p-5">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[12px] font-medium">saved location scenarios</span>
            <Store size={16} className="text-primary" />
          </div>
          <p className="mt-3 font-display text-[32px] font-medium leading-none text-ink">
            3
          </p>
          <p className="mt-2 text-[11.5px] text-muted">
            across 2 demo districts
          </p>
        </div>

        <div className="clay clay-lift rounded-[16px] p-5">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[12px] font-medium">confirmed civic signals</span>
            <CheckCircle2 size={16} className="text-potential" />
          </div>
          <p className="mt-3 font-display text-[32px] font-medium leading-none text-ink">
            5
          </p>
          <p className="mt-2 text-[11.5px] text-muted">
            road & flood alerts verified by you
          </p>
        </div>

        <div className="clay clay-lift rounded-[16px] p-5">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[12px] font-medium">highest feasibility score</span>
            <TrendingUp size={16} className="text-primary" />
          </div>
          <p className="mt-3 font-display text-[32px] font-medium leading-none text-ink">
            84 <span className="text-[16px] text-muted font-normal">/ 100</span>
          </p>
          <p className="mt-2 text-[11.5px] text-muted">
            campus gate grab-and-go
          </p>
        </div>
      </div>

      {/* Saved Simulations List */}
      <div className="clay rounded-[20px] p-6">
        <div className="flex items-center justify-between border-b border-[#ececf6] pb-4">
          <div>
            <h2 className="font-display text-[20px] font-medium text-ink">
              Your saved location models
            </h2>
            <p className="text-[12.5px] text-muted">
              Simulations with live area condition factor adjustments.
            </p>
          </div>
          <Link
            to="/#product"
            className="flex items-center gap-1 text-[12.5px] font-medium text-primary hover:underline no-underline"
          >
            <span>simulate another site</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {savedSimulations.map((sim) => (
            <div
              key={sim.id}
              className="clay-soft clay-lift flex flex-col justify-between rounded-[16px] p-5"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-[6px] bg-canvas px-2 py-0.5 text-[11px] font-medium text-muted">
                    {sim.type}
                  </span>
                  <span
                    className={`rounded-[6px] px-2 py-0.5 text-[11px] font-medium capitalize ${sim.toneColor}`}
                  >
                    {sim.tone}
                  </span>
                </div>

                <h3 className="mt-3 text-[16px] font-medium text-ink">
                  {sim.name}
                </h3>
                <p className="mt-1 flex items-center gap-1 text-[12px] text-muted">
                  <MapPin size={11} className="text-primary" />
                  <span>{sim.location}</span>
                </p>

                <div className="mt-4 flex items-baseline gap-1.5">
                  <span className="font-display text-[34px] font-medium text-ink">
                    {sim.score}
                  </span>
                  <span className="text-[14px] text-muted">/ 100</span>
                  <span className="ml-2 text-[11px] text-muted">({sim.radius})</span>
                </div>

                <p className="mt-2 text-[12px] leading-5 text-muted">
                  {sim.notes}
                </p>
              </div>

              <div className="mt-5 border-t border-[#f0f0f8] pt-3">
                <Link
                  to="/#score"
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-primary hover:underline no-underline"
                >
                  <span>inspect score breakdown</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
