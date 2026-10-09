import type { LabelHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
    className?: string;
}

export function Label({
    className,
    ...props
}: LabelProps) {
    return (
        <label
            className={cn(
                "block text-[12.5px] font-medium text-ink",
                className
            )}
            {...props}
        />
    );
}

export default Label;
