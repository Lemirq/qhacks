"use client";

import { useState, useMemo } from "react";
import {
  X,
  Users,
  Building2,
  Sun,
  Volume2,
  Eye,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type {
  StakeholderAnalysis,
  BuildingImpactResult,
  ImpactRadius,
  ImpactSeverity,
} from "@/lib/stakeholderImpact";

interface StakeholderImpactPanelProps {
  analysis: StakeholderAnalysis | null;
  visible: boolean;
  onClose: () => void;
  radius: ImpactRadius;
  onRadiusChange: (r: ImpactRadius) => void;
}

const SEVERITY_COLORS: Record<ImpactSeverity, string> = {
  none: "bg-zinc-500",
  low: "bg-green-500",
  medium: "bg-yellow-500",
  high: "bg-red-500",
};

function SeverityBadge({ severity }: { severity: ImpactSeverity }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${SEVERITY_COLORS[severity]} text-white`}
    >
      {severity}
    </span>
  );
}

function ImpactBar({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-zinc-400 w-16 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
      <span className="text-[11px] text-zinc-300 font-mono w-8 text-right">
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}

function BuildingRow({
  impact,
  expanded,
  onToggle,
}: {
  impact: BuildingImpactResult;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border border-white/10 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors"
      >
        {expanded ? <ChevronDown size={14} className="text-zinc-400" /> : <ChevronRight size={14} className="text-zinc-400" />}
        <span className="flex-1 text-sm text-zinc-200 truncate">
          {impact.type || "unknown"} &middot;{" "}
          {Math.round(impact.distanceMeters)}m away
        </span>
        <SeverityBadge severity={impact.overallSeverity} />
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-1.5 border-t border-white/5 pt-2">
          <ImpactBar value={impact.shadowImpact} label="Shadow" color="bg-amber-500" />
          <ImpactBar value={impact.noiseImpact} label="Noise" color="bg-red-400" />
          <ImpactBar value={impact.viewObstruction} label="View" color="bg-blue-500" />
          <div className="text-[10px] text-zinc-500 mt-1">
            Height: {impact.height.toFixed(1)}m &middot; ID: {impact.buildingId.slice(0, 12)}
          </div>
        </div>
      )}
    </div>
  );
}

export default function StakeholderImpactPanel({
  analysis,
  visible,
  onClose,
  radius,
  onRadiusChange,
}: StakeholderImpactPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<ImpactSeverity | "all">("all");

  const filteredImpacts = useMemo(() => {
    if (!analysis) return [];
    if (filterSeverity === "all") return analysis.impacts.filter(i => i.overallSeverity !== "none");
    return analysis.impacts.filter((i) => i.overallSeverity === filterSeverity);
  }, [analysis, filterSeverity]);

  if (!visible) return null;

  const s = analysis?.summary;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900/95 backdrop-blur-md rounded-xl shadow-2xl border border-white/10 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-indigo-950/50 to-purple-950/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Users className="text-white" size={18} />
            </div>
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-tight">
                Stakeholder Impact Analysis
              </h2>
              <p className="text-[11px] text-zinc-400">
                {s
                  ? `${s.totalAffected} buildings within ${s.radiusMeters}m radius`
                  : "Place a building to analyze impact"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Radius selector */}
        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
          <span className="text-xs text-zinc-500 font-medium">Radius:</span>
          {([100, 250, 500] as ImpactRadius[]).map((r) => (
            <button
              key={r}
              onClick={() => onRadiusChange(r)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                radius === r
                  ? "bg-indigo-600 text-white"
                  : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
              }`}
            >
              {r}m
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {!analysis && (
            <div className="text-center py-12 text-zinc-500">
              <Building2 size={48} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium">No analysis available</p>
              <p className="text-xs mt-1">
                Place a building on the map to see stakeholder impact
              </p>
            </div>
          )}

          {analysis && s && (
            <div className="space-y-5">
              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <SummaryCard
                  icon={<Building2 size={16} />}
                  label="Residential"
                  value={s.residentialAffected}
                  color="text-blue-400"
                />
                <SummaryCard
                  icon={<Building2 size={16} />}
                  label="Commercial"
                  value={s.commercialAffected}
                  color="text-emerald-400"
                />
                <SummaryCard
                  icon={<Building2 size={16} />}
                  label="Institutional"
                  value={s.institutionalAffected}
                  color="text-purple-400"
                />
                <SummaryCard
                  icon={<Building2 size={16} />}
                  label="Other"
                  value={s.otherAffected}
                  color="text-zinc-400"
                />
              </div>

              {/* Key impact stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-amber-500/10 border border-amber-400/20 rounded-lg p-3 text-center">
                  <Sun size={18} className="mx-auto text-amber-400 mb-1" />
                  <p className="text-xl font-bold text-amber-300">
                    {s.significantSunlightLoss}
                  </p>
                  <p className="text-[10px] text-amber-400/70 uppercase font-bold">
                    Lose Sunlight
                  </p>
                </div>
                <div className="bg-red-500/10 border border-red-400/20 rounded-lg p-3 text-center">
                  <Volume2 size={18} className="mx-auto text-red-400 mb-1" />
                  <p className="text-xl font-bold text-red-300">
                    {s.highNoiseExposure}
                  </p>
                  <p className="text-[10px] text-red-400/70 uppercase font-bold">
                    High Noise
                  </p>
                </div>
                <div className="bg-blue-500/10 border border-blue-400/20 rounded-lg p-3 text-center">
                  <Eye size={18} className="mx-auto text-blue-400 mb-1" />
                  <p className="text-xl font-bold text-blue-300">
                    {s.highViewObstruction}
                  </p>
                  <p className="text-[10px] text-blue-400/70 uppercase font-bold">
                    View Blocked
                  </p>
                </div>
              </div>

              {/* Severity distribution */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                <h4 className="text-xs font-bold text-zinc-400 uppercase mb-2 flex items-center gap-2">
                  <AlertTriangle size={14} />
                  Impact Distribution
                </h4>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-4 bg-white/10 rounded-full overflow-hidden flex">
                    {s.totalAffected > 0 && (
                      <>
                        <div
                          className="bg-green-500 h-full"
                          style={{
                            width: `${(s.impactByCategory.low / s.totalAffected) * 100}%`,
                          }}
                        />
                        <div
                          className="bg-yellow-500 h-full"
                          style={{
                            width: `${(s.impactByCategory.medium / s.totalAffected) * 100}%`,
                          }}
                        />
                        <div
                          className="bg-red-500 h-full"
                          style={{
                            width: `${(s.impactByCategory.high / s.totalAffected) * 100}%`,
                          }}
                        />
                      </>
                    )}
                  </div>
                </div>
                <div className="flex justify-between mt-1.5 text-[10px] text-zinc-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Low: {s.impactByCategory.low}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-yellow-500" />
                    Medium: {s.impactByCategory.medium}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    High: {s.impactByCategory.high}
                  </span>
                </div>
              </div>

              {/* Filter + building list */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase">
                    Affected Buildings ({filteredImpacts.length})
                  </h4>
                  <div className="flex gap-1">
                    {(["all", "high", "medium", "low"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setFilterSeverity(f)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
                          filterSeverity === f
                            ? "bg-indigo-600 text-white"
                            : "bg-white/5 text-zinc-400 hover:bg-white/10"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5 max-h-60 overflow-y-auto custom-scrollbar">
                  {filteredImpacts.length === 0 ? (
                    <p className="text-sm text-zinc-500 text-center py-4">
                      No buildings match this filter
                    </p>
                  ) : (
                    filteredImpacts.slice(0, 50).map((imp) => (
                      <BuildingRow
                        key={imp.buildingId}
                        impact={imp}
                        expanded={expandedId === imp.buildingId}
                        onToggle={() =>
                          setExpandedId(
                            expandedId === imp.buildingId ? null : imp.buildingId
                          )
                        }
                      />
                    ))
                  )}
                  {filteredImpacts.length > 50 && (
                    <p className="text-xs text-zinc-500 text-center pt-2">
                      Showing top 50 of {filteredImpacts.length} buildings
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
      <div className={`${color} mx-auto mb-1 flex justify-center`}>{icon}</div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-zinc-500 uppercase font-bold">{label}</p>
    </div>
  );
}
