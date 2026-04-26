'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Lazy load PDF viewer to reduce initial bundle
const PdfViewerModal = dynamic(
  () => import('@/components/PdfViewerModal').then((mod) => mod.PdfViewerModal),
  {
    ssr: false,
    loading: () => <div className="p-4 text-center text-gray-400">Loading PDF viewer...</div>,
  }
);

// ── Types ──────────────────────────────────────────────────────────────
interface TcRelevance {
  classification: 'direct' | 'indirect';
  subcategory: string;
  reasoning: string;
}

interface ThreePillarsAssessment {
  pillars: {
    conditions_changed_mid_job: boolean;
    crew_competency_gaps: boolean;
    plan_adequacy_failures: boolean;
    equipment_issues: boolean;
    paperwork_vs_reality_gap: boolean;
  };
  relevance_score: number;
}

interface BannerAlert {
  filename: string;
  folder: string;
  original_filename: string;
  upload_date: string;
  alert: {
    banner_colour: string;
    notice_type: string;
    eqsafe_number: number;
    date_of_incident: string;
    time_of_incident?: string;
    directorates?: string;
    main_roads_or_contractor?: string;
    event_type?: string;
    actual_consequence?: string;
    potential_consequence?: string;
    short_description: string;
    road?: string | null;
    slk?: string | number | null;
    work_activity?: string;
    injury_type?: string;
    is_lti?: boolean;
    investigation_type?: string | null;
    investigation_status?: string;
    contributing_factors?: string[];
    corrective_actions?: string[];
    key_details?: string[];
    critical_risk_profile?: string;
    worksafe_notified?: boolean;
    tc_relevance?: TcRelevance;
  };
  linked_grey_banner?: string | null;
  linked_red_banner?: string | null;
  status: string;
  three_pillars_assessment?: ThreePillarsAssessment;
}

interface AlertIndex {
  version: string;
  description: string;
  last_updated: string;
  documents: BannerAlert[];
}

// ── Filter / Sort Types ───────────────────────────────────────────────
type BannerFilter = 'all' | 'red' | 'amber' | 'grey';
type TcFilter = 'all' | 'direct' | 'indirect';
type SortOption = 'newest' | 'oldest' | 'relevance_desc' | 'relevance_asc' | 'subcategory';
type ViewMode = 'standard' | 'framework';

// ── Subcategory config ────────────────────────────────────────────────
const SUBCATEGORY_LABELS: Record<string, string> = {
  mop_breach: 'MoP Breach',
  tm_breach: 'TM Breach',
  tc_injured: 'TC Injured',
  tc_equipment: 'TC Equipment',
  tm_setup: 'TM Setup',
  journey: 'Journey',
  equipment_tool: 'Equipment/Tool',
  slip_trip: 'Slip/Trip',
  manual_handling: 'Manual Handling',
  fitness_for_duty: 'Fitness for Duty',
  mechanical: 'Mechanical',
  road_furniture: 'Road Furniture',
  construction: 'Construction',
  vehicle_incident: 'Vehicle Incident',
  utility_strike: 'Utility Strike',
  environmental: 'Environmental',
};

const DIRECT_SUBCATEGORIES = ['mop_breach', 'tm_breach', 'tc_injured', 'tc_equipment', 'tm_setup'];
const INDIRECT_SUBCATEGORIES = [
  'journey',
  'equipment_tool',
  'slip_trip',
  'manual_handling',
  'fitness_for_duty',
  'mechanical',
  'road_furniture',
  'construction',
  'vehicle_incident',
  'utility_strike',
  'environmental',
];

// ── Pillar config ─────────────────────────────────────────────────────
const PILLAR_META: {
  key: keyof ThreePillarsAssessment['pillars'];
  label: string;
  short: string;
  color: string;
}[] = [
  { key: 'crew_competency_gaps', label: 'Crew Competency', short: 'Crew', color: 'bg-blue-500' },
  { key: 'plan_adequacy_failures', label: 'Plan Adequacy', short: 'Plan', color: 'bg-purple-500' },
  { key: 'equipment_issues', label: 'Right Equipment', short: 'Equip', color: 'bg-amber-500' },
  {
    key: 'paperwork_vs_reality_gap',
    label: 'Paperwork vs Reality',
    short: 'Gap',
    color: 'bg-rose-500',
  },
  {
    key: 'conditions_changed_mid_job',
    label: 'Conditions Changed',
    short: 'Change',
    color: 'bg-emerald-500',
  },
];

