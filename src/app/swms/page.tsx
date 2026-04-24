'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// ─── Types ───────────────────────────────────────────────────────────────────

interface WorkActivity {
  id: string;
  label: string;
  description: string;
  keywords: string[];
  tmpRiskRefs: string[];
  alertActivityMatches: string[];
}

interface TmpRiskItem {
  id: string;
  category: string;
  hazard: string;
  consequence: string;
  preTreatmentRisk: { likelihood: string; consequence: number; rating: string };
  controls: string;
  residualRisk: { likelihood: string; consequence: number; rating: string };
  source: string;
}

interface SafetyPlanData {
  ppe: { section: string; requirement: string; standardItems: string[]; source: string };
  plant_and_equipment: {
    section: string;
    requirement: string;
    standardItems: string[];
    source: string;
  };
  trip_hazards: { section: string; requirement: string; source: string };
  key_roles: { role: string; responsibility: string }[];
}

interface BannerAlert {
  filename: string;
  folder: string;
  alert: {
    eqsafe_number: number;
    banner_colour: string;
    short_description: string;
    work_activity?: string;
    contributing_factors?: string[];
    corrective_actions?: string[];
    potential_consequence?: string;
    actual_consequence?: string;
    date_of_incident: string;
  };
}

interface SwmsData {
  version: string;
  work_activities: WorkActivity[];
  tmp_risk_register: TmpRiskItem[];
  safety_plan: SafetyPlanData;
  risk_matrix: {
    likelihood_labels: Record<string, string>;
    consequence_labels: Record<string, string>;
    rating_levels: Record<string, { level: string; colour: string }>;
  };
}

interface SwmsEntry {
  id: string;
  hazard: string;
  consequence: string;
  riskRating: string;
  controls: string;
  source: string;
  sourceType: 'tmp' | 'alert' | 'custom';
  sourceRef?: string;
  included: boolean;
}

// ─── Step enum ───────────────────────────────────────────────────────────────

type Step = 'activity' | 'hazards' | 'ppe' | 'review';

// ─── Component ───────────────────────────────────────────────────────────────

