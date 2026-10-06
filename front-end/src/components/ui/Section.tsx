import type { ReactNode } from "react";

type Props = {
  id?: string;
  children: ReactNode;
  className?: string;
};

export function Section({ id, children, className = "" }: Props) {
  return (
    <section id={id} className={`scroll-mt-16 px-5 py-16 md:px-8 md:py-20 lg:py-24 ${className}`}>
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </section>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 text-[12px] font-medium tracking-[0.02em] text-primary">
      {children}
    </p>
  );
}

export function DemoNote({ children }: { children?: ReactNode }) {
  return (
    <p className="mt-3 text-[12px] leading-5 text-muted">
      {children ?? "Figures shown are simulation / demo data, not live city statistics."}
    </p>
  );
}
