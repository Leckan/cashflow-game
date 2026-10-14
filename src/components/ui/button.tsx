import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-sm text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        brass: "bg-brass text-ink hover:bg-[#d7b56a]",
        paper: "bg-paper text-ink hover:bg-white",
        quiet: "border border-paper/25 bg-transparent text-paper hover:bg-white/5",
        danger: "bg-persimmon text-white hover:bg-[#e06a54]",
      },
      size: {
        md: "h-11 px-4",
        sm: "h-9 px-3 text-sm",
      },
    },
    defaultVariants: { variant: "brass", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