// ── Helper: format subcategory ────────────────────────────────────────
function subcatLabel(key: string): string {
  return SUBCATEGORY_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Component ─────────────────────────────────────────────────────────
export default function AlertsPage() {
  const [alertData, setAlertData] = useState<AlertIndex | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [bannerFilter, setBannerFilter] = useState<BannerFilter>('all');
  const [tcFilter, setTcFilter] = useState<TcFilter>('all');
  const [subcatFilter, setSubcatFilter] = useState<string>('all');
  const [ltiOnly, setLtiOnly] = useState(false);
  const [activeOnly, setActiveOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Sort & view
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('standard');

  // Detail / PDF
  const [selectedAlert, setSelectedAlert] = useState<BannerAlert | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showPdf, setShowPdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfTitle, setPdfTitle] = useState('');

  // ── Load data ─────────────────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch('/library/alerts-data/index.json');
        if (!response.ok) throw new Error('Failed to load alert data');
        const data: AlertIndex = await response.json();
        setAlertData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load alert data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // ── Computed: subcategory counts ──────────────────────────────────
  const subcatCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    alertData?.documents.forEach((d) => {
      const sc = d.alert.tc_relevance?.subcategory;
      if (sc) counts[sc] = (counts[sc] || 0) + 1;
    });
    return counts;
  }, [alertData]);

  // ── Computed: filtered + sorted alerts ────────────────────────────
  const filteredAlerts = useMemo(() => {
    let docs = alertData?.documents || [];

    // 1. Banner colour filter
    if (bannerFilter !== 'all') {
      docs = docs.filter((d) => d.folder === bannerFilter);
    }

    // 2. TC relevance filter
    if (tcFilter === 'direct') {
      docs = docs.filter((d) => d.alert.tc_relevance?.classification === 'direct');
    } else if (tcFilter === 'indirect') {
      docs = docs.filter((d) => d.alert.tc_relevance?.classification === 'indirect');
    }

    // 3. Subcategory filter
    if (subcatFilter !== 'all') {
      docs = docs.filter((d) => d.alert.tc_relevance?.subcategory === subcatFilter);
    }

    // 4. LTI only
    if (ltiOnly) {
      docs = docs.filter((d) => d.alert.is_lti);
    }

    // 5. Active only
    if (activeOnly) {
      docs = docs.filter((d) => d.status === 'active');
    }

    // 6. Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      docs = docs.filter((d) => {
        const a = d.alert;
        return (
          a.short_description?.toLowerCase().includes(q) ||
          a.work_activity?.toLowerCase().includes(q) ||
          a.event_type?.toLowerCase().includes(q) ||
          a.injury_type?.toLowerCase().includes(q) ||
          a.road?.toLowerCase().includes(q) ||
          a.directorates?.toLowerCase().includes(q) ||
          String(a.eqsafe_number).includes(q) ||
          a.tc_relevance?.subcategory?.toLowerCase().includes(q) ||
          a.tc_relevance?.reasoning?.toLowerCase().includes(q) ||
          a.contributing_factors?.some((f) => f.toLowerCase().includes(q)) ||
          a.corrective_actions?.some((f) => f.toLowerCase().includes(q))
        );
      });
    }

    // 7. Sort
    docs = [...docs].sort((a, b) => {
      switch (sortOption) {
        case 'newest':
          return b.alert.date_of_incident.localeCompare(a.alert.date_of_incident);
        case 'oldest':
          return a.alert.date_of_incident.localeCompare(b.alert.date_of_incident);
        case 'relevance_desc':
          return (
            (b.three_pillars_assessment?.relevance_score ?? 0) -
            (a.three_pillars_assessment?.relevance_score ?? 0)
          );
        case 'relevance_asc':
          return (
            (a.three_pillars_assessment?.relevance_score ?? 0) -
            (b.three_pillars_assessment?.relevance_score ?? 0)
          );
        case 'subcategory':
          return (a.alert.tc_relevance?.subcategory || 'zzz').localeCompare(
            b.alert.tc_relevance?.subcategory || 'zzz'
          );
        default:
          return 0;
      }
    });

    return docs;
  }, [
    alertData,
    bannerFilter,
    tcFilter,
    subcatFilter,
    ltiOnly,
    activeOnly,
    searchQuery,
    sortOption,
  ]);

  // ── Computed: counts ──────────────────────────────────────────────
  const counts = useMemo(
    () => ({
      all: alertData?.documents.length || 0,
      red: alertData?.documents.filter((d) => d.folder === 'red').length || 0,
      amber: alertData?.documents.filter((d) => d.folder === 'amber').length || 0,
      grey: alertData?.documents.filter((d) => d.folder === 'grey').length || 0,
      direct:
        alertData?.documents.filter((d) => d.alert.tc_relevance?.classification === 'direct')
          .length || 0,
      indirect:
        alertData?.documents.filter((d) => d.alert.tc_relevance?.classification === 'indirect')
          .length || 0,
      lti: alertData?.documents.filter((d) => d.alert.is_lti).length || 0,
      active: alertData?.documents.filter((d) => d.status === 'active').length || 0,
    }),
    [alertData]
  );

  // ── Helpers ───────────────────────────────────────────────────────
  const openPdf = (doc: BannerAlert) => {
    const url = `/library/alerts-data/${doc.folder}/${doc.filename}`;
    setPdfUrl(url);
    setPdfTitle(`EQSafe ${doc.alert.eqsafe_number}`);
    setShowPdf(true);
  };

  const openDetail = (doc: BannerAlert) => {
    setSelectedAlert(doc);
    setShowDetail(true);
  };

  const clearAllFilters = () => {
    setBannerFilter('all');
    setTcFilter('all');
    setSubcatFilter('all');
    setLtiOnly(false);
    setActiveOnly(false);
    setSearchQuery('');
  };

  const hasActiveFilters =
    bannerFilter !== 'all' ||
    tcFilter !== 'all' ||
    subcatFilter !== 'all' ||
    ltiOnly ||
    activeOnly ||
    searchQuery !== '';

  // ── Sub-components ────────────────────────────────────────────────
  const BannerBadge = ({ colour, size = 'sm' }: { colour: string; size?: 'sm' | 'lg' }) => {
    const colours: Record<string, string> = {
      red: 'bg-red-600 text-white',
      amber: 'bg-amber-500 text-white',
      grey: 'bg-gray-500 text-white',
    };
    const sizeClass = size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs';
    return (
      <span
        className={`${colours[colour.toLowerCase()] || colours.grey} ${sizeClass} rounded font-medium`}
      >
        {colour}
      </span>
    );
  };

  const ConsequenceBadge = ({ level }: { level?: string }) => {
    if (!level) return null;
    const colours: Record<string, string> = {
      minor: 'bg-green-900/50 text-green-400',
      moderate: 'bg-amber-900/50 text-amber-400',
      major: 'bg-red-900/50 text-red-400',
      catastrophic: 'bg-red-800 text-red-200',
    };
    const colourClass = colours[level.toLowerCase()] || colours.moderate;
    return <span className={`${colourClass} px-2 py-0.5 text-xs rounded`}>{level}</span>;
  };

  const TcRelevanceBadge = ({ tc }: { tc?: TcRelevance }) => {
    if (!tc) return null;
    const isDirect = tc.classification === 'direct';
    return (
      <span
        className={`px-2 py-0.5 text-xs rounded font-medium ${
          isDirect ? 'bg-emerald-900/50 text-emerald-400' : 'bg-gray-700 text-gray-400'
        }`}
      >
        {isDirect ? 'Direct' : 'Indirect'}
      </span>
    );
  };

  const SubcatTag = ({ subcategory }: { subcategory?: string }) => {
    if (!subcategory) return null;
    const isDirect = DIRECT_SUBCATEGORIES.includes(subcategory);
    return (
      <span
        className={`text-xs px-1.5 py-0.5 rounded ${
          isDirect
            ? 'bg-emerald-900/30 text-emerald-400/80 border border-emerald-800/40'
            : 'bg-gray-800 text-gray-500 border border-gray-700/50'
        }`}
      >
        {subcatLabel(subcategory)}
      </span>
    );
  };

  const PillarScoreVisual = ({ assessment }: { assessment?: ThreePillarsAssessment }) => {
    if (!assessment) return null;
    const score = assessment.relevance_score;
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`w-2.5 h-2.5 rounded-sm ${i < score ? 'bg-cyan-400' : 'bg-gray-700'}`}
          />
        ))}
        <span className="text-xs text-gray-500 ml-1">{score}/5</span>
      </div>
    );
  };

  const PillarDots = ({ assessment }: { assessment?: ThreePillarsAssessment }) => {
    if (!assessment) return null;
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {PILLAR_META.map((p) => (
          <div
            key={p.key}
            className={`flex items-center gap-0.5 text-xs ${
              assessment.pillars[p.key] ? 'text-white' : 'text-gray-600'
            }`}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                assessment.pillars[p.key] ? p.color : 'bg-gray-700'
              }`}
            />
            <span className={assessment.pillars[p.key] ? '' : 'line-through opacity-50'}>
              {p.short}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // ── Available subcategories for current tcFilter ──────────────────
  const availableSubcats = useMemo(() => {
    const subs = new Set<string>();
    let docs = alertData?.documents || [];
    if (tcFilter === 'direct')
      docs = docs.filter((d) => d.alert.tc_relevance?.classification === 'direct');
    else if (tcFilter === 'indirect')
      docs = docs.filter((d) => d.alert.tc_relevance?.classification === 'indirect');
    docs.forEach((d) => {
      const sc = d.alert.tc_relevance?.subcategory;
      if (sc) subs.add(sc);
    });
    return subs;
  }, [alertData, tcFilter]);

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/library" className="text-cyan-400 hover:text-cyan-300 text-sm">
              &larr; Library
            </Link>
            <h1 className="text-lg font-bold">MRWA Alerts</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <div className="flex bg-gray-800 rounded overflow-hidden">
              <button
                onClick={() => setViewMode('standard')}
                className={`px-2.5 py-1 text-xs transition-colors ${
                  viewMode === 'standard'
                    ? 'bg-cyan-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Standard
              </button>
              <button
                onClick={() => setViewMode('framework')}
                className={`px-2.5 py-1 text-xs transition-colors ${
                  viewMode === 'framework'
                    ? 'bg-cyan-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                3+1 Framework
              </button>
            </div>
            <span className="text-xs text-gray-500">
              {alertData ? `Updated: ${new Date(alertData.last_updated).toLocaleDateString()}` : ''}
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search alerts... (incident, road, injury, subcategory, reasoning)"
            className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        {/* Row 1: Banner colour filter tabs */}
        <div className="flex gap-2 px-4 pb-2 overflow-x-auto">
          {[
            { key: 'all' as BannerFilter, label: 'All', icon: '📋' },
            { key: 'red' as BannerFilter, label: 'Red', icon: '🔴' },
            { key: 'amber' as BannerFilter, label: 'Amber', icon: '🟡' },
            { key: 'grey' as BannerFilter, label: 'Grey', icon: '⚪' },
          ].map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setBannerFilter(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm whitespace-nowrap transition-colors ${
                bannerFilter === key
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <span>{icon}</span>
              <span>{label}</span>
              <span className="text-xs opacity-70">({counts[key]})</span>
            </button>
          ))}
        </div>

        {/* Row 2: TC Relevance filter tabs */}
        <div className="flex gap-2 px-4 pb-2 overflow-x-auto items-center">
          {[
            { key: 'all' as TcFilter, label: 'All Alerts' },
            { key: 'direct' as TcFilter, label: 'Direct TC', color: 'text-emerald-400' },
            { key: 'indirect' as TcFilter, label: 'Indirect', color: 'text-gray-400' },
          ].map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => {
                setTcFilter(key);
                setSubcatFilter('all'); // reset subcategory when tc filter changes
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm whitespace-nowrap transition-colors ${
                tcFilter === key
                  ? 'bg-cyan-600 text-white'
                  : `bg-gray-800 ${color || 'text-gray-400'} hover:bg-gray-700`
              }`}
            >
              <span>{label}</span>
              <span className="text-xs opacity-70">
                ({key === 'all' ? counts.all : key === 'direct' ? counts.direct : counts.indirect})
              </span>
            </button>
          ))}

          {/* Quick filter toggles */}
          <div className="border-l border-gray-700 pl-2 flex gap-2">
            <button
              onClick={() => setLtiOnly(!ltiOnly)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                ltiOnly
                  ? 'bg-red-900/60 text-red-300 border border-red-700'
                  : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
              }`}
            >
              <span>LTI Only</span>
              <span className="opacity-70">({counts.lti})</span>
            </button>
            <button
              onClick={() => setActiveOnly(!activeOnly)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                activeOnly
                  ? 'bg-amber-900/60 text-amber-300 border border-amber-700'
                  : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
              }`}
            >
              <span>Active Only</span>
              <span className="opacity-70">({counts.active})</span>
            </button>
          </div>

          {/* Subcategory dropdown */}
          <div className="border-l border-gray-700 pl-2">
            <select
              value={subcatFilter}
              onChange={(e) => setSubcatFilter(e.target.value)}
              className="bg-gray-800 text-gray-300 text-xs rounded px-2 py-1.5 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
            >
              <option value="all">All Subcategories</option>
              {tcFilter !== 'indirect' &&
                DIRECT_SUBCATEGORIES.filter((sc) => availableSubcats.has(sc)).length > 0 && (
                  <optgroup label="── Direct TC ──">
                    {DIRECT_SUBCATEGORIES.filter((sc) => availableSubcats.has(sc)).map((sc) => (
                      <option key={sc} value={sc}>
                        {subcatLabel(sc)} ({subcatCounts[sc] || 0})
                      </option>
                    ))}
                  </optgroup>
                )}
              {tcFilter !== 'direct' &&
                INDIRECT_SUBCATEGORIES.filter((sc) => availableSubcats.has(sc)).length > 0 && (
                  <optgroup label="── Indirect ──">
                    {INDIRECT_SUBCATEGORIES.filter((sc) => availableSubcats.has(sc)).map((sc) => (
                      <option key={sc} value={sc}>
                        {subcatLabel(sc)} ({subcatCounts[sc] || 0})
                      </option>
                    ))}
                  </optgroup>
                )}
            </select>
          </div>

          {/* Sort dropdown */}
          <div className="border-l border-gray-700 pl-2">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="bg-gray-800 text-gray-300 text-xs rounded px-2 py-1.5 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="relevance_desc">Highest Relevance</option>
              <option value="relevance_asc">Lowest Relevance</option>
              <option value="subcategory">Subcategory A-Z</option>
            </select>
          </div>

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-cyan-400 hover:text-cyan-300 whitespace-nowrap"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Results count */}
        <div className="px-4 pb-2 text-xs text-gray-500">
          Showing {filteredAlerts.length} of {alertData?.documents.length || 0} alerts
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-gray-400">Loading alert data...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-center">
            <p className="text-red-400">{error}</p>
            <p className="text-xs text-gray-500 mt-2">Alert data may not be synced yet.</p>
          </div>
        )}

        {!loading && !error && filteredAlerts.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-2xl mb-2">📭</p>
            <p>No alerts found{searchQuery ? ' matching your search' : ' with these filters'}</p>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="mt-3 text-cyan-400 hover:text-cyan-300 text-sm"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Alert cards */}
        <div className="space-y-3">
          {filteredAlerts.map((doc) => {
            const a = doc.alert;
            const borderColour =
              a.banner_colour.toLowerCase() === 'red'
                ? 'border-l-red-500'
                : a.banner_colour.toLowerCase() === 'amber'
                  ? 'border-l-amber-500'
                  : 'border-l-gray-500';

            const tcRel = a.tc_relevance;
            const pillars = doc.three_pillars_assessment;

            return (
              <div
                key={doc.filename}
                className={`bg-gray-900 border border-gray-800 border-l-4 ${borderColour} rounded-lg p-3 cursor-pointer hover:bg-gray-850 transition-colors`}
                onClick={() => openDetail(doc)}
              >
                {viewMode === 'standard' ? (
                  <>
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <BannerBadge colour={a.banner_colour} />
                        <span className="text-xs text-gray-400 font-mono">
                          EQ#{a.eqsafe_number}
                        </span>
                        <TcRelevanceBadge tc={tcRel} />
                        {a.is_lti && (
                          <span className="bg-red-900/50 text-red-400 px-1.5 py-0.5 text-xs rounded">
                            LTI
                          </span>
                        )}
                        <ConsequenceBadge level={a.potential_consequence} />
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {new Date(a.date_of_incident).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-white mb-1.5 line-clamp-2">{a.short_description}</p>

                    {/* TC subcategory + pillar score */}
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <SubcatTag subcategory={tcRel?.subcategory} />
                      {pillars && <PillarScoreVisual assessment={pillars} />}
                    </div>

                    {/* Key info */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                      {a.work_activity && (
                        <span className="truncate max-w-[200px]">Activity: {a.work_activity}</span>
                      )}
                      {a.road && <span>Road: {a.road}</span>}
                      {a.directorates && (
                        <span>Region: {a.directorates.split('–').pop()?.trim()}</span>
                      )}
                    </div>

                    {/* Status */}
                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          doc.status === 'active'
                            ? 'bg-amber-900/40 text-amber-400'
                            : 'bg-gray-800 text-gray-400'
                        }`}
                      >
                        {doc.status === 'active' ? 'Active' : 'Closed'}
                      </span>
                      {a.investigation_status && (
                        <span className="text-xs text-gray-500">
                          Investigation: {a.investigation_status}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  /* ─── Framework View ─── */
                  <>
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <BannerBadge colour={a.banner_colour} />
                        <span className="text-xs text-gray-400 font-mono">
                          EQ#{a.eqsafe_number}
                        </span>
                        <TcRelevanceBadge tc={tcRel} />
                        {a.is_lti && (
                          <span className="bg-red-900/50 text-red-400 px-1.5 py-0.5 text-xs rounded">
                            LTI
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {new Date(a.date_of_incident).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-white mb-2 line-clamp-2">{a.short_description}</p>

                    {/* 3+1 Pillar breakdown */}
                    <div className="bg-gray-800/50 rounded-lg p-2.5 mb-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-cyan-400 font-medium">
                          3+1 Framework Assessment
                        </span>
                        <div className="flex items-center gap-1">
                          {pillars ? (
                            <>
                              {Array.from({ length: 5 }).map((_, i) => (
                                <div
                                  key={i}
                                  className={`w-2 h-2 rounded-sm ${
                                    i < pillars.relevance_score ? 'bg-cyan-400' : 'bg-gray-700'
                                  }`}
                                />
                              ))}
                              <span className="text-xs text-gray-400 ml-1">
                                {pillars.relevance_score}/5
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-gray-600">Not assessed</span>
                          )}
                        </div>
                      </div>
                      {pillars ? (
                        <div className="grid grid-cols-5 gap-1">
                          {PILLAR_META.map((p) => {
                            const flagged = pillars.pillars[p.key];
                            return (
                              <div
                                key={p.key}
                                className={`flex flex-col items-center gap-0.5 px-1 py-1.5 rounded text-center ${
                                  flagged ? 'bg-gray-700/60' : 'bg-gray-800/30'
                                }`}
                              >
                                <div
                                  className={`w-2.5 h-2.5 rounded-full ${flagged ? p.color : 'bg-gray-600'}`}
                                />
                                <span
                                  className={`text-[10px] leading-tight ${
                                    flagged ? 'text-white' : 'text-gray-600'
                                  }`}
                                >
                                  {p.short}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-600">No pillar assessment available</p>
                      )}
                    </div>

                    {/* Subcategory tag */}
                    <div className="flex items-center gap-2">
                      <SubcatTag subcategory={tcRel?.subcategory} />
                      {tcRel?.reasoning && (
                        <span className="text-xs text-gray-500 truncate max-w-[250px]">
                          {tcRel.reasoning}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Info section */}
        {!loading && alertData && (
          <div className="mt-6 bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-cyan-400 mb-2">About MRWA Banner Alerts</h3>
            <div className="text-xs text-gray-400 space-y-2">
              <p>
                <span className="text-red-400 font-medium">Red Banner</span> — Serious incident,
                LTI, or near miss with high potential. Preliminary notice issued while ICAM
                investigation commences.
              </p>
              <p>
                <span className="text-amber-400 font-medium">Amber Banner</span> — Significant
                incident or near miss. Preliminary notice issued while investigation is underway.
              </p>
              <p>
                <span className="text-gray-300 font-medium">Grey Banner</span> — Final report with
                lessons learnt, contributing factors, and corrective actions after investigation
                completion.
              </p>
              <div className="border-t border-gray-800 pt-2 space-y-1">
                <p className="text-gray-300 font-medium">TC Relevance Classification</p>
                <p>
                  <span className="text-emerald-400 font-medium">Direct</span> — Incident directly
                  involves traffic control operations: TC injured, TM breach, MoP breaching TC
                  setup, TC equipment failure, TM setup activity.
                </p>
                <p>
                  <span className="text-gray-400 font-medium">Indirect</span> — Incident affects TC
                  workers but is not inherent to the traffic control system: journey management,
                  manual handling, slips/trips, equipment/tools, fitness for duty, etc.
                </p>
              </div>
              <div className="border-t border-gray-800 pt-2 space-y-1">
                <p className="text-gray-300 font-medium">3+1 Framework Assessment</p>
                <p>
                  Each alert is assessed against the five indicators of the &quot;Beyond the Plan: 3
                  Pillars, 1 Practice&quot; framework:
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 ml-2">
                  <span>
                    <span className="text-blue-400">Crew</span> — Competency gaps
                  </span>
                  <span>
                    <span className="text-purple-400">Plan</span> — Plan adequacy failures
                  </span>
                  <span>
                    <span className="text-amber-400">Equip</span> — Equipment issues
                  </span>
                  <span>
                    <span className="text-rose-400">Gap</span> — Paperwork vs reality
                  </span>
                  <span>
                    <span className="text-emerald-400">Change</span> — Conditions changed mid-job
                  </span>
                </div>
                <p>
                  The relevance score (0-5) counts how many indicators were flagged. Higher scores
                  indicate more severe framework failures.
                </p>
              </div>
              <p className="text-gray-500 pt-1 border-t border-gray-800">
                Workflow: Red/Amber (preliminary) &rarr; ICAM Investigation &rarr; Grey (final)
                &rarr; Archived
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Detail Sheet */}
      {showDetail && selectedAlert && (
        <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setShowDetail(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 rounded-t-xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Detail header */}
            <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BannerBadge colour={selectedAlert.alert.banner_colour} size="lg" />
                <span className="font-mono text-sm text-gray-300">
                  EQ#{selectedAlert.alert.eqsafe_number}
                </span>
                <TcRelevanceBadge tc={selectedAlert.alert.tc_relevance} />
              </div>
              <button
                onClick={() => setShowDetail(false)}
                className="text-gray-400 hover:text-white text-xl leading-none"
              >
                &times;
              </button>
            </div>

            {/* Detail content */}
            <div className="px-4 py-4 space-y-4">
              {/* Description */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">Description</h3>
                <p className="text-white">{selectedAlert.alert.short_description}</p>
              </div>

              {/* TC Relevance section */}
              {selectedAlert.alert.tc_relevance && (
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <h3 className="text-sm font-medium text-cyan-400 mb-2">TC Relevance</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500 text-xs">Classification</span>
                      <p>
                        <TcRelevanceBadge tc={selectedAlert.alert.tc_relevance} />
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">Subcategory</span>
                      <p>
                        <SubcatTag subcategory={selectedAlert.alert.tc_relevance.subcategory} />
                      </p>
                    </div>
                  </div>
                  {selectedAlert.alert.tc_relevance.reasoning && (
                    <div className="mt-2">
                      <span className="text-gray-500 text-xs">Reasoning</span>
                      <p className="text-gray-300 text-sm mt-0.5">
                        {selectedAlert.alert.tc_relevance.reasoning}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* 3+1 Framework Assessment in detail */}
              {selectedAlert.three_pillars_assessment && (
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <h3 className="text-sm font-medium text-cyan-400 mb-2">
                    3+1 Framework Assessment
                  </h3>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-gray-400">Relevance Score:</span>
                    <PillarScoreVisual assessment={selectedAlert.three_pillars_assessment} />
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {PILLAR_META.map((p) => {
                      const flagged = selectedAlert.three_pillars_assessment!.pillars[p.key];
                      return (
                        <div
                          key={p.key}
                          className={`flex flex-col items-center gap-1 px-2 py-2 rounded text-center ${
                            flagged
                              ? 'bg-gray-700/60 border border-gray-600'
                              : 'bg-gray-800/30 border border-gray-800'
                          }`}
                        >
                          <div
                            className={`w-3 h-3 rounded-full ${flagged ? p.color : 'bg-gray-600'}`}
                          />
                          <span className={`text-xs ${flagged ? 'text-white' : 'text-gray-600'}`}>
                            {p.short}
                          </span>
                          <span
                            className={`text-[10px] ${flagged ? 'text-gray-300' : 'text-gray-600'}`}
                          >
                            {flagged ? 'Flagged' : 'Clear'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Incident details grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500 text-xs">Date of Incident</span>
                  <p className="text-white">
                    {new Date(selectedAlert.alert.date_of_incident).toLocaleDateString()}
                  </p>
                </div>
                {selectedAlert.alert.time_of_incident && (
                  <div>
                    <span className="text-gray-500 text-xs">Time</span>
                    <p className="text-white">{selectedAlert.alert.time_of_incident}</p>
                  </div>
                )}
                <div>
                  <span className="text-gray-500 text-xs">Event Type</span>
                  <p className="text-white">{selectedAlert.alert.event_type || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">Organisation</span>
                  <p className="text-white">
                    {selectedAlert.alert.main_roads_or_contractor || 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">Actual Consequence</span>
                  <ConsequenceBadge level={selectedAlert.alert.actual_consequence} />
                </div>
                <div>
                  <span className="text-gray-500 text-xs">Potential Consequence</span>
                  <ConsequenceBadge level={selectedAlert.alert.potential_consequence} />
                </div>
                {selectedAlert.alert.road && (
                  <div>
                    <span className="text-gray-500 text-xs">Road</span>
                    <p className="text-white">{selectedAlert.alert.road}</p>
                  </div>
                )}
                {selectedAlert.alert.directorates && (
                  <div>
                    <span className="text-gray-500 text-xs">Region</span>
                    <p className="text-white">{selectedAlert.alert.directorates}</p>
                  </div>
                )}
              </div>

              {/* Work activity */}
              {selectedAlert.alert.work_activity && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Work Activity</h3>
                  <p className="text-white text-sm">{selectedAlert.alert.work_activity}</p>
                </div>
              )}

              {/* Injury type */}
              {selectedAlert.alert.injury_type && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Injury Type</h3>
                  <p className="text-white text-sm">{selectedAlert.alert.injury_type}</p>
                </div>
              )}

              {/* Key details */}
              {selectedAlert.alert.key_details && selectedAlert.alert.key_details.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Key Details</h3>
                  <ul className="space-y-1">
                    {selectedAlert.alert.key_details.map((detail, i) => (
                      <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                        <span className="text-cyan-400 mt-0.5 shrink-0">&bull;</span>
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Contributing factors */}
              {selectedAlert.alert.contributing_factors &&
                selectedAlert.alert.contributing_factors.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-amber-400 mb-1">
                      Contributing Factors
                    </h3>
                    <ul className="space-y-1">
                      {selectedAlert.alert.contributing_factors.map((factor, i) => (
                        <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                          <span className="text-amber-400 mt-0.5 shrink-0">&bull;</span>
                          {factor}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {/* Corrective actions */}
              {selectedAlert.alert.corrective_actions &&
                selectedAlert.alert.corrective_actions.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-green-400 mb-1">Corrective Actions</h3>
                    <ul className="space-y-1">
                      {selectedAlert.alert.corrective_actions.map((action, i) => (
                        <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                          <span className="text-green-400 mt-0.5 shrink-0">&bull;</span>
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {/* Investigation status */}
              <div className="bg-gray-800/50 rounded-lg p-3 text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-400">Investigation</span>
                  <span className="text-white">
                    {selectedAlert.alert.investigation_type || 'Standard'}
                  </span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-400">Status</span>
                  <span
                    className={
                      selectedAlert.alert.investigation_status === 'Completed'
                        ? 'text-green-400'
                        : 'text-amber-400'
                    }
                  >
                    {selectedAlert.alert.investigation_status || 'Unknown'}
                  </span>
                </div>
                {selectedAlert.alert.is_lti !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Lost Time Injury</span>
                    <span className={selectedAlert.alert.is_lti ? 'text-red-400' : 'text-gray-400'}>
                      {selectedAlert.alert.is_lti ? 'Yes' : 'No'}
                    </span>
                  </div>
                )}
              </div>

              {/* Open PDF button */}
              <button
                onClick={() => openPdf(selectedAlert)}
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-white font-medium text-sm transition-colors"
              >
                View PDF Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {showPdf && (
        <PdfViewerModal
          isOpen={showPdf}
          onClose={() => setShowPdf(false)}
          pdfUrl={pdfUrl}
          docId={`alert-${selectedAlert?.alert.eqsafe_number || 'unknown'}`}
          docTitle={pdfTitle}
        />
      )}
    </div>
  );
}
