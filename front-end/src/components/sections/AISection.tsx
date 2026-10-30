import { Eyebrow, Section, DemoNote } from "../ui/Section";
import { Route, Compass, Target, CheckCircle2 } from "lucide-react";
import { useLocale } from "@/lib/useLocale";

export function AISection() {
  const { t } = useLocale();

  const aiFeatures = [
    {
      number: t("aiRouteNumber"),
      title: t("aiRouteTitle"),
      badge: t("aiRouteBadge"),
      body: t("aiRouteBody"),
      icon: Route,
      points: [
        t("aiRoutePoint1"),
        t("aiRoutePoint2"),
        t("aiRoutePoint3"),
      ],
      example: t("aiRouteExample"),
    },
    {
      number: t("aiBusinessNumber"),
      title: t("aiBusinessTitle"),
      badge: t("aiBusinessBadge"),
      body: t("aiBusinessBody"),
      icon: Compass,
      points: [
        t("aiBusinessPoint1"),
        t("aiBusinessPoint2"),
        t("aiBusinessPoint3"),
      ],
      example: t("aiBusinessExample"),
    },
    {
      number: t("aiDiffNumber"),
      title: t("aiDiffTitle"),
      badge: t("aiDiffBadge"),
      body: t("aiDiffBody"),
      icon: Target,
      points: [
        t("aiDiffPoint1"),
        t("aiDiffPoint2"),
        t("aiDiffPoint3"),
      ],
      example: t("aiDiffExample"),
    },
  ];

  return (
    <Section id="ai">
      <div className="max-w-2xl">
        <Eyebrow>{t("aiEyebrow")}</Eyebrow>
        <h2 className="font-display text-[28px] leading-snug font-medium tracking-[-0.02em] text-ink md:text-[32px]">
          {t("aiHeadline")}
        </h2>
        <p className="mt-3 text-[15px] leading-7 text-muted">
          {t("aiBody")}
        </p>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {aiFeatures.map((feature) => {
          const Icon = feature.icon;
          return (
            <article
              key={feature.number}
              className="clay clay-lift flex flex-col justify-between rounded-[20px] p-6 transition-all duration-200"
            >
              <div>
                {/* Header: Number, Category Badge, and Icon */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary text-[12px] font-semibold text-white shadow-sm">
                      {feature.number}
                    </span>
                    <span className="rounded-[6px] bg-canvas px-2.5 py-1 text-[11px] font-medium text-muted border border-[#ececf6]">
                      {feature.badge}
                    </span>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary-soft text-primary">
                    <Icon size={18} />
                  </div>
                </div>

                {/* Title & Description */}
                <h3 className="mt-5 font-display text-[20px] font-medium tracking-[-0.01em] text-ink">
                  {feature.title}
                </h3>
                <p className="mt-2.5 text-[13.5px] leading-6 text-muted">
                  {feature.body}
                </p>

                {/* Key Points */}
                <ul className="mt-5 space-y-2.5 border-t border-[#ececf6] pt-4">
                  {feature.points.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-[12.5px] leading-5 text-muted">
                      <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-primary" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Practical Example Note */}
              <div className="mt-6 rounded-[12px] bg-canvas/80 p-3 border border-[#ececf6] text-[12px] leading-5">
                <span className="font-medium text-ink">{t("aiExampleLabel")}: </span>
                <span className="text-muted">{feature.example}</span>
              </div>
            </article>
          );
        })}
      </div>

      <DemoNote>{t("aiDemoNote")}</DemoNote>
    </Section>
  );
}
