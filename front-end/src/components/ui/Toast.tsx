import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from "react";
import {
    AlertCircle,
    CheckCircle2,
    Info,
    TriangleAlert,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant =
    | "default"
    | "success"
    | "error"
    | "warning"
    | "info";

type ToastPosition =
    | "top-left"
    | "top-center"
    | "top-right"
    | "bottom-left"
    | "bottom-center"
    | "bottom-right";

interface ToastData {
    id: string;
    title?: string;
    description?: string;
    variant?: ToastVariant;
    duration?: number;
    className?: string;
}

interface ToastOptions {
    title?: string;
    description?: string;
    variant?: ToastVariant;
    duration?: number;
    className?: string;
}

interface ToastContextType {
    toast: (options: ToastOptions) => string;
    dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(
    undefined
);

interface ToastProviderProps {
    children: ReactNode;
    position?: ToastPosition;
    className?: string;
}

const positionClasses: Record<ToastPosition, string> = {
    "top-left": "top-4 left-4 items-start",
    "top-center":
        "top-4 left-1/2 -translate-x-1/2 items-center",
    "top-right": "top-4 right-4 items-end",

    "bottom-left":
        "bottom-4 left-4 items-start",
    "bottom-center":
        "bottom-4 left-1/2 -translate-x-1/2 items-center",
    "bottom-right":
        "bottom-4 right-4 items-end",
};

const variantClasses: Record<ToastVariant, string> = {
    default:
        "text-ink",

    success:
        "text-potential",

    error:
        "text-warning",

    warning:
        "text-consider",

    info:
        "text-primary",
};

const variantIcons: Record<
    ToastVariant,
    ReactNode
> = {
    default: <Info size={17} />,
    success: <CheckCircle2 size={17} />,
    error: <AlertCircle size={17} />,
    warning: <TriangleAlert size={17} />,
    info: <Info size={17} />,
};

function ToastItem({
    toast,
    onDismiss,
}: {
    toast: ToastData;
    onDismiss: (id: string) => void;
}) {
    const [isVisible, setIsVisible] = useState(false);
    const [isExiting, setIsExiting] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    const remainingTime = useRef(
        toast.duration ?? 4000
    );

    const startTime = useRef<number | null>(null);

    const timerRef = useRef<number | null>(null);

    const clearTimer = useCallback(() => {
        if (timerRef.current !== null) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const startTimer = useCallback(() => {
        if (
            !toast.duration ||
            toast.duration <= 0
        ) {
            return;
        }

        startTime.current = Date.now();

        timerRef.current = window.setTimeout(() => {
            setIsExiting(true);
        }, remainingTime.current);
    }, [toast.duration]);

    /*
     * Bubble entrance
     */
    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            setIsVisible(true);
        });

        return () => {
            cancelAnimationFrame(frame);
        };
    }, []);

    /*
     * Start timer
     */
    useEffect(() => {
        if (!isVisible) {
            return;
        }

        startTimer();

        return clearTimer;
    }, [
        isVisible,
        startTimer,
        clearTimer,
    ]);

    /*
     * Exit animation
     */
    useEffect(() => {
        if (!isExiting) {
            return;
        }

        clearTimer();

        const timer = window.setTimeout(() => {
            onDismiss(toast.id);
        }, 280);

        return () => {
            window.clearTimeout(timer);
        };
    }, [
        isExiting,
        toast.id,
        onDismiss,
        clearTimer,
    ]);

    const handleMouseEnter = () => {
        if (
            !toast.duration ||
            toast.duration <= 0 ||
            isExiting
        ) {
            return;
        }

        clearTimer();

        if (startTime.current !== null) {
            const elapsed =
                Date.now() -
                startTime.current;

            remainingTime.current =
                Math.max(
                    0,
                    remainingTime.current -
                        elapsed
                );
        }

        setIsPaused(true);
    };

    const handleMouseLeave = () => {
        if (
            !toast.duration ||
            toast.duration <= 0 ||
            isExiting
        ) {
            return;
        }

        setIsPaused(false);

        if (
            remainingTime.current <= 0
        ) {
            setIsExiting(true);
            return;
        }

        startTimer();
    };

    const handleDismiss = () => {
        if (isExiting) {
            return;
        }

        clearTimer();
        setIsExiting(true);
    };

    const variant =
        toast.variant ?? "default";

    return (
        <div
            role="alert"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={cn(
                /*
                 * Base Claymorphic
                 */
                "clay",

                /*
                 * Shape
                 */
                "rounded-[18px]",

                /*
                 * Size
                 */
                "w-[360px]",
                "max-w-[calc(100vw-2rem)]",

                /*
                 * Layout
                 */
                "px-4 py-3.5",

                /*
                 * Animation
                 */
                "transform-gpu",
                "will-change-transform",
                "transition-all duration-[280ms]",
                "ease-[cubic-bezier(0.34,1.25,0.64,1)]",

                isExiting
                    ? [
                          "translate-y-[-6px]",
                          "scale-[0.9]",
                          "opacity-0",
                      ]
                    : isVisible
                      ? [
                            "translate-y-0",
                            "scale-100",
                            "opacity-100",
                        ]
                      : [
                            "translate-y-[-12px]",
                            "scale-[0.82]",
                            "opacity-0",
                        ],

                /*
                 * Hover = timer pause
                 */
                !isExiting &&
                    isPaused &&
                    "scale-[1.02]",

                /*
                 * Variant
                 */
                variantClasses[variant],

                /*
                 * Custom class
                 */
                toast.className
            )}
        >
            <div className="flex items-start gap-3">
                {/* Icon */}
                <div
                    className={cn(
                        "clay-inset",
                        "flex size-8 shrink-0",
                        "items-center justify-center",
                        "rounded-full"
                    )}
                >
                    {variantIcons[variant]}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                    {toast.title && (
                        <p className="text-[13.5px] font-semibold">
                            {toast.title}
                        </p>
                    )}

                    {toast.description && (
                        <p
                            className={cn(
                                "text-[12.5px]",
                                "leading-relaxed",
                                "text-muted",
                                toast.title &&
                                    "mt-0.5"
                            )}
                        >
                            {toast.description}
                        </p>
                    )}
                </div>

                {/* Close */}
                <button
                    type="button"
                    onClick={handleDismiss}
                    className={cn(
                        "clay-soft",
                        "clay-press",
                        "flex size-7 shrink-0",
                        "items-center justify-center",
                        "rounded-full",
                        "text-muted",
                        "hover:text-ink"
                    )}
                    aria-label="Close notification"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
}

export function ToastProvider({
    children,
    position = "top-right",
    className,
}: ToastProviderProps) {
    const [toasts, setToasts] =
        useState<ToastData[]>([]);

    const dismiss = useCallback(
        (id: string) => {
            setToasts((current) =>
                current.filter(
                    (toast) =>
                        toast.id !== id
                )
            );
        },
        []
    );

    const toast = useCallback(
        (options: ToastOptions) => {
            const id =
                crypto.randomUUID();

            const newToast: ToastData = {
                id,
                ...options,
                duration:
                    options.duration ?? 4000,
            };

            setToasts((current) => [
                ...current,
                newToast,
            ]);

            return id;
        },
        []
    );

    return (
        <ToastContext.Provider
            value={{
                toast,
                dismiss,
            }}
        >
            {children}

            <div
                className={cn(
                    "pointer-events-none",
                    "fixed z-[9999]",
                    "flex flex-col gap-3",
                    positionClasses[position],
                    className
                )}
            >
                {toasts.map((item) => (
                    <ToastItem
                        key={item.id}
                        toast={item}
                        onDismiss={dismiss}
                    />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context =
        useContext(ToastContext);

    if (!context) {
        throw new Error(
            "useToast must be used inside ToastProvider"
        );
    }

    return context;
}

export type {
    ToastOptions,
    ToastPosition,
    ToastVariant,
};
