import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    className?: string;
}

export function Card({ className, ...props }: CardProps) {
    return (
        <div
            className={cn(
                "clay rounded-[16px] p-5 max-w-5xl",
                className
            )}
            {...props}
        />
    );
}

export function CardHeader({
    className,
    ...props
}: CardProps) {
    return (
        <div
            className={cn(
                "mb-4",
                className
            )}
            {...props}
        />
    );
}

export function CardTitle({
    className,
    ...props
}: CardProps) {
    return (
        <h3
            className={cn(
                "text-[16px] font-semibold text-ink",
                className
            )}
            {...props}
        />
    );
}

export function CardDescription({
    className,
    ...props
}: CardProps) {
    return (
        <p
            className={cn(
                "mt-1 text-[13px] leading-relaxed text-muted",
                className
            )}
            {...props}
        />
    );
}

export function CardContent({
    className,
    ...props
}: CardProps) {
    return (
        <div
            className={cn(
                "text-[13.5px] text-ink",
                className
            )}
            {...props}
        />
    );
}

export default Card;
