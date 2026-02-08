"use client";

import { useState } from "react";
import { X, Building2 } from "lucide-react";
import { KINGSTON_ZONE_TYPES, type KingstonZoneCode } from "@/lib/kingstonZoning";

export interface BuildingPlacementDetails {
  zoneType: KingstonZoneCode;
  startDate: string; // ISO date
  durationDays: number;
}

interface BuildingPlacementFormProps {
  onSubmit: (details: BuildingPlacementDetails) => void;
  onCancel: () => void;
}

const DEFAULT_DURATION_DAYS = 180;

export function BuildingPlacementForm({ onSubmit, onCancel }: BuildingPlacementFormProps) {
  const [zoneType, setZoneType] = useState<KingstonZoneCode>("MU1");
  const [durationDays, setDurationDays] = useState(DEFAULT_DURATION_DAYS);
  const [startDate, setStartDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ zoneType, startDate, durationDays });
  };

  const categories = [...new Set(KINGSTON_ZONE_TYPES.map((z) => z.category))];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="text-accent-blue" size={20} />
            <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
              Building Details
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Zone Type */}
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-2">
              Kingston Zoning Type
            </label>
            <select
              value={zoneType}
              onChange={(e) => setZoneType(e.target.value as KingstonZoneCode)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-accent-blue focus:border-accent-blue bg-white"
            >
              {categories.map((cat) => (
                <optgroup key={cat} label={cat}>
                  {KINGSTON_ZONE_TYPES.filter((z) => z.category === cat).map(
                    (z) => (
                      <option key={z.code} value={z.code}>
                        {z.code} - {z.name}
                      </option>
                    )
                  )}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Construction duration */}
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-2">
              Construction Duration (days)
            </label>
            <input
              type="number"
              min={1}
              max={1095}
              value={durationDays}
              onChange={(e) => setDurationDays(parseInt(e.target.value, 10) || 1)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-accent-blue focus:border-accent-blue"
            />
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-2">
              Construction Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-accent-blue focus:border-accent-blue"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors uppercase"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-blue-700 rounded-lg transition-colors uppercase"
            >
              Place Building
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
