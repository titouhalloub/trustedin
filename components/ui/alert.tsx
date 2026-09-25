import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";// adjust path if utils is in project root

const alertVariants = cva(
  "p-4 rounded-md border-l-4",
  {
    variants: {
      variant: {
        default: "bg-gray-50 border-gray-300 text-gray-700",
        success: "bg-green-50 border-green-500 text-green-700",
        error: "bg-red-50 border-red-500 text-red-700",
        warning: "bg-yellow-50 border-yellow-500 text-yellow-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface AlertProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {
  title?: string;
  description?: string;
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ title, description, variant, className, ...props }, ref) => (
    <div ref={ref} className={cn(alertVariants({ variant, className }))} {...props}>
      {title && <div className="font-semibold">{title}</div>}
      {description && <div className="text-sm mt-1">{description}</div>}
      {props.children}
    </div>
  )
);

Alert.displayName = "Alert";
