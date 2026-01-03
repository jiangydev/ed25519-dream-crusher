"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type SliderProps = {
  min?: number
  max?: number
  step?: number
  value: number
  onChange: (value: number) => void
  disabled?: boolean
  className?: string
  labels?: string[]
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  ({ min = 0, max = 100, step = 1, value, onChange, disabled = false, className, labels }, ref) => {
    const percentage = ((value - min) / (max - min)) * 100

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = Number(e.target.value)
      onChange(newValue)
    }

    return (
      <div ref={ref} className={cn("relative w-full", className)}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className="absolute w-full h-2 opacity-0 cursor-pointer z-10"
          style={{ pointerEvents: disabled ? 'none' : 'auto' }}
        />
        <div className="relative h-2 w-full">
          {/* Track */}
          <div className="absolute h-full w-full rounded-full bg-secondary" />
          {/* Fill */}
          <div
            className="absolute h-full rounded-full bg-primary"
            style={{ width: `${percentage}%` }}
          />
          {/* Thumb */}
          <div
            className="absolute h-5 w-5 rounded-full bg-background border-2 border-primary top-1/2 -translate-y-1/2 shadow-md transition-all"
            style={{ left: `${percentage}%`, transform: 'translate(-50%, -50%)' }}
          />
        </div>
        {labels && (
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            {labels.map((label, i) => (
              <span key={i}>{label}</span>
            ))}
          </div>
        )}
      </div>
    )
  }
)
Slider.displayName = "Slider"

export { Slider }
