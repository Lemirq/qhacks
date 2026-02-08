"use client";

import { useState } from "react";
import {
  X,
  Leaf,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TreePine,
  Wind,
  Droplets,
  Users,
  Car,
  Volume2,
  DollarSign,
  MapPin,
  Download,
  Loader2,
} from "lucide-react";

interface PlacedBuilding {
  id: string;
  lat: number;
  lng: number;
  scale: { x: number; y: number; z: number };
  position: { x: number; y: number; z: number };
}

interface BuildingImpact {
  id: string;
  coordinates: { lat: number; lng: number };
  locationDescription: string;
  environmentalImpact: {
    carbonFootprint: string;
    habitatDisruption: string;
    waterImpact: string;
    airQuality: string;
  };
  societalImpact: {
    trafficIncrease: string;
    noiseLevel: string;
    communityEffect: string;
    economicImpact: string;
  };
  riskLevel: "low" | "medium" | "high";
  mitigationMeasures: string[];
}

interface OverallImpact {
  environmentalScore: number;
  societalScore: number;
  sustainabilityRating: string;
  totalCarbonTonnes: number;
  treesRequired: number;
}

interface EnvironmentalReport {
  summary: string;
  buildings: BuildingImpact[];
  overallImpact: OverallImpact;
  recommendations: string[];
}

export interface MetricsSnapshot {
  timelineDate: string;
  co2Emissions: number;
  energyConsumption: number;
  waterUsage: number;
  totalFootprint: number;
  materialComplexity: string;
  sustainabilityScore: number;
  populationHappiness: number;
  avgDb: number;
  activeCount: number;
}

interface EnvironmentalReportModalProps {
  visible: boolean;
  onClose: () => void;
  buildings: PlacedBuilding[];
  /** Snapshot of metrics at current timeline when report is generated */
  snapshot?: MetricsSnapshot | null;
}

