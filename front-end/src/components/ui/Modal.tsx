import {
    createContext,
    useContext,
    useEffect,
    useState,
    type HTMLAttributes,
    type ReactNode,
} from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

interface ModalContextType {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(
    undefined
);

interface ModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: ReactNode;
}

export function Modal({
    open,
    onOpenChange,
    children,
}: ModalProps) {
    const [mounted, setMounted] = useState(open);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (open) {
            setMounted(true);

            requestAnimationFrame(() => {
                setVisible(true);
            });

            document.body.style.overflow = "hidden";
        } else {
            setVisible(false);

            const timer = window.setTimeout(() => {
                setMounted(false);
            }, 260);

            document.body.style.overflow = "";

            return () => {
                window.clearTimeout(timer);
            };
        }

        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    useEffect(() => {
        if (!open) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onOpenChange(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [open, onOpenChange]);

    if (!mounted) {
        return null;
    }

    return (
        <ModalContext.Provider
            value={{
                open,
                onOpenChange,
            }}
        >
            <div
                className={cn(
                    "fixed inset-0 z-[9998]",
                    "flex items-center justify-center",
                    "p-4 sm:p-6",
                    "transition-all duration-[260ms] ease-out",
                    visible
                        ? "bg-ink/20 backdrop-blur-[3px]"
                        : "bg-ink/0 backdrop-blur-0"
                )}
            >
                {children}
            </div>
        </ModalContext.Provider>
    );
}

interface ModalContentProps
    extends HTMLAttributes<HTMLDivElement> {
    size?: ModalSize;
    closeOnOverlay?: boolean;
    showClose?: boolean;
}

const sizeClasses: Record<ModalSize, string> = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    full: "max-w-[calc(100vw-2rem)]",
};

export function ModalContent({
    size = "md",
    closeOnOverlay = true,
    showClose = true,
    className,
    children,
    ...props
}: ModalContentProps) {
    const context = useContext(ModalContext);

    if (!context) {
        throw new Error(
            "ModalContent must be used inside Modal"
        );
    }

    const {
        open,
        onOpenChange,
    } = context;

    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            setVisible(open);
        });

        return () => {
            cancelAnimationFrame(frame);
        };
    }, [open]);

    const handleOverlayClick = (
        event: React.MouseEvent<HTMLDivElement>
    ) => {
        if (
            closeOnOverlay &&
            event.target === event.currentTarget
        ) {
            onOpenChange(false);
        }
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            onClick={handleOverlayClick}
            className={cn(
                "relative w-full",
                sizeClasses[size],
                "max-h-[calc(100vh-2rem)]",
                "overflow-y-auto",

                /*
                 * Your Claymorphic surface
                 */
                "clay",

                "rounded-[20px]",
                "p-5 sm:p-6",

                /*
                 * Bubble animation
                 */
                "transform-gpu",
                "transition-all duration-[260ms]",
                "ease-[cubic-bezier(0.34,1.25,0.64,1)]",

                visible
                    ? "translate-y-0 scale-100 opacity-100"
                    : "translate-y-3 scale-[0.92] opacity-0",

                className
            )}
            {...props}
        >
            {showClose && (
                <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className={cn(
                        "absolute right-4 top-4",
                        "flex size-8 items-center justify-center",
                        "rounded-full",

                        /*
                         * Existing Clay system
                         */
                        "clay-soft",
                        "clay-press",

                        "text-muted",
                        "hover:text-ink"
                    )}
                    aria-label="Close modal"
                >
                    <X size={16} />
                </button>
            )}

            {children}
        </div>
    );
}

interface ModalHeaderProps
    extends HTMLAttributes<HTMLDivElement> {}

export function ModalHeader({
    className,
    ...props
}: ModalHeaderProps) {
    return (
        <div
            className={cn(
                "mb-5 pr-10",
                className
            )}
            {...props}
        />
    );
}

interface ModalTitleProps
    extends HTMLAttributes<HTMLHeadingElement> {}

export function ModalTitle({
    className,
    ...props
}: ModalTitleProps) {
    return (
        <h2
            className={cn(
                "text-[18px] font-semibold text-ink",
                className
            )}
            {...props}
        />
    );
}

interface ModalDescriptionProps
    extends HTMLAttributes<HTMLParagraphElement> {}

export function ModalDescription({
    className,
    ...props
}: ModalDescriptionProps) {
    return (
        <p
            className={cn(
                "mt-1.5 text-[13px] leading-relaxed text-muted",
                className
            )}
            {...props}
        />
    );
}

interface ModalBodyProps
    extends HTMLAttributes<HTMLDivElement> {}

export function ModalBody({
    className,
    ...props
}: ModalBodyProps) {
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

interface ModalFooterProps
    extends HTMLAttributes<HTMLDivElement> {}

export function ModalFooter({
    className,
    ...props
}: ModalFooterProps) {
    return (
        <div
            className={cn(
                "mt-6 flex items-center justify-end gap-2",
                className
            )}
            {...props}
        />
    );
}

export function useModal() {
    const context = useContext(ModalContext);

    if (!context) {
        throw new Error(
            "useModal must be used inside Modal"
        );
    }

    return context;
}
