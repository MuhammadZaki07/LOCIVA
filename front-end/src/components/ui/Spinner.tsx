import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpinnerProps {
    size?: "sm" | "md" | "lg";
    className?: string;
}

export function Spinner({
    size = "md",
    className,
}: SpinnerProps) {
    const sizes = {
        sm: "size-4",
        md: "size-5",
        lg: "size-8",
    };

    return (
        <LoaderCircle
            className={cn(
                "animate-spin",
                sizes[size],
                className
            )}
            aria-label="Loading"
        />
    );
}

export default Spinner;
