import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type AlertVariant =
    | "default"
    | "success"
    | "warning"
    | "error"
    | "info";

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
    variant?: AlertVariant;
    icon?: ReactNode;
}

const variants: Record<AlertVariant, string> = {
    default:
        "bg-background text-ink border-border",

    success:
        "border-green-200 bg-green-50 text-green-800",

    warning:
        "border-yellow-200 bg-yellow-50 text-yellow-800",

    error:
        "border-red-200 bg-red-50 text-red-800",

    info:
        "border-blue-200 bg-blue-50 text-blue-800",
};

export function Alert({
    variant = "default",
    icon,
    className,
    children,
    ...props
}: AlertProps) {
    return (
        <div
            role="alert"
            className={cn(
                "clay-card flex items-start gap-3 rounded-[14px] border my-3 px-4 py-3",
                variants[variant],
                className
            )}
            {...props}
        >
            {icon && (
                <div className="mt-0.5 shrink-0">
                    {icon}
                </div>
            )}

            <div className="min-w-0 flex-1">
                {children}
            </div>
        </div>
    );
}

interface AlertTitleProps
    extends HTMLAttributes<HTMLHeadingElement> {}

export function AlertTitle({
    className,
    ...props
}: AlertTitleProps) {
    return (
        <h5
            className={cn(
                "text-[13.5px] font-semibold",
                className
            )}
            {...props}
        />
    );
}

interface AlertDescriptionProps
    extends HTMLAttributes<HTMLParagraphElement> {}

export function AlertDescription({
    className,
    ...props
}: AlertDescriptionProps) {
    return (
        <p
            className={cn(
                "mt-0.5 text-[12.5px] leading-relaxed opacity-80",
                className
            )}
            {...props}
        />
    );
}
