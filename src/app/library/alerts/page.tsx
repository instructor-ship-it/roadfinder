'use client';

import { useState, useEffect } from 'react';
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

// Types for banner alert data
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
  };
  linked_grey_banner?: string | null;
  linked_red_banner?: string | null;
  status: string;
}

interface AlertIndex {
  version: string;
  description: string;
  last_updated: string;
  documents: BannerAlert[];
}

type FilterType = 'all' | 'red' | 'amber' | 'grey';

export default function AlertsPage() {
  const [alertData, setAlertData] = useState<AlertIndex | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedAlert, setSelectedAlert] = useState<BannerAlert | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showPdf, setShowPdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfTitle, setPdfTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Load alert index data
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

  // Filter and search alerts
  const filteredAlerts =
    alertData?.documents.filter((doc) => {
      // Filter by banner colour
      if (filter !== 'all' && doc.folder !== filter) return false;

      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const a = doc.alert;
        return (
          a.short_description?.toLowerCase().includes(q) ||
          a.work_activity?.toLowerCase().includes(q) ||
          a.event_type?.toLowerCase().includes(q) ||
          a.injury_type?.toLowerCase().includes(q) ||
          a.road?.toLowerCase().includes(q) ||
          a.directorates?.toLowerCase().includes(q) ||
          String(a.eqsafe_number).includes(q) ||
          a.contributing_factors?.some((f) => f.toLowerCase().includes(q)) ||
          a.corrective_actions?.some((f) => f.toLowerCase().includes(q))
        );
      }
      return true;
    }) || [];

  // Counts by type
  const counts = {
    all: alertData?.documents.length || 0,
    red: alertData?.documents.filter((d) => d.folder === 'red').length || 0,
    amber: alertData?.documents.filter((d) => d.folder === 'amber').length || 0,
    grey: alertData?.documents.filter((d) => d.folder === 'grey').length || 0,
  };

  // Open PDF for an alert
  const openPdf = (doc: BannerAlert) => {
    const url = `/library/alerts-data/${doc.folder}/${doc.filename}`;
    setPdfUrl(url);
    setPdfTitle(`EQSafe ${doc.alert.eqsafe_number}`);
    setShowPdf(true);
  };

  // Open detail panel
  const openDetail = (doc: BannerAlert) => {
    setSelectedAlert(doc);
    setShowDetail(true);
  };

  // Banner colour badge
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

  // Consequence level indicator
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
          <span className="text-xs text-gray-500">
            {alertData ? `Updated: ${new Date(alertData.last_updated).toLocaleDateString()}` : ''}
          </span>
        </div>

        {/* Search */}
        <div className="px-4 pb-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search alerts... (incident, road, injury, activity)"
            className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
          {[
            { key: 'all' as FilterType, label: 'All', icon: '📋' },
            { key: 'red' as FilterType, label: 'Red', icon: '🔴' },
            { key: 'amber' as FilterType, label: 'Amber', icon: '🟡' },
            { key: 'grey' as FilterType, label: 'Grey', icon: '⚪' },
          ].map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm whitespace-nowrap transition-colors ${
                filter === key
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
            <p>No alerts found{searchQuery ? ' matching your search' : ' in this category'}</p>
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

            return (
              <div
                key={doc.filename}
                className={`bg-gray-900 border border-gray-800 border-l-4 ${borderColour} rounded-lg p-3 cursor-pointer hover:bg-gray-850 transition-colors`}
                onClick={() => openDetail(doc)}
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <BannerBadge colour={a.banner_colour} />
                    <span className="text-xs text-gray-400 font-mono">EQ#{a.eqsafe_number}</span>
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

                {/* Key info */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                  {a.work_activity && (
                    <span className="truncate max-w-[200px]">Activity: {a.work_activity}</span>
                  )}
                  {a.road && <span>Road: {a.road}</span>}
                  {a.directorates && <span>Region: {a.directorates.split('–').pop()?.trim()}</span>}
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
