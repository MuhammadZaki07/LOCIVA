import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  href?: string;
  children: ReactNode;
};

const variants = {
  primary: "clay-primary clay-press text-white",
  secondary: "clay clay-press text-ink",
  ghost: "bg-transparent text-muted hover:text-ink",
};

export function ClayButton({
  variant = "primary",
  className = "",
  href,
  children,
  ...props
}: Props) {
  const classes = `inline-flex items-center justify-center gap-2 rounded-[12px] px-4 py-2.5 text-[14px] font-medium no-underline ${variants[variant]} ${className}`;

  if (href) {
    return (
      <a href={href} className={classes} onClick={props.onClick as never}>
        {children}
      </a>
    );
  }

  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  );
}
