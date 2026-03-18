"use client"
import { InputHTMLAttributes, forwardRef } from "react"
import { clsx } from "clsx"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, className, ...props }, ref) => (
  <div className="flex flex-col gap-1.5">
    {label && <label className="text-xs font-semibold uppercase tracking-wide text-[#888888]">{label}</label>}
    <input
      ref={ref}
      className={clsx(
        "w-full px-3 py-2 text-sm border rounded-md bg-white text-[#111111] outline-none transition-all",
        "border-[#E0E0E0] focus:border-[#F5C400]",
        error && "border-red-400",
        className
      )}
      {...props}
    />
    {error && <span className="text-xs text-red-500">{error}</span>}
  </div>
))
Input.displayName = "Input"