export default function SwmsBuilderPage() {
  // Data
  const [swmsData, setSwmsData] = useState<SwmsData | null>(null);
  const [bannerAlerts, setBannerAlerts] = useState<BannerAlert[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // Builder state
  const [step, setStep] = useState<Step>('activity');
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [swmsEntries, setSwmsEntries] = useState<SwmsEntry[]>([]);
  const [customHazard, setCustomHazard] = useState('');
  const [customControls, setCustomControls] = useState('');
  const [selectedPpe, setSelectedPpe] = useState<string[]>([]);
  const [jobTitle, setJobTitle] = useState('');
  const [location, setLocation] = useState('');
  const [company, setCompany] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ─── Load data ───────────────────────────────────────────────────────────

  useEffect(() => {
    async function loadData() {
      try {
        const [swmsRes, alertsRes] = await Promise.all([
          fetch('/data/swms-data.json'),
          fetch('/library/alerts-data/index.json'),
        ]);

        if (!swmsRes.ok) throw new Error('Failed to load SWMS data');
        const swmsJson: SwmsData = await swmsRes.json();
        setSwmsData(swmsJson);

        if (alertsRes.ok) {
          const alertsJson = await alertsRes.json();
          setBannerAlerts(alertsJson.documents || []);
        }
        // Alerts are optional — don't fail if unavailable
      } catch (err) {
        setDataError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setDataLoading(false);
      }
    }
    loadData();
  }, []);

  // ─── Generate SWMS entries from selected activities ─────────────────────

  const generateEntries = useCallback(() => {
    if (!swmsData) return;

    const entries: SwmsEntry[] = [];

    selectedActivities.forEach((activityId) => {
      const activity = swmsData.work_activities.find((a) => a.id === activityId);
      if (!activity) return;

      // Match TMP risk register items
      swmsData.tmp_risk_register.forEach((risk) => {
        const isMatch =
          activity.tmpRiskRefs.some((ref) => risk.id.startsWith(ref)) ||
          activity.keywords.some(
            (kw) =>
              risk.hazard.toLowerCase().includes(kw.toLowerCase()) ||
              risk.category.toLowerCase().includes(kw.toLowerCase())
          );

        if (isMatch) {
          // Avoid duplicates
          const existing = entries.find((e) => e.sourceRef === risk.id);
          if (!existing) {
            const ratingInfo = swmsData.risk_matrix.rating_levels[risk.preTreatmentRisk.rating];
            entries.push({
              id: `tmp-${risk.id}`,
              hazard: risk.hazard,
              consequence: risk.consequence,
              riskRating: `${ratingInfo?.level || 'Medium'} (${risk.preTreatmentRisk.rating})`,
              controls: risk.controls,
              source: risk.source,
              sourceType: 'tmp',
              sourceRef: risk.id,
              included: true,
            });
          }
        }
      });

      // Match banner alerts by work activity
      bannerAlerts.forEach((alert) => {
        const a = alert.alert;
        const isMatch =
          activity.alertActivityMatches.some(
            (m) =>
              a.work_activity?.toLowerCase().includes(m.toLowerCase()) ||
              a.short_description.toLowerCase().includes(m.toLowerCase())
          ) ||
          activity.keywords.some(
            (kw) =>
              a.work_activity?.toLowerCase().includes(kw.toLowerCase()) ||
              a.short_description.toLowerCase().includes(kw.toLowerCase()) ||
              a.contributing_factors?.some((f) => f.toLowerCase().includes(kw.toLowerCase()))
          );

        if (isMatch) {
          // Add contributing factors as hazards
          a.contributing_factors?.forEach((factor, i) => {
            entries.push({
              id: `alert-${a.eqsafe_number}-factor-${i}`,
              hazard: factor,
              consequence: a.potential_consequence || 'Serious injury or fatality',
              riskRating:
                a.banner_colour === 'red'
                  ? 'High'
                  : a.banner_colour === 'amber'
                    ? 'Medium'
                    : 'Medium',
              controls:
                a.corrective_actions?.join('; ') || 'Refer to banner alert corrective actions',
              source: `Banner Alert EQ#${a.eqsafe_number} (${a.banner_colour}) — ${new Date(a.date_of_incident).toLocaleDateString()}`,
              sourceType: 'alert',
              sourceRef: `eqsafe-${a.eqsafe_number}`,
              included: true,
            });
          });

          // Add corrective actions as controls
          if (a.corrective_actions && a.corrective_actions.length > 0) {
            a.corrective_actions.forEach((action, i) => {
              entries.push({
                id: `alert-${a.eqsafe_number}-action-${i}`,
                hazard: `Incident: ${a.short_description}`,
                consequence: a.potential_consequence || 'Serious injury or fatality',
                riskRating: a.banner_colour === 'red' ? 'High' : 'Medium',
                controls: action,
                source: `Banner Alert EQ#${a.eqsafe_number} (${a.banner_colour}) — ${new Date(a.date_of_incident).toLocaleDateString()}`,
                sourceType: 'alert',
                sourceRef: `eqsafe-${a.eqsafe_number}`,
                included: true,
              });
            });
          }
        }
      });
    });

    setSwmsEntries(entries);
  }, [swmsData, bannerAlerts, selectedActivities]);

  // Generate entries when activities change
  useEffect(() => {
    if (swmsData && selectedActivities.length > 0) {
      generateEntries();
    } else {
      setSwmsEntries([]);
    }
  }, [swmsData, selectedActivities, generateEntries]);

  // ─── Toggle activity ────────────────────────────────────────────────────

  const toggleActivity = (id: string) => {
    setSelectedActivities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  // ─── Add custom hazard ─────────────────────────────────────────────────

  const addCustomHazard = () => {
    if (!customHazard.trim()) return;
    setSwmsEntries((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        hazard: customHazard.trim(),
        consequence: 'To be assessed',
        riskRating: 'Medium',
        controls: customControls.trim() || 'To be determined',
        source: 'Custom entry',
        sourceType: 'custom',
        included: true,
      },
    ]);
    setCustomHazard('');
    setCustomControls('');
  };

  // ─── Toggle entry ──────────────────────────────────────────────────────

  const toggleEntry = (id: string) => {
    setSwmsEntries((prev) => prev.map((e) => (e.id === id ? { ...e, included: !e.included } : e)));
  };

  // ─── Toggle PPE ────────────────────────────────────────────────────────

  const togglePpe = (item: string) => {
    setSelectedPpe((prev) =>
      prev.includes(item) ? prev.filter((p) => p !== item) : [...prev, item]
    );
  };

  // ─── Filter activities by search ────────────────────────────────────────

  const filteredActivities =
    swmsData?.work_activities.filter((a) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        a.label.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.keywords.some((k) => k.toLowerCase().includes(q))
      );
    }) || [];

  // ─── Risk rating badge ──────────────────────────────────────────────────

  const RiskBadge = ({ rating }: { rating: string }) => {
    let colourClass = 'bg-amber-900/50 text-amber-400';
    if (
      rating.startsWith('High') ||
      rating.startsWith('Very High') ||
      rating.includes('H12') ||
      rating.includes('V16')
    )
      colourClass = 'bg-red-900/50 text-red-400';
    else if (rating.startsWith('Low') || rating.includes('L6') || rating.includes('L4'))
      colourClass = 'bg-green-900/50 text-green-400';
    return (
      <span className={`${colourClass} px-2 py-0.5 text-xs rounded font-medium`}>{rating}</span>
    );
  };

  // ─── Source badge ───────────────────────────────────────────────────────

  const SourceBadge = ({ type }: { type: 'tmp' | 'alert' | 'custom' }) => {
    const config = {
      tmp: { label: 'TMP', class: 'bg-blue-900/50 text-blue-400' },
      alert: { label: 'Alert', class: 'bg-amber-900/50 text-amber-400' },
      custom: { label: 'Custom', class: 'bg-gray-700 text-gray-300' },
    };
    const c = config[type];
    return <span className={`${c.class} px-2 py-0.5 text-xs rounded`}>{c.label}</span>;
  };

  // ─── Step indicator ─────────────────────────────────────────────────────

  const steps: { key: Step; num: number; label: string }[] = [
    { key: 'activity', num: 1, label: 'Activity' },
    { key: 'hazards', num: 2, label: 'Hazards' },
    { key: 'ppe', num: 3, label: 'PPE' },
    { key: 'review', num: 4, label: 'Review' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === step);

  // ─── Included entries for review ────────────────────────────────────────

  const includedEntries = swmsEntries.filter((e) => e.included);

  // ─── Loading ────────────────────────────────────────────────────────────

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Loading SWMS reference data...</p>
        </div>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <p className="text-2xl mb-3">⚠️</p>
          <p className="text-red-400 mb-2">Failed to load SWMS data</p>
          <p className="text-gray-500 text-sm">{dataError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-cyan-400 hover:text-cyan-300 text-sm">
              ← Home
            </Link>
            <h1 className="text-lg font-bold">SWMS Builder</h1>
          </div>
          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">TC Tools</span>
        </div>

        {/* Step indicator */}
        <div className="flex items-center px-4 pb-3 gap-1">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center flex-1">
              <button
                onClick={() => {
                  if (
                    i <= currentStepIndex ||
                    (s.key === 'hazards' && selectedActivities.length > 0)
                  )
                    setStep(s.key);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  step === s.key
                    ? 'bg-cyan-600 text-white'
                    : i < currentStepIndex
                      ? 'bg-cyan-900/30 text-cyan-400'
                      : 'bg-gray-800 text-gray-500'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                  {s.num}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < steps.length - 1 && <div className="w-2 h-px bg-gray-700 mx-1" />}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {/* STEP 1: Select Work Activity */}
        {step === 'activity' && (
          <div className="space-y-4">
            {/* Job details */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium text-cyan-400">Job Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Job Title</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Shoulder Repair - GSR"
                    className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Location / Road</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. GSR SLK 23.5"
                    className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Company</label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Main Roads WA"
                    className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* Search */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search work activities..."
              className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />

            {/* Activity cards */}
            <div className="space-y-2">
              <p className="text-xs text-gray-500">
                Select all work activities that apply. Hazards and controls will be auto-populated
                from TMP risk registers and banner alerts.
              </p>
              {filteredActivities.map((activity) => {
                const isSelected = selectedActivities.includes(activity.id);
                const alertCount = bannerAlerts.filter(
                  (a) =>
                    activity.alertActivityMatches.some(
                      (m) =>
                        a.alert.work_activity?.toLowerCase().includes(m.toLowerCase()) ||
                        a.alert.short_description.toLowerCase().includes(m.toLowerCase())
                    ) ||
                    activity.keywords.some(
                      (kw) =>
                        a.alert.work_activity?.toLowerCase().includes(kw.toLowerCase()) ||
                        a.alert.short_description.toLowerCase().includes(kw.toLowerCase())
                    )
                ).length;

                return (
                  <button
                    key={activity.id}
                    onClick={() => toggleActivity(activity.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      isSelected
                        ? 'bg-cyan-900/30 border-cyan-600'
                        : 'bg-gray-900 border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`w-5 h-5 rounded border flex items-center justify-center text-xs ${
                              isSelected
                                ? 'bg-cyan-600 border-cyan-600 text-white'
                                : 'border-gray-600'
                            }`}
                          >
                            {isSelected ? '✓' : ''}
                          </span>
                          <span className="font-medium text-sm">{activity.label}</span>
                        </div>
                        <p className="text-xs text-gray-400 ml-7">{activity.description}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {activity.tmpRiskRefs.length > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-400">
                            {activity.tmpRiskRefs.length} TMP risk
                            {activity.tmpRiskRefs.length > 1 ? 's' : ''}
                          </span>
                        )}
                        {alertCount > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-400">
                            {alertCount} alert{alertCount > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Continue button */}
            {selectedActivities.length > 0 && (
              <div className="sticky bottom-4">
                <button
                  onClick={() => setStep('hazards')}
                  className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-white font-medium text-sm transition-colors shadow-lg"
                >
                  Continue with {selectedActivities.length} activit
                  {selectedActivities.length > 1 ? 'ies' : 'y'} →
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Hazards & Controls */}
        {step === 'hazards' && (
          <div className="space-y-4">
            <button
              onClick={() => setStep('activity')}
              className="text-cyan-400 hover:text-cyan-300 text-sm"
            >
              ← Back to Activities
            </button>

            {/* Stats bar */}
            <div className="flex gap-3 text-xs">
              <div className="bg-gray-900 border border-gray-800 rounded px-3 py-2 flex-1 text-center">
                <span className="text-blue-400 font-bold">
                  {swmsEntries.filter((e) => e.sourceType === 'tmp').length}
                </span>
                <span className="text-gray-500 ml-1">TMP</span>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded px-3 py-2 flex-1 text-center">
                <span className="text-amber-400 font-bold">
                  {swmsEntries.filter((e) => e.sourceType === 'alert').length}
                </span>
                <span className="text-gray-500 ml-1">Alerts</span>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded px-3 py-2 flex-1 text-center">
                <span className="text-gray-300 font-bold">
                  {swmsEntries.filter((e) => e.sourceType === 'custom').length}
                </span>
                <span className="text-gray-500 ml-1">Custom</span>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded px-3 py-2 flex-1 text-center">
                <span className="text-cyan-400 font-bold">{includedEntries.length}</span>
                <span className="text-gray-500 ml-1">Included</span>
              </div>
            </div>

            {/* Auto-populated entries */}
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-2">
                Auto-Populated Hazards &amp; Controls
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Matched from TMP risk register and banner alerts. Tap to include/exclude.
              </p>
              <div className="space-y-2">
                {swmsEntries.map((entry) => (
                  <div
                    key={entry.id}
                    onClick={() => toggleEntry(entry.id)}
                    className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                      entry.included
                        ? entry.sourceType === 'tmp'
                          ? 'bg-blue-950/30 border-blue-800'
                          : entry.sourceType === 'alert'
                            ? 'bg-amber-950/30 border-amber-800'
                            : 'bg-gray-900 border-gray-800'
                        : 'bg-gray-900/50 border-gray-800 opacity-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                            entry.included
                              ? 'bg-cyan-600 border-cyan-600 text-white'
                              : 'border-gray-600'
                          }`}
                        >
                          {entry.included ? '✓' : ''}
                        </span>
                        <SourceBadge type={entry.sourceType} />
                        <RiskBadge rating={entry.riskRating} />
                      </div>
                    </div>
                    <p className="text-sm text-white ml-6 mb-1">
                      <span className="text-gray-400 text-xs">Hazard: </span>
                      {entry.hazard}
                    </p>
                    <p className="text-xs text-gray-400 ml-6 mb-1">
                      <span className="text-gray-500">Consequence: </span>
                      {entry.consequence}
                    </p>
                    <p className="text-xs text-green-400 ml-6 mb-1">
                      <span className="text-green-600">Controls: </span>
                      {entry.controls.length > 200
                        ? entry.controls.substring(0, 200) + '...'
                        : entry.controls}
                    </p>
                    <p className="text-[10px] text-gray-600 ml-6">{entry.source}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Add custom hazard */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium text-gray-300">Add Custom Hazard</h3>
              <input
                type="text"
                value={customHazard}
                onChange={(e) => setCustomHazard(e.target.value)}
                placeholder="Describe the hazard..."
                className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <textarea
                value={customControls}
                onChange={(e) => setCustomControls(e.target.value)}
                placeholder="Control measures..."
                rows={2}
                className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none"
              />
              <button
                onClick={addCustomHazard}
                disabled={!customHazard.trim()}
                className="w-full py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded text-sm text-white transition-colors"
              >
                + Add Custom Hazard
              </button>
            </div>

            {/* Continue */}
            <div className="sticky bottom-4 flex gap-3">
              <button
                onClick={() => setStep('ppe')}
                className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-white font-medium text-sm transition-colors shadow-lg"
              >
                Continue to PPE →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: PPE & Safety */}
        {step === 'ppe' && swmsData && (
          <div className="space-y-4">
            <button
              onClick={() => setStep('hazards')}
              className="text-cyan-400 hover:text-cyan-300 text-sm"
            >
              ← Back to Hazards
            </button>

            {/* PPE selection */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium text-cyan-400">Personal Protective Equipment</h3>
              <p className="text-xs text-gray-500">
                Per TMP Section 6.3, the following PPE is mandatory. Select additional site-specific
                requirements.
              </p>
              <div className="space-y-1.5">
                {swmsData.safety_plan.ppe.standardItems.map((item) => {
                  const isMandatory =
                    item.toLowerCase().includes('high visibility') ||
                    item.toLowerCase().includes('protective footwear');
                  const isSelected = isMandatory || selectedPpe.includes(item);
                  return (
                    <button
                      key={item}
                      onClick={() => !isMandatory && togglePpe(item)}
                      disabled={isMandatory}
                      className={`w-full text-left p-2.5 rounded border text-sm transition-colors ${
                        isSelected
                          ? 'bg-green-900/30 border-green-800 text-green-300'
                          : 'bg-gray-800 border-gray-700 text-gray-400'
                      } ${isMandatory ? 'opacity-80' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                            isSelected
                              ? 'bg-green-600 border-green-600 text-white'
                              : 'border-gray-600'
                          }`}
                        >
                          {isSelected ? '✓' : ''}
                        </span>
                        <span className="flex-1">{item}</span>
                        {isMandatory && <span className="text-[10px] text-red-400">MANDATORY</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Plant & Equipment */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium text-blue-400">
                Plant &amp; Equipment Requirements
              </h3>
              <p className="text-xs text-gray-500">Per TMP Section 6.4:</p>
              <ul className="space-y-1.5">
                {swmsData.safety_plan.plant_and_equipment.standardItems.map((item) => (
                  <li key={item} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5 shrink-0">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Trip hazards */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium text-amber-400">Trip Hazard Controls</h3>
              <p className="text-xs text-gray-400">
                {swmsData.safety_plan.trip_hazards.requirement}
              </p>
              <p className="text-[10px] text-gray-600">
                {swmsData.safety_plan.trip_hazards.source}
              </p>
            </div>

            {/* Key Roles */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium text-purple-400">
                Key Roles &amp; Responsibilities
              </h3>
              <div className="space-y-2">
                {swmsData.safety_plan.key_roles.map((role) => (
                  <div key={role.role} className="text-sm">
                    <span className="text-white font-medium">{role.role}</span>
                    <p className="text-xs text-gray-400 mt-0.5">{role.responsibility}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Continue */}
            <div className="sticky bottom-4">
              <button
                onClick={() => setStep('review')}
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-white font-medium text-sm transition-colors shadow-lg"
              >
                Review SWMS →
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Review */}
        {step === 'review' && swmsData && (
          <div className="space-y-4">
            <button
              onClick={() => setStep('ppe')}
              className="text-cyan-400 hover:text-cyan-300 text-sm"
            >
              ← Back to PPE
            </button>

            {/* Summary header */}
            <div className="bg-gray-900 border border-cyan-800/50 rounded-lg p-4">
              <h2 className="text-lg font-bold text-cyan-400 mb-3">Safe Work Method Statement</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500 text-xs">Job Title</span>
                  <p className="text-white">{jobTitle || 'Not specified'}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">Location</span>
                  <p className="text-white">{location || 'Not specified'}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">Company</span>
                  <p className="text-white">{company || 'Not specified'}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">Activities</span>
                  <p className="text-white">
                    {selectedActivities
                      .map((id) => swmsData.work_activities.find((a) => a.id === id)?.label)
                      .join(', ')}
                  </p>
                </div>
              </div>
            </div>

            {/* Hazards table */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800">
                <h3 className="text-sm font-medium text-white">
                  Hazard Identification &amp; Controls ({includedEntries.length} items)
                </h3>
              </div>
              <div className="divide-y divide-gray-800">
                {includedEntries.map((entry, i) => (
                  <div key={entry.id} className="px-4 py-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 font-mono w-6">#{i + 1}</span>
                      <SourceBadge type={entry.sourceType} />
                      <RiskBadge rating={entry.riskRating} />
                    </div>
                    <div className="ml-6">
                      <p className="text-sm">
                        <span className="text-red-400 text-xs font-medium">Hazard: </span>
                        <span className="text-white">{entry.hazard}</span>
                      </p>
                      <p className="text-xs">
                        <span className="text-gray-500">Consequence: </span>
                        <span className="text-gray-300">{entry.consequence}</span>
                      </p>
                      <p className="text-xs">
                        <span className="text-green-600 font-medium">Controls: </span>
                        <span className="text-green-400">{entry.controls}</span>
                      </p>
                      <p className="text-[10px] text-gray-600 mt-1">{entry.source}</p>
                    </div>
                  </div>
                ))}
                {includedEntries.length === 0 && (
                  <div className="px-4 py-8 text-center text-gray-500 text-sm">
                    No hazards included. Go back and select hazards.
                  </div>
                )}
              </div>
            </div>

            {/* PPE summary */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-green-400 mb-2">PPE Requirements</h3>
              <div className="flex flex-wrap gap-2">
                {swmsData.safety_plan.ppe.standardItems
                  .filter((item) => {
                    const isMandatory =
                      item.toLowerCase().includes('high visibility') ||
                      item.toLowerCase().includes('protective footwear');
                    return isMandatory || selectedPpe.includes(item);
                  })
                  .map((item) => (
                    <span
                      key={item}
                      className="text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded"
                    >
                      {item}
                    </span>
                  ))}
              </div>
            </div>

            {/* Source traceability */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-purple-400 mb-2">Source Traceability</h3>
              <div className="space-y-2 text-xs">
                {(() => {
                  const tmpSources = [
                    ...new Set(
                      includedEntries
                        .filter((e) => e.sourceType === 'tmp')
                        .map((e) => e.sourceRef?.split('.').slice(0, 3).join('.'))
                        .filter(Boolean)
                    ),
                  ];
                  const alertSources = [
                    ...new Set(
                      includedEntries
                        .filter((e) => e.sourceType === 'alert')
                        .map((e) => e.sourceRef)
                    ),
                  ];
                  return (
                    <>
                      {tmpSources.length > 0 && (
                        <div>
                          <span className="text-blue-400">TMP Risk Register Sections: </span>
                          <span className="text-gray-300">{tmpSources.join(', ')}</span>
                        </div>
                      )}
                      {alertSources.length > 0 && (
                        <div>
                          <span className="text-amber-400">Banner Alerts Referenced: </span>
                          <span className="text-gray-300">{alertSources.join(', ')}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-purple-400">Reference Standards: </span>
                        <span className="text-gray-300">
                          AGTTM, MRWA CoP, AS 1742.3, AS/NZS 4602, AS/NZS 2210
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Action buttons */}
            <div className="sticky bottom-4 space-y-2">
              <button
                onClick={() => setShowPreview(true)}
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-white font-medium text-sm transition-colors shadow-lg"
              >
                Preview Full SWMS
              </button>
              <p className="text-center text-[10px] text-gray-600">
                Draft SWMS for guidance only. Must be reviewed and approved by a competent person
                before use.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Full Preview Modal */}
      {showPreview && swmsData && (
        <div className="fixed inset-0 z-50 bg-black/80 overflow-y-auto">
          <div className="max-w-2xl mx-auto bg-gray-900 min-h-screen">
            {/* Preview header */}
            <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between z-10">
              <h2 className="text-sm font-bold text-white">SWMS Preview</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 rounded text-xs text-white"
                >
                  Print
                </button>
                <button
                  onClick={() => setShowPreview(false)}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Preview content */}
            <div className="p-6 space-y-6">
              {/* Title */}
              <div className="text-center border-b border-gray-800 pb-4">
                <h1 className="text-xl font-bold text-white mb-1">SAFE WORK METHOD STATEMENT</h1>
                <p className="text-xs text-gray-500">
                  High Risk Construction Work — Traffic Management
                </p>
              </div>

              {/* Job details */}
              <div className="grid grid-cols-2 gap-4 text-sm border border-gray-800 rounded p-4">
                <div>
                  <span className="text-gray-500 text-xs">Job Title:</span>
                  <p className="text-white font-medium">{jobTitle || '—'}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">Location:</span>
                  <p className="text-white font-medium">{location || '—'}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">Company:</span>
                  <p className="text-white font-medium">{company || '—'}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">Date:</span>
                  <p className="text-white font-medium">{new Date().toLocaleDateString()}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500 text-xs">Work Activities:</span>
                  <p className="text-white font-medium">
                    {selectedActivities
                      .map((id) => swmsData.work_activities.find((a) => a.id === id)?.label)
                      .join('; ')}
                  </p>
                </div>
              </div>

              {/* Risk table */}
              <div>
                <h2 className="text-base font-bold text-cyan-400 mb-3">
                  Risk Identification &amp; Control Measures
                </h2>
                <div className="space-y-4">
                  {includedEntries.map((entry, i) => (
                    <div
                      key={entry.id}
                      className="border border-gray-800 rounded p-3 text-sm space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">#{i + 1}</span>
                        <div className="flex gap-1.5">
                          <SourceBadge type={entry.sourceType} />
                          <RiskBadge rating={entry.riskRating} />
                        </div>
                      </div>
                      <div>
                        <span className="text-red-400 font-medium text-xs">Hazard:</span>
                        <p className="text-white">{entry.hazard}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 font-medium text-xs">
                          Potential Consequence:
                        </span>
                        <p className="text-gray-300">{entry.consequence}</p>
                      </div>
                      <div>
                        <span className="text-green-400 font-medium text-xs">
                          Control Measures:
                        </span>
                        <p className="text-green-300">{entry.controls}</p>
                      </div>
                      <p className="text-[10px] text-gray-600 border-t border-gray-800 pt-1">
                        Source: {entry.source}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* PPE */}
              <div>
                <h2 className="text-base font-bold text-green-400 mb-3">PPE Requirements</h2>
                <div className="flex flex-wrap gap-2">
                  {swmsData.safety_plan.ppe.standardItems
                    .filter((item) => {
                      const isMandatory =
                        item.toLowerCase().includes('high visibility') ||
                        item.toLowerCase().includes('protective footwear');
                      return isMandatory || selectedPpe.includes(item);
                    })
                    .map((item) => (
                      <span
                        key={item}
                        className="text-xs bg-green-900/30 text-green-400 border border-green-900/50 px-2 py-1 rounded"
                      >
                        {item}
                      </span>
                    ))}
                </div>
              </div>

              {/* Plant & Equipment */}
              <div>
                <h2 className="text-base font-bold text-blue-400 mb-3">
                  Plant &amp; Equipment Requirements
                </h2>
                <ul className="space-y-1.5 text-sm">
                  {swmsData.safety_plan.plant_and_equipment.standardItems.map((item) => (
                    <li key={item} className="text-gray-300 flex items-start gap-2">
                      <span className="text-blue-400 shrink-0">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Roles */}
              <div>
                <h2 className="text-base font-bold text-purple-400 mb-3">Key Responsibilities</h2>
                <div className="space-y-2 text-sm">
                  {swmsData.safety_plan.key_roles.map((role) => (
                    <div key={role.role}>
                      <span className="text-white font-medium">{role.role}:</span>{' '}
                      <span className="text-gray-400">{role.responsibility}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sign off */}
              <div className="border-t border-gray-800 pt-4 space-y-3">
                <h2 className="text-base font-bold text-white mb-3">Sign-Off</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border border-gray-800 rounded p-3">
                    <span className="text-xs text-gray-500">Prepared by:</span>
                    <div className="border-b border-gray-600 mt-4 mb-1" />
                    <span className="text-xs text-gray-600">Name / Signature / Date</span>
                  </div>
                  <div className="border border-gray-800 rounded p-3">
                    <span className="text-xs text-gray-500">Reviewed by:</span>
                    <div className="border-b border-gray-600 mt-4 mb-1" />
                    <span className="text-xs text-gray-600">Name / Signature / Date</span>
                  </div>
                  <div className="border border-gray-800 rounded p-3">
                    <span className="text-xs text-gray-500">Approved by:</span>
                    <div className="border-b border-gray-600 mt-4 mb-1" />
                    <span className="text-xs text-gray-600">Name / Signature / Date</span>
                  </div>
                  <div className="border border-gray-800 rounded p-3">
                    <span className="text-xs text-gray-500">Site Induction:</span>
                    <div className="border-b border-gray-600 mt-4 mb-1" />
                    <span className="text-xs text-gray-600">All workers to sign</span>
                  </div>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="bg-amber-900/20 border border-amber-800/50 rounded p-3 text-xs text-amber-400">
                <strong>Disclaimer:</strong> This SWMS is auto-generated from MRWA reference data
                and must be reviewed by a competent person before implementation. It does not
                replace site-specific risk assessments. All workers must be inducted and understand
                the controls before commencing work.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
