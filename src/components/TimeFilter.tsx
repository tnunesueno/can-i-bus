"use client";

import { MAX_TIME_OPTIONS } from "@/lib/constants";

type TimeFilterProps = {
  value: number;
  onChange: (minutes: number) => void;
};

export function TimeFilter({ value, onChange }: TimeFilterProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {MAX_TIME_OPTIONS.map((minutes) => {
        const selected = minutes === value;
        return (
          <button
            key={minutes}
            type="button"
            onClick={() => onChange(minutes)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              selected
                ? "bg-stone-900 text-white"
                : "border border-line bg-card text-stone-600 hover:border-stone-400"
            }`}
          >
            {minutes} min
          </button>
        );
      })}
    </div>
  );
}