export default function EnvironmentalReportModal({
  visible,
  onClose,
  buildings,
  snapshot = null,
}: EnvironmentalReportModalProps) {
  const [report, setReport] = useState<EnvironmentalReport | null>(null);
  const [reportSnapshotDate, setReportSnapshotDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBuildingIndex, setSelectedBuildingIndex] = useState(0);

  const generateReport = async () => {
    if (buildings.length === 0) {
      setError("No buildings active at the current timeline date. Move the timeline to a date with active construction.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/environmental-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buildings, snapshot: snapshot ?? undefined }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate report");
      }

      const data = await response.json();
      setReport(data.report);
      setReportSnapshotDate(data.snapshotDate ?? snapshot?.timelineDate ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!report) return;

    const asOfLabel = reportSnapshotDate
      ? `Report snapshot as of: ${new Date(reportSnapshotDate).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}`
      : "";
    const reportText = `
ENVIRONMENTAL IMPACT ASSESSMENT REPORT
${asOfLabel ? asOfLabel + "\n" : ""}Generated: ${new Date().toLocaleDateString()}
Location: Kingston, Ontario, Canada

================================================================================
EXECUTIVE SUMMARY
================================================================================
${report.summary}

================================================================================
OVERALL IMPACT SCORES
================================================================================
Environmental Score: ${report.overallImpact.environmentalScore}/100
Societal Score: ${report.overallImpact.societalScore}/100
Sustainability Rating: ${report.overallImpact.sustainabilityRating}
Total Carbon Impact: ${report.overallImpact.totalCarbonTonnes} tonnes CO2
Trees Required for Offset: ${report.overallImpact.treesRequired} trees

================================================================================
INDIVIDUAL BUILDING ASSESSMENTS
================================================================================
${report.buildings
  .map(
    (b, i) => `
BUILDING ${i + 1}: ${b.id}
Coordinates: ${b.coordinates.lat.toFixed(6)}°N, ${b.coordinates.lng.toFixed(6)}°W
Location: ${b.locationDescription}
Risk Level: ${b.riskLevel.toUpperCase()}

Environmental Impact:
- Carbon Footprint: ${b.environmentalImpact.carbonFootprint}
- Habitat Disruption: ${b.environmentalImpact.habitatDisruption}
- Water Impact: ${b.environmentalImpact.waterImpact}
- Air Quality: ${b.environmentalImpact.airQuality}

Societal Impact:
- Traffic: ${b.societalImpact.trafficIncrease}
- Noise: ${b.societalImpact.noiseLevel}
- Community: ${b.societalImpact.communityEffect}
- Economic: ${b.societalImpact.economicImpact}

Mitigation Measures:
${b.mitigationMeasures.map((m) => `- ${m}`).join("\n")}
`
  )
  .join("\n")}

================================================================================
RECOMMENDATIONS
================================================================================
${report.recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")}

================================================================================
END OF REPORT
================================================================================
`;

    const blob = new Blob([reportText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `environmental-report-${reportSnapshotDate ? reportSnapshotDate : new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!visible) return null;

  const getRiskColor = (level: "low" | "medium" | "high") => {
    switch (level) {
      case "low":
        return "text-green-500 bg-green-500/10 border-green-500/30";
      case "medium":
        return "text-amber-500 bg-amber-500/10 border-amber-500/30";
      case "high":
        return "text-red-500 bg-red-500/10 border-red-500/30";
    }
  };

  const getRiskIcon = (level: "low" | "medium" | "high") => {
    switch (level) {
      case "low":
        return <CheckCircle size={16} />;
      case "medium":
        return <AlertTriangle size={16} />;
      case "high":
        return <XCircle size={16} />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-amber-500";
    return "text-red-500";
  };

  const selectedBuilding = report?.buildings[selectedBuildingIndex];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center">
              <Leaf className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                Environmental Impact Assessment
              </h2>
              <p className="text-xs text-slate-500">
                Kingston, Ontario Development Analysis
                {reportSnapshotDate && (
                  <span className="block mt-0.5 text-green-700 font-medium">
                    Report snapshot as of {new Date(reportSnapshotDate).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {report && (
              <button
                onClick={exportReport}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 text-sm font-medium transition-colors"
              >
                <Download size={16} />
                Export Report
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {!report && !loading && !error && (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
                <TreePine className="text-green-600" size={40} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                Generate Environmental Impact Report
              </h3>
              <p className="text-slate-500 mb-6 max-w-md mx-auto">
                {snapshot
                  ? `Generate a report using the current timeline snapshot (${new Date(snapshot.timelineDate).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}). Metrics and ${buildings.length} active building${buildings.length !== 1 ? "s" : ""} will be captured at this exact time.`
                  : `Analyze the environmental and societal impact of ${buildings.length} proposed building${buildings.length !== 1 ? "s" : ""} at their specific GPS coordinates in Kingston, Ontario.`}
              </p>
              <button
                onClick={generateReport}
                disabled={buildings.length === 0}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-colors"
              >
                {buildings.length === 0
                  ? "No Buildings to Analyze"
                  : "Generate Impact Report"}
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 mx-auto mb-4 text-green-600 animate-spin" />
              <p className="text-slate-600 font-medium">
                Analyzing environmental and societal impacts...
              </p>
              <p className="text-slate-400 text-sm mt-2">
                This may take a few moments
              </p>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="text-red-500" size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">
                Report Generation Failed
              </h3>
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={generateReport}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {report && (
            <div className="space-y-6">
              {/* Summary Section */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <h3 className="text-sm font-bold text-slate-700 uppercase mb-2">
                  Executive Summary
                </h3>
                <p className="text-slate-600">{report.summary}</p>
              </div>

              {/* Overall Scores */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white rounded-lg p-4 border border-slate-200 text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Environmental
                  </p>
                  <p className={`text-2xl font-bold ${getScoreColor(report.overallImpact.environmentalScore)}`}>
                    {report.overallImpact.environmentalScore}
                  </p>
                  <p className="text-[10px] text-slate-400">/ 100</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-slate-200 text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Societal
                  </p>
                  <p className={`text-2xl font-bold ${getScoreColor(report.overallImpact.societalScore)}`}>
                    {report.overallImpact.societalScore}
                  </p>
                  <p className="text-[10px] text-slate-400">/ 100</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-slate-200 text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Rating
                  </p>
                  <p className="text-lg font-bold text-slate-800">
                    {report.overallImpact.sustainabilityRating.split(" ")[0]}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-slate-200 text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Carbon Impact
                  </p>
                  <p className="text-lg font-bold text-orange-600">
                    {report.overallImpact.totalCarbonTonnes.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-400">tonnes CO2</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-slate-200 text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Trees Needed
                  </p>
                  <p className="text-lg font-bold text-green-600">
                    {report.overallImpact.treesRequired.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-400">for offset</p>
                </div>
              </div>

              {/* Building Selector */}
              {report.buildings.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {report.buildings.map((b, i) => (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBuildingIndex(i)}
                      className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedBuildingIndex === i
                          ? "bg-green-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      Building {i + 1}
                    </button>
                  ))}
                </div>
              )}

              {/* Selected Building Details */}
              {selectedBuilding && (
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                  {/* Building Header */}
                  <div className="bg-slate-50 p-4 border-b border-slate-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin size={16} className="text-slate-400" />
                          <span className="text-sm font-mono text-slate-600">
                            {selectedBuilding.coordinates.lat.toFixed(6)}°N,{" "}
                            {Math.abs(selectedBuilding.coordinates.lng).toFixed(6)}°W
                          </span>
                        </div>
                        <p className="text-slate-700">
                          {selectedBuilding.locationDescription}
                        </p>
                      </div>
                      <div
                        className={`px-3 py-1.5 rounded-lg border font-bold text-xs uppercase flex items-center gap-1.5 ${getRiskColor(
                          selectedBuilding.riskLevel
                        )}`}
                      >
                        {getRiskIcon(selectedBuilding.riskLevel)}
                        {selectedBuilding.riskLevel} Risk
                      </div>
                    </div>
                  </div>

                  {/* Impact Details */}
                  <div className="p-4 grid md:grid-cols-2 gap-4">
                    {/* Environmental Impact */}
                    <div>
                      <h4 className="text-sm font-bold text-green-700 uppercase mb-3 flex items-center gap-2">
                        <Leaf size={16} />
                        Environmental Impact
                      </h4>
                      <div className="space-y-3">
                        <ImpactItem
                          icon={<Wind size={14} />}
                          label="Carbon Footprint"
                          value={selectedBuilding.environmentalImpact.carbonFootprint}
                        />
                        <ImpactItem
                          icon={<TreePine size={14} />}
                          label="Habitat Disruption"
                          value={selectedBuilding.environmentalImpact.habitatDisruption}
                        />
                        <ImpactItem
                          icon={<Droplets size={14} />}
                          label="Water Impact"
                          value={selectedBuilding.environmentalImpact.waterImpact}
                        />
                        <ImpactItem
                          icon={<Wind size={14} />}
                          label="Air Quality"
                          value={selectedBuilding.environmentalImpact.airQuality}
                        />
                      </div>
                    </div>

                    {/* Societal Impact */}
                    <div>
                      <h4 className="text-sm font-bold text-blue-700 uppercase mb-3 flex items-center gap-2">
                        <Users size={16} />
                        Societal Impact
                      </h4>
                      <div className="space-y-3">
                        <ImpactItem
                          icon={<Car size={14} />}
                          label="Traffic"
                          value={selectedBuilding.societalImpact.trafficIncrease}
                        />
                        <ImpactItem
                          icon={<Volume2 size={14} />}
                          label="Noise Level"
                          value={selectedBuilding.societalImpact.noiseLevel}
                        />
                        <ImpactItem
                          icon={<Users size={14} />}
                          label="Community Effect"
                          value={selectedBuilding.societalImpact.communityEffect}
                        />
                        <ImpactItem
                          icon={<DollarSign size={14} />}
                          label="Economic Impact"
                          value={selectedBuilding.societalImpact.economicImpact}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Mitigation Measures */}
                  <div className="p-4 bg-amber-50 border-t border-amber-200">
                    <h4 className="text-sm font-bold text-amber-700 uppercase mb-2 flex items-center gap-2">
                      <AlertTriangle size={16} />
                      Recommended Mitigation Measures
                    </h4>
                    <ul className="space-y-1">
                      {selectedBuilding.mitigationMeasures.map((measure, i) => (
                        <li key={i} className="text-sm text-amber-800 flex items-start gap-2">
                          <span className="text-amber-500 mt-0.5">-</span>
                          {measure}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Recommendations */}
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <h3 className="text-sm font-bold text-green-800 uppercase mb-3 flex items-center gap-2">
                  <CheckCircle size={16} />
                  Strategic Recommendations
                </h3>
                <ol className="space-y-2">
                  {report.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-green-700 flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-600 text-white text-xs flex items-center justify-center font-bold">
                        {i + 1}
                      </span>
                      {rec}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ImpactItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
      <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase mb-1">
        {icon}
        {label}
      </div>
      <p className="text-sm text-slate-700">{value}</p>
    </div>
  );
}
