import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    className?: string;
    error?: boolean;
}

export function Input({
    className,
    error = false,
    ...props
}: InputProps) {
    return (
        <input
            className={cn(
                "w-full rounded-[12px] py-2.5 px-3.5 text-[13.5px] text-ink",
                "placeholder:text-muted/60",
                "focus:outline-none",
                error
                    ? [
                          "border border-red-500",
                          "text-red-900",
                          "placeholder:text-red-500/60",
                          "shadow-[inset_2px_2px_5px_rgba(239,68,68,0.12),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]",
                          "focus:border-red-500",
                          "focus:ring-4",
                          "focus:ring-red-500/15",
                          "focus:shadow-[inset_2px_2px_5px_rgba(239,68,68,0.15),0_0_0_3px_rgba(239,68,68,0.08)]",
                      ]
                    : [
                          "clay-inset",
                          "focus:border-primary",
                          "focus:ring-2",
                          "focus:ring-primary/20",
                      ],
                className
            )}
            aria-invalid={error}
            {...props}
        />
    );
}

export default Input;