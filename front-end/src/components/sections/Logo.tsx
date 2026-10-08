import { cn } from "@/lib/utils";

interface LogoProps {
    className?: string;
}

function Logo({ className }: LogoProps) {
    return (
        <img
            src="/favicon.svg"
            className={cn("w-8.5 hover:scale-110 duration-200 transition-all ease-in-out", className)}
            alt="Logo"
        />
    );
}

export default Logo;