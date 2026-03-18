"use client"
import { ButtonHTMLAttributes } from "react"
import { clsx } from "clsx"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost"
  size?: "sm" | "md" | "lg"
  loading?: boolean
}

export function Button({ variant = "primary", size = "md", loading, className, children, disabled, ...props }: ButtonProps) {
  const base = "inline-flex items-center justify-content gap-2 font-semibold rounded-md transition-all cursor-pointer border-0 font-['DM_Sans',sans-serif]"
  const variants = {
    primary: "bg-[#F5C400] text-[#111111] hover:bg-[#e0b000]",
    secondary: "bg-white text-[#111111] border border-[#E0E0E0] hover:bg-[#F5F5F0]",
    danger: "bg-[#fee2e2] text-[#dc2626] hover:bg-[#fecaca]",
    ghost: "bg-transparent text-[#888888] hover:text-[#111111] hover:bg-[#F5F5F0]",
  }
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-2.5 text-base",
  }
  return (
    <button
      className={clsx(base, variants[variant], sizes[size], (disabled || loading) && "opacity-50 cursor-not-allowed", className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <span className="animate-spin">⟳</span> : children}
    </button>
  )
}
