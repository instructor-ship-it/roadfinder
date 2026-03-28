'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  initDB,
  isOfflineDataAvailable as checkOfflineData,
  findRoadNearGps,
  getRoadInfoById,
} from '@/lib/offline-db';
import {
  // Types
  AfterCareJob,
  AfterCareSign,
  AfterCarePresets,
  SignCategory,
  SignDirection,
  RetrievalType,
  ComputedJobStatus,
  MapFilter,
  // Functions
  getAfterCareJobs,
  saveAfterCareJobs,
  createAfterCareJob,
  updateAfterCareJob,
  deleteAfterCareJob,
  archiveAfterCareJob,
  unarchiveAfterCareJob,
  getAfterCarePresets,
  addCustomPreset,
  removeCustomPreset,
  addSignToJob,
  updateSignInJob,
  removeSignFromJob,
  markAllSignsRetrieved,
  markAllSignsMaintained,
  getJobsGroupedByStatus,
  getAfterCareStats,
  calculateJobStatus,
  getStatusInfo,
  formatAusDate,
  toIsoDate,
  parseAusDate,
  getDefaultScheduledDate,
  daysUntil,
  formatRelativeDays,
  addDays,
  generateShareText,
  generateMapsUrl,
  getSignStatusCounts,
  exportAllJobs,
  importJobs,
  DEFAULT_PRESETS,
  generateId,
  calculateSignStatus,
  updateSignStatuses,
  getNearbySigns,
} from '@/lib/aftercare';
import {
  optimizeRoute,
  getAllSignsDueForRetrieval,
  getAllSignsDueForMaintenance,
  countSignsByStatus,
  generateReport,
} from '@/lib/route-optimizer';

// Helper to fetch GPS coordinates from road_id + slk
async function fetchGpsFromSlk(
  roadId: string,
  slk: number
): Promise<{ lat: number; lon: number } | null> {
  try {
    const response = await fetch(
      `/api/roads?action=locate&road_id=${encodeURIComponent(roadId)}&slk=${slk}`
    );
    if (response.ok) {
      const data = await response.json();
      if (data.latitude && data.longitude) {
        return { lat: data.latitude, lon: data.longitude };
      }
    }
  } catch (e) {
    console.error('Failed to fetch GPS coordinates:', e);
  }
  return null;
}

// App version
const APP_VERSION = 'RC 1.9.6';

// ============================================
// MAIN COMPONENT
// ============================================

function AfterCareContent() {
  // Get query params for filtering
  const searchParams = useSearchParams();
  const filterRoadId = searchParams.get('road_id');
  const filterSlk = searchParams.get('slk');
  const filterDirection = searchParams.get('direction') as 'increasing' | 'decreasing' | null;
  const filterLookahead = searchParams.get('lookahead');

  // State
  const [offlineReady, setOfflineReady] = useState(false);
  const [jobs, setJobs] = useState<AfterCareJob[]>([]);
  const [stats, setStats] = useState<ReturnType<typeof getAfterCareStats> | null>(null);
  const [view, setView] = useState<'list' | 'add' | 'edit' | 'presets'>('list');
  const [editingJob, setEditingJob] = useState<AfterCareJob | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  // Route optimization state
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Check if we're in filtered mode
  const isFilteredMode = !!(filterRoadId && filterSlk);

  // Get filtered nearby signs when in filtered mode
  const filteredSigns = useMemo(() => {
    if (!isFilteredMode || !filterRoadId || !filterSlk) return [];
    const slk = parseFloat(filterSlk);
    const lookahead = filterLookahead ? parseFloat(filterLookahead) : 5;
    const direction = filterDirection || 'increasing';
    return getNearbySigns(filterRoadId, slk, direction, lookahead);
  }, [isFilteredMode, filterRoadId, filterSlk, filterDirection, filterLookahead]);

  // Get unique job IDs from filtered signs
  const filteredJobIds = useMemo(() => {
    return [...new Set(filteredSigns.map((s) => s.job.id))];
  }, [filteredSigns]);

  // Refresh jobs and stats (defined first for use in useEffect)
  const refreshData = () => {
    const allJobs = getAfterCareJobs();
    setJobs(allJobs);
    setStats(getAfterCareStats());
  };

  // Count signs by status across all jobs for route buttons
  const signStatusCounts = useMemo(() => {
    return countSignsByStatus(jobs);
  }, [jobs]);

  // Load data on mount
  useEffect(() => {
    const init = async () => {
      try {
        await initDB();
        const hasData = await checkOfflineData();
        setOfflineReady(hasData);
      } catch (e) {
        console.error('Failed to init offline DB:', e);
      }

      refreshData();
    };
    init();
  }, []);

  // Group jobs by status (filtered if in filtered mode)
  const groupedJobs = useMemo(() => {
    const allGroups = getJobsGroupedByStatus();

    if (!isFilteredMode) return allGroups;

    // Filter each group to only include jobs with matching signs
    return {
      dueRetrieval: allGroups.dueRetrieval.filter((j) => filteredJobIds.includes(j.id)),
      dueMaintenance: allGroups.dueMaintenance.filter((j) => filteredJobIds.includes(j.id)),
      tba: allGroups.tba.filter((j) => filteredJobIds.includes(j.id)),
      active: allGroups.active.filter((j) => filteredJobIds.includes(j.id)),
      retrieved: allGroups.retrieved.filter((j) => filteredJobIds.includes(j.id)),
      archived: allGroups.archived.filter((j) => filteredJobIds.includes(j.id)),
    };
  }, [jobs, isFilteredMode, filteredJobIds]);

  // Handle job deletion
  const handleDeleteJob = (jobId: string) => {
    if (confirm('Are you sure you want to delete this job? This cannot be undone.')) {
      deleteAfterCareJob(jobId);
      refreshData();
    }
  };

  // Handle archive
  const handleArchive = (jobId: string) => {
    archiveAfterCareJob(jobId);
    refreshData();
  };

  // Handle unarchive
  const handleUnarchive = (jobId: string) => {
    unarchiveAfterCareJob(jobId);
    refreshData();
  };

  // Handle mark all retrieved
  const handleMarkAllRetrieved = (jobId: string) => {
    markAllSignsRetrieved(jobId);
    refreshData();
  };

  // Handle mark all maintained
  const handleMarkAllMaintained = (jobId: string) => {
    markAllSignsMaintained(jobId);
    refreshData();
  };

  // Handle share
  const handleShare = (job: AfterCareJob) => {
    const text = generateShareText(job);
    if (navigator.share) {
      navigator
        .share({
          title: `AfterCare: ${job.job_name}`,
          text: text,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      alert('Job details copied to clipboard!');
    }
  };

  // Handle map with filter
  const handleOpenMap = (job: AfterCareJob, filter: MapFilter = 'all') => {
    const url = generateMapsUrl(job, filter);
    if (url) {
      window.open(url, '_blank');
    } else {
      const filterText =
        filter === 'retrieval'
          ? 'due for retrieval'
          : filter === 'maintenance'
            ? 'due for maintenance'
            : 'active';
      alert(`No signs ${filterText} with GPS coordinates available.`);
    }
  };

  // Handle optimized route for all retrieval signs
  const handleOpenAllRetrievalRoute = async () => {
    setIsOptimizing(true);
    try {
      const signs = getAllSignsDueForRetrieval(jobs);
      if (signs.length === 0) {
        alert('No signs with GPS coordinates due for retrieval');
        return;
      }
      const result = await optimizeRoute(signs);
      if (result) {
        window.open(result.googleMapsUrl, '_blank');
      } else {
        alert('Failed to optimize route');
      }
    } catch (e) {
      console.error('Route optimization error:', e);
      alert('Failed to optimize route');
    } finally {
      setIsOptimizing(false);
    }
  };

  // Handle optimized route for all maintenance signs
  const handleOpenAllMaintenanceRoute = async () => {
    setIsOptimizing(true);
    try {
      const signs = getAllSignsDueForMaintenance(jobs);
      if (signs.length === 0) {
        alert('No signs with GPS coordinates due for maintenance');
        return;
      }
      const result = await optimizeRoute(signs);
      if (result) {
        window.open(result.googleMapsUrl, '_blank');
      } else {
        alert('Failed to optimize route');
      }
    } catch (e) {
      console.error('Route optimization error:', e);
      alert('Failed to optimize route');
    } finally {
      setIsOptimizing(false);
    }
  };

  // Handle print report
  const handlePrintReport = () => {
    const report = generateReport(jobs);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print the report');
      return;
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>AfterCare Report</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
    h1 { font-size: 20px; margin-bottom: 10px; }
    h2 { font-size: 14px; margin-top: 20px; border-bottom: 1px solid #333; padding-bottom: 5px; }
    .stats { background: #f5f5f5; padding: 10px; margin-bottom: 20px; }
    .stat { display: inline-block; margin-right: 20px; }
    .stat-label { color: #666; font-size: 10px; }
    .stat-value { font-size: 18px; font-weight: bold; }
    .job { border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; }
    .job-header { font-weight: bold; }
    .sign { padding: 5px 0; border-bottom: 1px solid #eee; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 10px; }
    .badge-retrieval { background: #fee2e2; color: #991b1b; }
    .badge-maintenance { background: #fef9c3; color: #92400e; }
    .badge-active { background: #dcfce7; color: #166534; }
    @media print { body { -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
  <h1>🚧 AfterCare Signs Report</h1>
  <p>Generated: ${formatAusDate(new Date())}</p>
  
  <div class="stats">
    <div class="stat"><div class="stat-label">Jobs</div><div class="stat-value">${report.summary.totalJobs}</div></div>
    <div class="stat"><div class="stat-label">Signs</div><div class="stat-value">${report.summary.totalSigns}</div></div>
    <div class="stat"><div class="stat-label">Due Retrieval</div><div class="stat-value" style="color:#dc2626">${report.summary.dueRetrieval}</div></div>
    <div class="stat"><div class="stat-label">Due Maintenance</div><div class="stat-value" style="color:#d97706">${report.summary.dueMaintenance}</div></div>
  </div>
  
  <h2>Jobs Due for Retrieval (${report.jobsByStatus.dueRetrieval.length})</h2>
  ${
    report.jobsByStatus.dueRetrieval
      .map(
        (job) => `
    <div class="job">
      <div class="job-header">${job.road_id} - ${job.road_name || 'N/A'}</div>
      <div>${job.job_name}</div>
      ${job.signs
        .filter((s) => calculateSignStatus(s) === 'due-retrieval')
        .map(
          (s) => `
        <div class="sign">SLK ${s.slk.toFixed(2)} - ${s.sign_type} (${s.direction === 'True Left' ? 'TL' : 'TR'}) ${s.description ? '- ' + s.description : ''}</div>
      `
        )
        .join('')}
    </div>
  `
      )
      .join('') || '<p>None</p>'
  }
  
  <h2>Jobs Due for Maintenance (${report.jobsByStatus.dueMaintenance.length})</h2>
  ${
    report.jobsByStatus.dueMaintenance
      .map(
        (job) => `
    <div class="job">
      <div class="job-header">${job.road_id} - ${job.road_name || 'N/A'}</div>
      <div>${job.job_name}</div>
      ${job.signs
        .filter((s) => {
          const st = calculateSignStatus(s);
          return st === 'due-maintenance' || st === 'maintained';
        })
        .map(
          (s) => `
        <div class="sign">SLK ${s.slk.toFixed(2)} - ${s.sign_type} (${s.direction === 'True Left' ? 'TL' : 'TR'}) ${s.description ? '- ' + s.description : ''}</div>
      `
        )
        .join('')}
    </div>
  `
      )
      .join('') || '<p>None</p>'
  }
  
  <h2>Active Jobs (${report.jobsByStatus.active.length})</h2>
  ${
    report.jobsByStatus.active
      .map(
        (job) => `
    <div class="job">
      <div class="job-header">${job.road_id} - ${job.road_name || 'N/A'}</div>
      <div>${job.job_name} (${job.signs.length} signs)</div>
    </div>
  `
      )
      .join('') || '<p>None</p>'
  }
  
  <p style="margin-top:30px; text-align:center; color:#999; font-size:10px;">
    AfterCare Signs v${APP_VERSION}
  </p>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 max-w-lg mx-auto">
      {/* Back Link */}
      <a
        href="/"
        className="inline-flex items-center text-blue-400 text-sm mb-4 hover:text-blue-300"
      >
        ← Back to Work Zone Locator
      </a>

      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-xl font-bold text-cyan-400">🚧 AfterCare Signs</h1>
        <p className="text-xs text-gray-400">
          v{APP_VERSION} {offlineReady && <span className="text-green-400">• Offline Ready</span>}
        </p>
      </div>

      {/* Filtered View Indicator */}
      {isFilteredMode && (
        <div className="bg-cyan-900/40 border border-cyan-700/50 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-cyan-400">📍</span>
              <div>
                <span className="text-cyan-300 text-sm font-medium">Filtered View</span>
                <p className="text-xs text-gray-400">
                  {filterRoadId} @ SLK {filterSlk} ({filterLookahead || 5}km radius)
                </p>
              </div>
            </div>
            <a
              href="/aftercare"
              className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
            >
              Clear Filter
            </a>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            {filteredSigns.length} sign{filteredSigns.length !== 1 ? 's' : ''} found in{' '}
            {filteredJobIds.length} job{filteredJobIds.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* View Switcher */}
      {view === 'list' && (
        <>
          {/* Stats Summary */}
          {stats && !isFilteredMode && (
            <div className="bg-gray-800 rounded-lg p-3 mb-4">
              <div className="flex justify-between text-sm">
                <div>
                  <span className="text-gray-400">Jobs: </span>
                  <span className="text-white">{stats.totalJobs}</span>
                </div>
                <div>
                  <span className="text-gray-400">Signs: </span>
                  <span className="text-white">{stats.totalSigns}</span>
                </div>
                <div>
                  <span className="text-gray-400">Awaiting: </span>
                  <span className="text-yellow-400">{stats.signsAwaitingRetrieval}</span>
                </div>
              </div>
              {(stats.dueForRetrieval > 0 || stats.dueForMaintenance > 0 || stats.tbaJobs > 0) && (
                <div className="mt-2 pt-2 border-t border-gray-700 flex gap-3 text-xs">
                  {stats.dueForRetrieval > 0 && (
                    <span className="text-red-400">🔴 {stats.dueForRetrieval} retrieval</span>
                  )}
                  {stats.dueForMaintenance > 0 && (
                    <span className="text-yellow-400">
                      🟡 {stats.dueForMaintenance} maintenance
                    </span>
                  )}
                  {stats.tbaJobs > 0 && (
                    <span className="text-gray-400">⚪ {stats.tbaJobs} TBA</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 mb-4">
            <Button onClick={() => setView('add')} className="flex-1 bg-cyan-700 hover:bg-cyan-600">
              ➕ New Job
            </Button>
            <Link href="/aftercare/map" className="flex-1">
              <Button
                variant="outline"
                className="w-full border-teal-700 text-teal-400 bg-teal-900/30"
              >
                🗺️ Map
              </Button>
            </Link>
            <Button
              onClick={() => setView('presets')}
              variant="outline"
              className="flex-1 border-cyan-700 text-cyan-400 bg-cyan-900/30"
            >
              ⚙️ Presets
            </Button>
          </div>

          {/* Route Optimization & Print Buttons */}
          {(signStatusCounts.dueRetrieval > 0 ||
            signStatusCounts.dueMaintenance > 0 ||
            jobs.length > 0) && (
            <div className="bg-gray-800 rounded-lg p-3 mb-4">
              <div className="flex gap-2 flex-wrap">
                {signStatusCounts.dueRetrieval > 0 && (
                  <Button
                    onClick={handleOpenAllRetrievalRoute}
                    disabled={isOptimizing}
                    className="flex-1 bg-red-700 hover:bg-red-600 text-xs h-7 min-w-[100px]"
                  >
                    {isOptimizing ? '⏳' : `🔴 Retrieve (${signStatusCounts.dueRetrieval})`}
                  </Button>
                )}
                {signStatusCounts.dueMaintenance > 0 && (
                  <Button
                    onClick={handleOpenAllMaintenanceRoute}
                    disabled={isOptimizing}
                    className="flex-1 bg-yellow-700 hover:bg-yellow-600 text-xs h-7 min-w-[100px]"
                  >
                    {isOptimizing ? '⏳' : `🟡 Maintain (${signStatusCounts.dueMaintenance})`}
                  </Button>
                )}
                {jobs.length > 0 && (
                  <Button
                    onClick={handlePrintReport}
                    className="flex-1 bg-purple-700 hover:bg-purple-600 text-xs h-7 min-w-[100px]"
                  >
                    🖨️ Report
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Job Lists by Status */}

          {/* Due for Retrieval */}
          {groupedJobs.dueRetrieval.length > 0 && (
            <JobSection
              title="⏰ Due for Retrieval"
              jobs={groupedJobs.dueRetrieval}
              onEdit={(job) => {
                setEditingJob(job);
                setView('edit');
              }}
              onDelete={handleDeleteJob}
              onArchive={handleArchive}
              onShare={handleShare}
              onMap={handleOpenMap}
              onMarkRetrieved={handleMarkAllRetrieved}
            />
          )}

          {/* Due for Maintenance */}
          {groupedJobs.dueMaintenance.length > 0 && (
            <JobSection
              title="🔧 Due for Maintenance"
              jobs={groupedJobs.dueMaintenance}
              onEdit={(job) => {
                setEditingJob(job);
                setView('edit');
              }}
              onDelete={handleDeleteJob}
              onArchive={handleArchive}
              onShare={handleShare}
              onMap={handleOpenMap}
              onMarkMaintained={handleMarkAllMaintained}
            />
          )}

          {/* TBA */}
          {groupedJobs.tba.length > 0 && (
            <JobSection
              title="⏳ TBA - Awaiting Instruction"
              jobs={groupedJobs.tba}
              onEdit={(job) => {
                setEditingJob(job);
                setView('edit');
              }}
              onDelete={handleDeleteJob}
              onArchive={handleArchive}
              onShare={handleShare}
              onMap={handleOpenMap}
            />
          )}

          {/* Active (not yet due) */}
          {groupedJobs.active.length > 0 && (
            <JobSection
              title="✅ Active - Not Yet Due"
              jobs={groupedJobs.active}
              onEdit={(job) => {
                setEditingJob(job);
                setView('edit');
              }}
              onDelete={handleDeleteJob}
              onArchive={handleArchive}
              onShare={handleShare}
              onMap={handleOpenMap}
              defaultExpanded={false}
            />
          )}

          {/* Retrieved (not archived) */}
          {groupedJobs.retrieved.length > 0 && (
            <JobSection
              title="✓ Retrieved"
              jobs={groupedJobs.retrieved}
              onEdit={(job) => {
                setEditingJob(job);
                setView('edit');
              }}
              onDelete={handleDeleteJob}
              onArchive={handleArchive}
              onShare={handleShare}
              onMap={handleOpenMap}
              defaultExpanded={false}
            />
          )}

          {/* Archived */}
          {groupedJobs.archived.length > 0 && (
            <div className="mt-6">
              <button
                onClick={() => setShowArchived(!showArchived)}
                className="text-gray-500 text-sm flex items-center gap-1"
              >
                <span className={`transition-transform ${showArchived ? 'rotate-90' : ''}`}>›</span>
                📦 Archived ({groupedJobs.archived.length})
              </button>

              {showArchived && (
                <JobSection
                  title=""
                  jobs={groupedJobs.archived}
                  onEdit={(job) => {
                    setEditingJob(job);
                    setView('edit');
                  }}
                  onDelete={handleDeleteJob}
                  onUnarchive={handleUnarchive}
                  onShare={handleShare}
                  defaultExpanded={true}
                />
              )}
            </div>
          )}

          {/* Empty State */}
          {jobs.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-4xl mb-4">🚧</p>
              <p>No AfterCare jobs yet</p>
              <p className="text-sm mt-2">Tap "New Job" to add signage tracking</p>
            </div>
          )}

          {/* Export/Import */}
          {jobs.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-700">
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    const json = exportAllJobs();
                    navigator.clipboard.writeText(json);
                    alert('All jobs exported to clipboard!');
                  }}
                  variant="outline"
                  className="flex-1 border-green-700 text-green-400 bg-green-900/30 text-sm"
                >
                  📤 Export All
                </Button>
                <Button
                  onClick={() => {
                    const json = prompt('Paste exported jobs JSON:');
                    if (json) {
                      const result = importJobs(json, false);
                      if (result.success) {
                        alert(`Imported ${result.count} jobs`);
                        refreshData();
                      } else {
                        alert(`Import failed: ${result.error}`);
                      }
                    }
                  }}
                  variant="outline"
                  className="flex-1 border-blue-700 text-blue-400 bg-blue-900/30 text-sm"
                >
                  📥 Import
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Job View */}
      {view === 'add' && (
        <AddJobView
          onBack={() => setView('list')}
          onSave={(job) => {
            refreshData();
            setView('list');
          }}
        />
      )}

      {/* Edit Job View */}
      {view === 'edit' && editingJob && (
        <EditJobView
          job={editingJob}
          onBack={() => {
            setEditingJob(null);
            setView('list');
          }}
          onSave={() => {
            refreshData();
            setView('list');
          }}
        />
      )}

      {/* Presets View */}
      {view === 'presets' && <PresetsView onBack={() => setView('list')} onUpdate={refreshData} />}
    </div>
  );
}

// Default export with Suspense wrapper for useSearchParams
export default function AfterCarePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-900 text-white p-4 max-w-lg mx-auto">
          <div className="text-center py-12">
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
      }
    >
      <AfterCareContent />
    </Suspense>
  );
}

// ============================================
// JOB SECTION COMPONENT
// ============================================

interface JobSectionProps {
  title: string;
  jobs: AfterCareJob[];
  onEdit: (job: AfterCareJob) => void;
  onDelete: (jobId: string) => void;
  onArchive?: (jobId: string) => void;
  onUnarchive?: (jobId: string) => void;
  onShare?: (job: AfterCareJob) => void;
  onMap?: (job: AfterCareJob, filter: MapFilter) => void;
  onMarkRetrieved?: (jobId: string) => void;
  onMarkMaintained?: (jobId: string) => void;
  defaultExpanded?: boolean;
}

function JobSection({
  title,
  jobs,
  onEdit,
  onDelete,
  onArchive,
  onUnarchive,
  onShare,
  onMap,
  onMarkRetrieved,
  onMarkMaintained,
  defaultExpanded = true,
}: JobSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (jobs.length === 0) return null;

  return (
    <div className="mb-4">
      {title && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left text-sm font-semibold text-gray-400 mb-2 flex items-center gap-1"
        >
          <span className={`transition-transform ${expanded ? 'rotate-90' : ''}`}>›</span>
          {title} ({jobs.length})
        </button>
      )}

      {expanded && (
        <div className="space-y-2">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onEdit={() => onEdit(job)}
              onDelete={() => onDelete(job.id)}
              onArchive={onArchive ? () => onArchive(job.id) : undefined}
              onUnarchive={onUnarchive ? () => onUnarchive(job.id) : undefined}
              onShare={onShare ? () => onShare(job) : undefined}
              onMap={onMap ? (filter) => onMap(job, filter) : undefined}
              onMarkRetrieved={onMarkRetrieved ? () => onMarkRetrieved(job.id) : undefined}
              onMarkMaintained={onMarkMaintained ? () => onMarkMaintained(job.id) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// JOB CARD COMPONENT
// ============================================

interface JobCardProps {
  job: AfterCareJob;
  onEdit: () => void;
  onDelete: () => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
  onShare?: () => void;
  onMap?: (filter: MapFilter) => void;
  onMarkRetrieved?: () => void;
  onMarkMaintained?: () => void;
}

function JobCard({
  job,
  onEdit,
  onDelete,
  onArchive,
  onUnarchive,
  onShare,
  onMap,
  onMarkRetrieved,
  onMarkMaintained,
}: JobCardProps) {
  const [showActions, setShowActions] = useState(false);

  const status = calculateJobStatus(job);
  const statusInfo = getStatusInfo(status);
  const statusCounts = getSignStatusCounts(job);

  // Check which signs have GPS coords for map buttons (use calculated status)
  const hasGpsCoords = job.signs.some((s) => s.lat && s.lon);
  const hasActiveWithGps = job.signs.some((s) => {
    if (!s.lat || !s.lon) return false;
    const calculatedStatus = calculateSignStatus(s);
    return calculatedStatus !== 'retrieved';
  });
  const hasRetrievalWithGps = job.signs.some((s) => {
    if (!s.lat || !s.lon) return false;
    const calculatedStatus = calculateSignStatus(s);
    return calculatedStatus === 'due-retrieval';
  });
  const hasMaintenanceWithGps = job.signs.some((s) => {
    if (!s.lat || !s.lon) return false;
    const calculatedStatus = calculateSignStatus(s);
    return calculatedStatus === 'due-maintenance' || calculatedStatus === 'maintained';
  });

  // Get SLK range
  const slks = job.signs.map((s) => s.slk);
  const minSlk = slks.length > 0 ? Math.min(...slks) : 0;
  const maxSlk = slks.length > 0 ? Math.max(...slks) : 0;
  const slkRange =
    minSlk === maxSlk ? minSlk.toFixed(2) : `${minSlk.toFixed(2)} - ${maxSlk.toFixed(2)}`;

  return (
    <div className="bg-gray-800 rounded-lg p-3">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-green-400">{job.road_id}</span>
            {job.road_name && <span className="text-xs text-gray-400">{job.road_name}</span>}
            <span className="text-xs text-gray-500">{formatAusDate(job.date_created)}</span>
          </div>
          <p className="text-white text-sm font-medium mt-1">{job.job_name}</p>
        </div>
        <button
          onClick={() => setShowActions(!showActions)}
          className="text-gray-500 hover:text-gray-300 p-1"
        >
          ⋮
        </button>
      </div>

      {/* Status & Info */}
      <div className="mt-2 text-xs">
        <div className="flex items-center gap-2">
          <span className={statusInfo.color}>{statusInfo.icon}</span>
          <span className={statusInfo.color}>{statusInfo.label}</span>
        </div>
      </div>

      {/* Status Badges */}
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        {statusCounts.dueRetrieval > 0 && (
          <span className="bg-red-900/50 text-red-400 px-2 py-0.5 rounded-full">
            🔴 {statusCounts.dueRetrieval} retrieval
          </span>
        )}
        {statusCounts.dueMaintenance > 0 && (
          <span className="bg-yellow-900/50 text-yellow-400 px-2 py-0.5 rounded-full">
            🟡 {statusCounts.dueMaintenance} maintenance
          </span>
        )}
        {statusCounts.active > 0 && (
          <span className="bg-green-900/50 text-green-400 px-2 py-0.5 rounded-full">
            🟢 {statusCounts.active} active
          </span>
        )}
        {statusCounts.retrieved > 0 && (
          <span className="bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">
            ✅ {statusCounts.retrieved} retrieved
          </span>
        )}
      </div>

      {/* Map Buttons */}
      {onMap && hasGpsCoords && (
        <div className="mt-2 flex flex-wrap gap-1 justify-end">
          {hasActiveWithGps && (
            <Button
              onClick={() => onMap('all')}
              size="sm"
              className="bg-teal-700 hover:bg-teal-600 text-xs h-7"
            >
              All
            </Button>
          )}
          {hasRetrievalWithGps && (
            <Button
              onClick={() => onMap('retrieval')}
              size="sm"
              className="bg-red-700 hover:bg-red-600 text-xs h-7"
            >
              Retrieval
            </Button>
          )}
          {hasMaintenanceWithGps && (
            <Button
              onClick={() => onMap('maintenance')}
              size="sm"
              className="bg-yellow-700 hover:bg-yellow-600 text-xs h-7"
            >
              Maintain
            </Button>
          )}
        </div>
      )}

      {/* Actions */}
      {showActions && (
        <div className="mt-3 pt-3 border-t border-gray-700 flex gap-1">
          <Button
            onClick={onEdit}
            size="sm"
            className="bg-blue-700 hover:bg-blue-600 text-xs h-7 px-2 flex-1"
          >
            Edt
          </Button>
          {onMarkRetrieved && (statusCounts.dueRetrieval > 0 || statusCounts.active > 0) && (
            <Button
              onClick={onMarkRetrieved}
              size="sm"
              className="bg-green-700 hover:bg-green-600 text-xs h-7 px-2 flex-1"
            >
              Ret
            </Button>
          )}
          {onMarkMaintained && statusCounts.dueMaintenance > 0 && (
            <Button
              onClick={onMarkMaintained}
              size="sm"
              className="bg-yellow-700 hover:bg-yellow-600 text-xs h-7 px-2 flex-1"
            >
              Maint
            </Button>
          )}
          {onShare && (
            <Button
              onClick={onShare}
              size="sm"
              className="bg-indigo-700 hover:bg-indigo-600 text-xs h-7 px-2 flex-1"
            >
              Share
            </Button>
          )}
          {onArchive && (
            <Button
              onClick={onArchive}
              size="sm"
              className="bg-amber-700 hover:bg-amber-600 text-xs h-7 px-2 flex-1"
            >
              Arch
            </Button>
          )}
          {onUnarchive && (
            <Button
              onClick={onUnarchive}
              size="sm"
              className="bg-amber-700 hover:bg-amber-600 text-xs h-7 px-2 flex-1"
            >
              Unarch
            </Button>
          )}
          <Button
            onClick={onDelete}
            size="sm"
            className="bg-red-700 hover:bg-red-600 text-xs h-7 px-2 flex-1"
          >
            Del
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================
// ADD JOB VIEW
// ============================================

interface AddJobViewProps {
  onBack: () => void;
  onSave: (job: AfterCareJob) => void;
}

function AddJobView({ onBack, onSave }: AddJobViewProps) {
  // Form state
  const [roadId, setRoadId] = useState('');
  const [roadName, setRoadName] = useState('');
  const [isLookingUpRoad, setIsLookingUpRoad] = useState(false);
  const [notes, setNotes] = useState('');
  const [signs, setSigns] = useState<AfterCareSign[]>([]);
  const [workAreaSlkStart, setWorkAreaSlkStart] = useState<string>('');
  const [workAreaSlkEnd, setWorkAreaSlkEnd] = useState<string>('');

  // Sign entry state
  const [signSlk, setSignSlk] = useState('');
  const [signCategory, setSignCategory] = useState<SignCategory>('surface');
  const [signType, setSignType] = useState('');
  const [signDescription, setSignDescription] = useState('');
  const [signDirection, setSignDirection] = useState<SignDirection>('True Left');
  const [bothSides, setBothSides] = useState(false);
  const [signPlacedTime, setSignPlacedTime] = useState<string>(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  });
  // Per-sign retrieval type (not job-level)
  const [signRetrievalType, setSignRetrievalType] = useState<RetrievalType>('standard');
  const [signRetrievalDate, setSignRetrievalDate] = useState(getDefaultScheduledDate());

  // Captured GPS state
  const [capturedGps, setCapturedGps] = useState<{ lat: number; lon: number } | null>(null);
  const [capturedRoadId, setCapturedRoadId] = useState<string | null>(null);
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Get presets
  const presets = getAfterCarePresets();
  const currentPresets = presets[signCategory] || [];

  // Lookup road name when road_id changes
  useEffect(() => {
    const lookupRoadName = async () => {
      if (roadId.length >= 2) {
        setIsLookingUpRoad(true);
        const roadInfo = await getRoadInfoById(roadId);
        if (roadInfo) {
          setRoadName(roadInfo.road_name);
        } else {
          setRoadName('');
        }
        setIsLookingUpRoad(false);
      } else {
        setRoadName('');
      }
    };

    const timeoutId = setTimeout(lookupRoadName, 300); // Debounce
    return () => clearTimeout(timeoutId);
  }, [roadId]);

  // Handle road ID change
  const handleRoadIdChange = (value: string) => {
    setRoadId(value.toUpperCase());
  };

  // Capture current location via GPS
  const handleCaptureLocation = async () => {
    setIsCapturingGps(true);
    setGpsError(null);

    try {
      // Get GPS position
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude } = position.coords;
      setCapturedGps({ lat: latitude, lon: longitude });

      // Try to find road and SLK from GPS
      try {
        const roadInfo = await findRoadNearGps(latitude, longitude, 0.5);
        if (roadInfo) {
          setSignSlk(roadInfo.slk.toFixed(2));
          setCapturedRoadId(roadInfo.road_id);
          // Auto-fill road ID and road name if not already set
          if (!roadId) {
            setRoadId(roadInfo.road_id);
          }
          if (!roadName && roadInfo.road_name) {
            setRoadName(roadInfo.road_name);
          }
        } else {
          setGpsError('Could not find a nearby road. SLK will need to be entered manually.');
        }
      } catch (e) {
        setGpsError('Could not determine road from GPS location.');
      }
    } catch (e: any) {
      if (e.code === 1) {
        setGpsError('GPS permission denied. Please enable location access.');
      } else if (e.code === 2) {
        setGpsError('GPS position unavailable. Check your device location settings.');
      } else if (e.code === 3) {
        setGpsError('GPS timeout. Try again in an area with better signal.');
      } else {
        setGpsError('Failed to get GPS position.');
      }
    } finally {
      setIsCapturingGps(false);
    }
  };

  // Add sign to list
  const handleAddSign = () => {
    if (!signSlk || !signType) {
      alert('Please enter SLK and sign type');
      return;
    }

    const slk = parseFloat(signSlk);
    if (isNaN(slk)) {
      alert('Invalid SLK value');
      return;
    }

    // Use captured GPS if available
    const useCapturedGps = capturedGps !== null;

    // Base sign properties with retrieval_type
    const baseSign = {
      slk,
      lat: useCapturedGps ? capturedGps!.lat : null,
      lon: useCapturedGps ? capturedGps!.lon : null,
      category: signCategory,
      sign_type: signType,
      description: signDescription,
      placed_date: toIsoDate(new Date()),
      placed_time: signPlacedTime,
      retrieval_type: signRetrievalType,
      retrieval_date: signRetrievalType === 'scheduled' ? signRetrievalDate : undefined,
      status: 'placed' as const,
      status_manually_set: false,
      notes: '',
    };

    if (bothSides) {
      // Add two signs
      const sign1: AfterCareSign = {
        id: generateId(),
        ...baseSign,
        direction: 'True Left',
      };
      const sign2: AfterCareSign = {
        ...sign1,
        id: generateId(),
        direction: 'True Right',
      };
      setSigns([...signs, sign1, sign2]);
    } else {
      const newSign: AfterCareSign = {
        id: generateId(),
        ...baseSign,
        direction: signDirection,
      };
      setSigns([...signs, newSign]);
    }

    // Reset sign form (keep SLK for quick entry)
    setSignType('');
    setSignDescription('');
    // Clear captured GPS after use
    setCapturedGps(null);
    setCapturedRoadId(null);
    // setSignSlk(''); // Keep SLK for quick multi-sign entry
  };

  // Remove sign
  const handleRemoveSign = (signId: string) => {
    setSigns(signs.filter((s) => s.id !== signId));
  };

  // Save job
  const handleSave = async () => {
    if (!roadId) {
      alert('Please enter a Road ID');
      return;
    }

    if (signs.length === 0) {
      alert('Please add at least one sign');
      return;
    }

    // Fetch GPS coordinates for signs that don't have them
    const finalRoadId = roadId.toUpperCase();
    const signsWithCoords = await Promise.all(
      signs.map(async (sign) => {
        if (sign.lat === null || sign.lon === null) {
          const coords = await fetchGpsFromSlk(finalRoadId, sign.slk);
          if (coords) {
            return { ...sign, lat: coords.lat, lon: coords.lon };
          }
        }
        return sign;
      })
    );

    // Auto-generate job name: Road ID, SLK range, date time
    const slks = signs.map((s) => s.slk);
    const minSlk = Math.min(...slks);
    const maxSlk = Math.max(...slks);
    const now = new Date();
    const dateStr = formatAusDate(now);
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    let autoJobName: string;
    if (minSlk === maxSlk) {
      // Single sign
      autoJobName = `${finalRoadId}, ${minSlk.toFixed(2)}, ${dateStr} ${timeStr}`;
    } else {
      // Multiple signs
      autoJobName = `${finalRoadId}, ${minSlk.toFixed(2)} - ${maxSlk.toFixed(2)}, ${dateStr} ${timeStr}`;
    }

    const job = createAfterCareJob({
      job_name: autoJobName,
      road_id: finalRoadId,
      road_name: roadName,
      notes,
      work_area_slk_start: workAreaSlkStart ? parseFloat(workAreaSlkStart) : undefined,
      work_area_slk_end: workAreaSlkEnd ? parseFloat(workAreaSlkEnd) : undefined,
      signs: signsWithCoords,
    });

    onSave(job);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="text-blue-400 text-sm">
          ← Back
        </button>
        <h2 className="text-lg font-bold text-cyan-400">➕ New AfterCare Job</h2>
        <div className="w-16"></div>
      </div>

      {/* Job Details */}
      <div className="bg-gray-800 rounded-lg p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">Job Details</h3>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500">Road ID</label>
              <Input
                value={roadId}
                onChange={(e) => handleRoadIdChange(e.target.value)}
                placeholder="M031"
                className="bg-gray-700 border-gray-600 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">
                Road Name <span className="text-gray-600">(auto)</span>
              </label>
              <Input
                value={isLookingUpRoad ? 'Looking up...' : roadName}
                readOnly
                placeholder="—"
                className="bg-gray-800 border-gray-600 text-gray-400 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Capture Current Road Button */}
          <Button
            onClick={handleCaptureLocation}
            disabled={isCapturingGps}
            className="w-full bg-purple-700 hover:bg-purple-600 text-sm"
          >
            {isCapturingGps ? '📍 Capturing...' : '📍 Capture Current Road'}
          </Button>
          {gpsError && <p className="text-xs text-red-400">{gpsError}</p>}
          {capturedRoadId && (
            <p className="text-xs text-green-400">✓ Road detected: {capturedRoadId}</p>
          )}

          {/* Work Area SLK Range */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Work Area (optional)</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Input
                  value={workAreaSlkStart}
                  onChange={(e) => setWorkAreaSlkStart(e.target.value)}
                  placeholder="Start SLK"
                  className="bg-gray-700 border-gray-600 text-white font-mono text-sm"
                />
              </div>
              <div>
                <Input
                  value={workAreaSlkEnd}
                  onChange={(e) => setWorkAreaSlkEnd(e.target.value)}
                  placeholder="End SLK"
                  className="bg-gray-700 border-gray-600 text-white font-mono text-sm"
                />
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-1">e.g., 64.00 - 67.50</p>
          </div>

          <div>
            <label className="text-xs text-gray-500">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Client, contact, special instructions..."
              className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white text-sm resize-none"
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* Add Signs */}
      <div className="bg-gray-800 rounded-lg p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">Add Signs</h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500">SLK</label>
            <div className="flex gap-2">
              <Input
                value={signSlk}
                onChange={(e) => setSignSlk(e.target.value)}
                placeholder="64.50"
                className="bg-gray-700 border-gray-600 text-white font-mono flex-1"
              />
              <Button
                onClick={handleCaptureLocation}
                disabled={isCapturingGps}
                className="bg-blue-700 hover:bg-blue-600 text-xs px-3"
                title="Capture current location via GPS"
              >
                {isCapturingGps ? '📍...' : '📍 GPS'}
              </Button>
            </div>
            {/* GPS Status */}
            {capturedGps && (
              <p className="text-xs text-green-400 mt-1">
                ✓ GPS captured: {capturedGps.lat.toFixed(5)}, {capturedGps.lon.toFixed(5)}
                {capturedRoadId && <span className="text-gray-500"> ({capturedRoadId})</span>}
              </p>
            )}
            {gpsError && <p className="text-xs text-red-400 mt-1">{gpsError}</p>}
          </div>

          <div>
            <label className="text-xs text-gray-500">Category</label>
            <select
              value={signCategory}
              onChange={(e) => {
                setSignCategory(e.target.value as SignCategory);
                setSignType('');
              }}
              className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white"
            >
              <option value="surface">Surface</option>
              <option value="speed">Speed</option>
              <option value="hazard">Hazard</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500">Sign Type</label>
            <select
              value={signType}
              onChange={(e) => setSignType(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white"
            >
              <option value="">Select...</option>
              {currentPresets.map((preset) => (
                <option key={preset} value={preset}>
                  {preset}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500">Description (optional)</label>
            <Input
              value={signDescription}
              onChange={(e) => setSignDescription(e.target.value)}
              placeholder="e.g., Chip seal - loose stones"
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>

          {/* Time Placed */}
          <div>
            <label className="text-xs text-gray-500">Time Placed</label>
            <div className="flex gap-2 items-center">
              <Input
                type="time"
                value={signPlacedTime}
                onChange={(e) => setSignPlacedTime(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white flex-1"
              />
              <Button
                onClick={() => {
                  const now = new Date();
                  setSignPlacedTime(
                    `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
                  );
                }}
                size="sm"
                className="bg-purple-700 hover:bg-purple-600 text-xs"
              >
                Now
              </Button>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-2 block">Side of Road</label>
            {!bothSides && (
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => setSignDirection('True Left')}
                  className={`flex-1 p-2 rounded border text-sm ${signDirection === 'True Left' ? 'bg-blue-800 border-blue-600' : 'bg-gray-700 border-gray-600'}`}
                >
                  True Left (↑)
                </button>
                <button
                  onClick={() => setSignDirection('True Right')}
                  className={`flex-1 p-2 rounded border text-sm ${signDirection === 'True Right' ? 'bg-yellow-800 border-yellow-600' : 'bg-gray-700 border-gray-600'}`}
                >
                  True Right (↓)
                </button>
              </div>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={bothSides}
                onChange={(e) => setBothSides(e.target.checked)}
                className="rounded"
              />
              Add same sign to both sides
            </label>
          </div>

          {/* Retrieval Type for this sign */}
          <div className="border-t border-gray-600 pt-3">
            <label className="text-xs text-gray-500 mb-2 block">Retrieval Type</label>
            <div className="grid grid-cols-3 gap-1 text-xs">
              <button
                onClick={() => setSignRetrievalType('standard')}
                className={`p-2 rounded border ${signRetrievalType === 'standard' ? 'bg-cyan-800 border-cyan-600' : 'bg-gray-700 border-gray-600'}`}
              >
                Standard (2 days)
              </button>
              <button
                onClick={() => setSignRetrievalType('scheduled')}
                className={`p-2 rounded border ${signRetrievalType === 'scheduled' ? 'bg-cyan-800 border-cyan-600' : 'bg-gray-700 border-gray-600'}`}
              >
                Scheduled
              </button>
              <button
                onClick={() => setSignRetrievalType('tba')}
                className={`p-2 rounded border ${signRetrievalType === 'tba' ? 'bg-gray-600 border-gray-500' : 'bg-gray-700 border-gray-600'}`}
              >
                TBA
              </button>
              <button
                onClick={() => setSignRetrievalType('maintain-daily')}
                className={`p-2 rounded border ${signRetrievalType === 'maintain-daily' ? 'bg-yellow-800 border-yellow-600' : 'bg-gray-700 border-gray-600'}`}
              >
                Daily
              </button>
              <button
                onClick={() => setSignRetrievalType('maintain-weekly')}
                className={`p-2 rounded border ${signRetrievalType === 'maintain-weekly' ? 'bg-yellow-800 border-yellow-600' : 'bg-gray-700 border-gray-600'}`}
              >
                Weekly
              </button>
              <button
                onClick={() => setSignRetrievalType('maintain-monthly')}
                className={`p-2 rounded border ${signRetrievalType === 'maintain-monthly' ? 'bg-yellow-800 border-yellow-600' : 'bg-gray-700 border-gray-600'}`}
              >
                Monthly
              </button>
            </div>
            {signRetrievalType === 'scheduled' && (
              <Input
                type="date"
                value={signRetrievalDate}
                onChange={(e) => setSignRetrievalDate(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white mt-2 text-sm"
              />
            )}
          </div>

          <Button onClick={handleAddSign} className="w-full bg-green-700 hover:bg-green-600">
            ✓ Add Sign
          </Button>
        </div>
      </div>

      {/* Signs List */}
      {signs.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Signs ({signs.length})</h3>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {signs.map((sign) => (
              <div
                key={sign.id}
                className="flex items-center justify-between bg-gray-700 rounded p-2 text-sm"
              >
                <div>
                  <div className="flex items-center gap-2">
                    {/* Status Dot - green for new signs */}
                    <span
                      className={`w-2 h-2 rounded-full ${
                        sign.retrieval_type === 'tba'
                          ? 'bg-gray-400'
                          : sign.retrieval_type.startsWith('maintain')
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                      }`}
                      title={
                        sign.retrieval_type === 'tba'
                          ? 'TBA'
                          : sign.retrieval_type.startsWith('maintain')
                            ? 'Maintenance'
                            : 'Active'
                      }
                    ></span>
                    <span className="font-mono text-cyan-400">SLK {sign.slk.toFixed(2)}</span>
                    <span className="text-gray-400 mx-1">|</span>
                    <span className="text-white">{sign.sign_type}</span>
                    <span className="text-gray-500 text-xs">
                      ({sign.direction === 'True Left' ? 'TL' : 'TR'})
                    </span>
                  </div>
                  {sign.description && (
                    <span className="text-gray-500 text-xs block mt-1">{sign.description}</span>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveSign(sign.id)}
                  className="text-red-400 hover:text-red-300 px-2"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save Button */}
      <Button onClick={handleSave} className="w-full bg-cyan-700 hover:bg-cyan-600 h-12 text-base">
        💾 Save Job
      </Button>
    </div>
  );
}

// ============================================
// EDIT JOB VIEW
// ============================================

interface EditJobViewProps {
  job: AfterCareJob;
  onBack: () => void;
  onSave: () => void;
}

function EditJobView({ job: initialJob, onBack, onSave }: EditJobViewProps) {
  const [job, setJob] = useState<AfterCareJob>(initialJob);
  const [showAddSign, setShowAddSign] = useState(false);

  // Sign entry state
  const [signSlk, setSignSlk] = useState('');
  const [signCategory, setSignCategory] = useState<SignCategory>('surface');
  const [signType, setSignType] = useState('');
  const [signDescription, setSignDescription] = useState('');
  const [signDirection, setSignDirection] = useState<SignDirection>('True Left');
  const [bothSides, setBothSides] = useState(false);
  // Per-sign retrieval type (defaults to standard)
  const [signRetrievalType, setSignRetrievalType] = useState<RetrievalType>('standard');
  const [signRetrievalDate, setSignRetrievalDate] = useState<string>(getDefaultScheduledDate());

  // Captured GPS state
  const [capturedGps, setCapturedGps] = useState<{ lat: number; lon: number } | null>(null);
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Edit sign state
  const [editingSignId, setEditingSignId] = useState<string | null>(null);
  const [editSlk, setEditSlk] = useState('');
  const [editCategory, setEditCategory] = useState<SignCategory>('surface');
  const [editType, setEditType] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDirection, setEditDirection] = useState<SignDirection>('True Left');
  const [editRetrievalType, setEditRetrievalType] = useState<RetrievalType>('standard');
  const [editRetrievalDate, setEditRetrievalDate] = useState('');

  // Get presets
  const presets = getAfterCarePresets();
  const currentPresets = presets[signCategory] || [];
  const editPresets = presets[editCategory] || [];

  // Update job field
  const updateField = (field: keyof AfterCareJob, value: any) => {
    setJob({ ...job, [field]: value });
  };

  // Capture current location via GPS
  const handleCaptureLocation = async () => {
    setIsCapturingGps(true);
    setGpsError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude } = position.coords;
      setCapturedGps({ lat: latitude, lon: longitude });

      // Try to find road and SLK from GPS
      try {
        const roadInfo = await findRoadNearGps(latitude, longitude, 0.5);
        if (roadInfo) {
          setSignSlk(roadInfo.slk.toFixed(2));
        }
      } catch (e) {
        // Just use the GPS coords without SLK
      }
    } catch (e: any) {
      if (e.code === 1) {
        setGpsError('GPS permission denied.');
      } else if (e.code === 2) {
        setGpsError('GPS position unavailable.');
      } else if (e.code === 3) {
        setGpsError('GPS timeout.');
      } else {
        setGpsError('Failed to get GPS position.');
      }
    } finally {
      setIsCapturingGps(false);
    }
  };

  // Save changes
  const handleSaveChanges = async () => {
    // Fetch GPS coordinates for signs that don't have them
    const signsWithCoords = await Promise.all(
      job.signs.map(async (sign) => {
        if (sign.lat === null || sign.lon === null) {
          const coords = await fetchGpsFromSlk(job.road_id, sign.slk);
          if (coords) {
            return { ...sign, lat: coords.lat, lon: coords.lon };
          }
        }
        return sign;
      })
    );

    // Auto-generate job name with update timestamp
    let autoJobName = job.job_name;
    if (signsWithCoords.length > 0) {
      const slks = signsWithCoords.map((s) => s.slk);
      const minSlk = Math.min(...slks);
      const maxSlk = Math.max(...slks);
      const now = new Date();
      const dateStr = formatAusDate(now);
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      if (minSlk === maxSlk) {
        autoJobName = `${job.road_id}, ${minSlk.toFixed(2)}, ${dateStr} ${timeStr} (U)`;
      } else {
        autoJobName = `${job.road_id}, ${minSlk.toFixed(2)} - ${maxSlk.toFixed(2)}, ${dateStr} ${timeStr} (U)`;
      }
    }

    updateAfterCareJob(job.id, { ...job, job_name: autoJobName, signs: signsWithCoords });
    onSave();
  };

  // Add sign
  const handleAddSign = () => {
    if (!signSlk || !signType) {
      alert('Please enter SLK and sign type');
      return;
    }

    const slk = parseFloat(signSlk);
    if (isNaN(slk)) {
      alert('Invalid SLK value');
      return;
    }

    // Use captured GPS if available
    const useCapturedGps = capturedGps !== null;

    // Base sign properties with retrieval_type
    const baseSign = {
      slk,
      lat: useCapturedGps ? capturedGps!.lat : null,
      lon: useCapturedGps ? capturedGps!.lon : null,
      category: signCategory,
      sign_type: signType,
      description: signDescription,
      placed_date: toIsoDate(new Date()),
      retrieval_type: signRetrievalType,
      retrieval_date: signRetrievalType === 'scheduled' ? signRetrievalDate : undefined,
      status: 'placed' as const,
      status_manually_set: false,
      notes: '',
    };

    if (bothSides) {
      const sign1: AfterCareSign = {
        id: generateId(),
        ...baseSign,
        direction: 'True Left',
      };
      const sign2: AfterCareSign = {
        ...sign1,
        id: generateId(),
        direction: 'True Right',
      };
      setJob({ ...job, signs: [...job.signs, sign1, sign2] });
    } else {
      const newSign: AfterCareSign = {
        id: generateId(),
        ...baseSign,
        direction: signDirection,
      };
      setJob({ ...job, signs: [...job.signs, newSign] });
    }

    setSignSlk('');
    setSignType('');
    setSignDescription('');
    setCapturedGps(null);
    setShowAddSign(false);
  };

  // Remove sign
  const handleRemoveSign = (signId: string) => {
    setJob({ ...job, signs: job.signs.filter((s) => s.id !== signId) });
  };

  // Mark sign retrieved
  const handleMarkSignRetrieved = (signId: string) => {
    const updatedSigns = job.signs.map((s) =>
      s.id === signId
        ? { ...s, status: 'retrieved' as const, retrieved_date: toIsoDate(new Date()) }
        : s
    );
    setJob({ ...job, signs: updatedSigns });
  };

  // Mark sign for early retrieval (manual override)
  const handleMarkSignDueRetrieval = (signId: string) => {
    const updatedSigns = job.signs.map((s) =>
      s.id === signId ? { ...s, status: 'due-retrieval' as const, status_manually_set: true } : s
    );
    setJob({ ...job, signs: updatedSigns });
  };

  // Unretrieve sign (undo retrieved)
  const handleUnretrieveSign = (signId: string) => {
    const updatedSigns = job.signs.map((s) =>
      s.id === signId
        ? { ...s, status: 'placed' as const, retrieved_date: undefined, status_manually_set: false }
        : s
    );
    setJob({ ...job, signs: updatedSigns });
  };

  // Clear manual override
  const handleClearOverride = (signId: string) => {
    const updatedSigns = job.signs.map((s) =>
      s.id === signId ? { ...s, status_manually_set: false } : s
    );
    setJob({ ...job, signs: updatedSigns });
  };

  // Start editing a sign
  const handleStartEditSign = (sign: AfterCareSign) => {
    setEditingSignId(sign.id);
    setEditSlk(sign.slk.toString());
    setEditCategory(sign.category);
    setEditType(sign.sign_type);
    setEditDescription(sign.description);
    setEditDirection(sign.direction);
    setEditRetrievalType(sign.retrieval_type);
    setEditRetrievalDate(sign.retrieval_date || getDefaultScheduledDate());
  };

  // Save edited sign
  const handleSaveEditSign = () => {
    if (!editSlk || !editType) {
      alert('Please enter SLK and sign type');
      return;
    }

    const slk = parseFloat(editSlk);
    if (isNaN(slk)) {
      alert('Invalid SLK value');
      return;
    }

    const updatedSigns = job.signs.map((s) =>
      s.id === editingSignId
        ? {
            ...s,
            slk,
            category: editCategory,
            sign_type: editType,
            description: editDescription,
            direction: editDirection,
            retrieval_type: editRetrievalType,
            retrieval_date: editRetrievalType === 'scheduled' ? editRetrievalDate : undefined,
          }
        : s
    );
    setJob({ ...job, signs: updatedSigns });
    setEditingSignId(null);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingSignId(null);
  };

  const status = calculateJobStatus(job);
  const statusInfo = getStatusInfo(status);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="text-blue-400 text-sm">
          ← Back
        </button>
        <h2 className="text-lg font-bold text-cyan-400">📋 Edit Job</h2>
        <div className="w-16"></div>
      </div>

      {/* Job Status */}
      <div className="bg-gray-800 rounded-lg p-3 mb-4">
        <div className="flex items-center gap-2">
          <span className={statusInfo.color}>{statusInfo.icon}</span>
          <span className={statusInfo.color}>{statusInfo.label}</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">Created: {formatAusDate(job.date_created)}</p>
      </div>

      {/* Job Details */}
      <div className="bg-gray-800 rounded-lg p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">Job Details</h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500">
              Job Name <span className="text-gray-600">(auto-generated)</span>
            </label>
            <Input
              value={job.job_name}
              readOnly
              className="bg-gray-800 border-gray-600 text-gray-400 cursor-not-allowed"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500">
                Road ID <span className="text-gray-600">(locked)</span>
              </label>
              <Input
                value={job.road_id}
                readOnly
                className="bg-gray-800 border-gray-600 text-gray-400 font-mono cursor-not-allowed"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">
                Road Name <span className="text-gray-600">(auto)</span>
              </label>
              <Input
                value={job.road_name}
                readOnly
                className="bg-gray-800 border-gray-600 text-gray-400 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500">Notes</label>
            <textarea
              value={job.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white text-sm resize-none"
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* Signs List */}
      <div className="bg-gray-800 rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-gray-400">Signs ({job.signs.length})</h3>
          <Button
            onClick={() => setShowAddSign(!showAddSign)}
            size="sm"
            className={
              showAddSign ? 'bg-gray-600 hover:bg-gray-500' : 'bg-green-700 hover:bg-green-600'
            }
          >
            {showAddSign ? '✕ Cancel' : '➕ Add'}
          </Button>
        </div>

        {/* Add Sign Form */}
        {showAddSign && (
          <div className="bg-gray-700 rounded p-3 mb-3 space-y-2">
            <div className="flex gap-2">
              <Input
                value={signSlk}
                onChange={(e) => setSignSlk(e.target.value)}
                placeholder="SLK"
                className="bg-gray-600 border-gray-500 text-white flex-1"
              />
              <Button
                onClick={handleCaptureLocation}
                disabled={isCapturingGps}
                className="bg-blue-700 hover:bg-blue-600 text-xs px-3"
                title="Capture current location via GPS"
              >
                {isCapturingGps ? '📍...' : '📍 GPS'}
              </Button>
            </div>
            {/* GPS Status */}
            {capturedGps && (
              <p className="text-xs text-green-400">
                ✓ GPS captured: {capturedGps.lat.toFixed(5)}, {capturedGps.lon.toFixed(5)}
              </p>
            )}
            {gpsError && <p className="text-xs text-red-400">{gpsError}</p>}
            <select
              value={signCategory}
              onChange={(e) => {
                setSignCategory(e.target.value as SignCategory);
                setSignType('');
              }}
              className="w-full bg-gray-600 border border-gray-500 rounded-md p-2 text-white"
            >
              <option value="surface">Surface</option>
              <option value="speed">Speed</option>
              <option value="hazard">Hazard</option>
            </select>
            <select
              value={signType}
              onChange={(e) => setSignType(e.target.value)}
              className="w-full bg-gray-600 border border-gray-500 rounded-md p-2 text-white"
            >
              <option value="">Select sign type...</option>
              {currentPresets.map((preset) => (
                <option key={preset} value={preset}>
                  {preset}
                </option>
              ))}
            </select>
            <Input
              value={signDescription}
              onChange={(e) => setSignDescription(e.target.value)}
              placeholder="Description (optional)"
              className="bg-gray-600 border-gray-500 text-white"
            />
            {!bothSides && (
              <div className="flex gap-2">
                <button
                  onClick={() => setSignDirection('True Left')}
                  className={`flex-1 p-2 rounded border text-sm ${signDirection === 'True Left' ? 'bg-blue-800 border-blue-600' : 'bg-gray-600 border-gray-500'}`}
                >
                  True Left
                </button>
                <button
                  onClick={() => setSignDirection('True Right')}
                  className={`flex-1 p-2 rounded border text-sm ${signDirection === 'True Right' ? 'bg-yellow-800 border-yellow-600' : 'bg-gray-600 border-gray-500'}`}
                >
                  True Right
                </button>
              </div>
            )}

            {/* Retrieval Type for this sign */}
            <div className="border-t border-gray-600 pt-2 mt-2">
              <label className="text-xs text-gray-400 mb-1 block">Retrieval Type</label>
              <div className="grid grid-cols-3 gap-1 text-xs">
                <button
                  onClick={() => setSignRetrievalType('standard')}
                  className={`p-1.5 rounded border ${signRetrievalType === 'standard' ? 'bg-cyan-800 border-cyan-600' : 'bg-gray-600 border-gray-500'}`}
                >
                  Standard
                </button>
                <button
                  onClick={() => setSignRetrievalType('scheduled')}
                  className={`p-1.5 rounded border ${signRetrievalType === 'scheduled' ? 'bg-cyan-800 border-cyan-600' : 'bg-gray-600 border-gray-500'}`}
                >
                  Scheduled
                </button>
                <button
                  onClick={() => setSignRetrievalType('tba')}
                  className={`p-1.5 rounded border ${signRetrievalType === 'tba' ? 'bg-cyan-800 border-cyan-600' : 'bg-gray-600 border-gray-500'}`}
                >
                  TBA
                </button>
                <button
                  onClick={() => setSignRetrievalType('maintain-daily')}
                  className={`p-1.5 rounded border ${signRetrievalType === 'maintain-daily' ? 'bg-yellow-800 border-yellow-600' : 'bg-gray-600 border-gray-500'}`}
                >
                  Daily
                </button>
                <button
                  onClick={() => setSignRetrievalType('maintain-weekly')}
                  className={`p-1.5 rounded border ${signRetrievalType === 'maintain-weekly' ? 'bg-yellow-800 border-yellow-600' : 'bg-gray-600 border-gray-500'}`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setSignRetrievalType('maintain-monthly')}
                  className={`p-1.5 rounded border ${signRetrievalType === 'maintain-monthly' ? 'bg-yellow-800 border-yellow-600' : 'bg-gray-600 border-gray-500'}`}
                >
                  Monthly
                </button>
              </div>
              {signRetrievalType === 'scheduled' && (
                <Input
                  type="date"
                  value={signRetrievalDate}
                  onChange={(e) => setSignRetrievalDate(e.target.value)}
                  className="bg-gray-600 border-gray-500 text-white mt-2 text-sm"
                />
              )}
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={bothSides}
                onChange={(e) => setBothSides(e.target.checked)}
                className="rounded"
              />
              Both sides
            </label>
            <div className="flex gap-2">
              <Button onClick={handleAddSign} className="flex-1 bg-green-700 hover:bg-green-600">
                ✓ Add Sign
              </Button>
            </div>
          </div>
        )}

        {/* Signs */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {job.signs.map((sign) => {
            const signStatus = calculateSignStatus(sign);
            const signStatusInfo = {
              color:
                signStatus === 'retrieved'
                  ? 'text-gray-500'
                  : signStatus === 'due-retrieval'
                    ? 'text-red-400'
                    : signStatus === 'due-maintenance' || signStatus === 'maintained'
                      ? 'text-yellow-400'
                      : 'text-green-400',
              dotColor:
                signStatus === 'retrieved'
                  ? 'bg-gray-600'
                  : signStatus === 'due-retrieval'
                    ? 'bg-red-500'
                    : signStatus === 'due-maintenance' || signStatus === 'maintained'
                      ? 'bg-yellow-500'
                      : 'bg-green-500',
              label:
                signStatus === 'retrieved'
                  ? 'Retrieved'
                  : signStatus === 'due-retrieval'
                    ? 'Due for Retrieval'
                    : signStatus === 'due-maintenance'
                      ? 'Due for Maintenance'
                      : signStatus === 'maintained'
                        ? 'Maintained'
                        : 'Active',
            };

            // If this sign is being edited, show edit form
            if (editingSignId === sign.id) {
              return (
                <div key={sign.id} className="bg-cyan-900/30 rounded p-3 border border-cyan-600">
                  <div className="text-xs text-cyan-400 mb-2 font-semibold">✏️ Editing Sign</div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-400">SLK</label>
                        <Input
                          value={editSlk}
                          onChange={(e) => setEditSlk(e.target.value)}
                          className="bg-gray-700 border-gray-600 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">Direction</label>
                        <select
                          value={editDirection}
                          onChange={(e) => setEditDirection(e.target.value as SignDirection)}
                          className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white"
                        >
                          <option value="True Left">True Left (↑)</option>
                          <option value="True Right">True Right (↓)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-gray-400">Category</label>
                      <select
                        value={editCategory}
                        onChange={(e) => {
                          setEditCategory(e.target.value as SignCategory);
                          setEditType('');
                        }}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white"
                      >
                        <option value="surface">Surface</option>
                        <option value="speed">Speed</option>
                        <option value="hazard">Hazard</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-gray-400">Sign Type</label>
                      <select
                        value={editType}
                        onChange={(e) => setEditType(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white"
                      >
                        <option value="">Select...</option>
                        {editPresets.map((preset) => (
                          <option key={preset} value={preset}>
                            {preset}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-gray-400">Description</label>
                      <Input
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white"
                        placeholder="Optional"
                      />
                    </div>

                    {/* Retrieval Type */}
                    <div className="border-t border-gray-600 pt-2">
                      <label className="text-xs text-gray-400 mb-1 block">Retrieval Type</label>
                      <div className="grid grid-cols-3 gap-1 text-xs">
                        <button
                          onClick={() => setEditRetrievalType('standard')}
                          className={`p-2 rounded border ${editRetrievalType === 'standard' ? 'bg-cyan-800 border-cyan-600' : 'bg-gray-700 border-gray-600'}`}
                        >
                          Standard
                        </button>
                        <button
                          onClick={() => setEditRetrievalType('scheduled')}
                          className={`p-2 rounded border ${editRetrievalType === 'scheduled' ? 'bg-cyan-800 border-cyan-600' : 'bg-gray-700 border-gray-600'}`}
                        >
                          Scheduled
                        </button>
                        <button
                          onClick={() => setEditRetrievalType('tba')}
                          className={`p-2 rounded border ${editRetrievalType === 'tba' ? 'bg-gray-600 border-gray-500' : 'bg-gray-700 border-gray-600'}`}
                        >
                          TBA
                        </button>
                        <button
                          onClick={() => setEditRetrievalType('maintain-daily')}
                          className={`p-2 rounded border ${editRetrievalType === 'maintain-daily' ? 'bg-yellow-800 border-yellow-600' : 'bg-gray-700 border-gray-600'}`}
                        >
                          Daily
                        </button>
                        <button
                          onClick={() => setEditRetrievalType('maintain-weekly')}
                          className={`p-2 rounded border ${editRetrievalType === 'maintain-weekly' ? 'bg-yellow-800 border-yellow-600' : 'bg-gray-700 border-gray-600'}`}
                        >
                          Weekly
                        </button>
                        <button
                          onClick={() => setEditRetrievalType('maintain-monthly')}
                          className={`p-2 rounded border ${editRetrievalType === 'maintain-monthly' ? 'bg-yellow-800 border-yellow-600' : 'bg-gray-700 border-gray-600'}`}
                        >
                          Monthly
                        </button>
                      </div>
                      {editRetrievalType === 'scheduled' && (
                        <Input
                          type="date"
                          value={editRetrievalDate}
                          onChange={(e) => setEditRetrievalDate(e.target.value)}
                          className="bg-gray-700 border-gray-600 text-white mt-2 text-sm"
                        />
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={handleSaveEditSign}
                        className="flex-1 bg-green-700 hover:bg-green-600"
                      >
                        ✓ Save
                      </Button>
                      <Button
                        onClick={handleCancelEdit}
                        variant="outline"
                        className="flex-1 border-gray-600 text-gray-400"
                      >
                        ✕ Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              );
            }

            // Normal sign display
            return (
              <div key={sign.id} className="bg-gray-700 rounded p-3 text-sm">
                {/* Sign Info Row */}
                <div className="flex items-center gap-2">
                  {/* Status Dot */}
                  <span
                    className={`w-3 h-3 rounded-full ${signStatusInfo.dotColor}`}
                    title={signStatusInfo.label}
                  ></span>
                  <span className="font-mono text-cyan-400 text-base">
                    SLK {sign.slk.toFixed(2)}
                  </span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${sign.direction === 'True Left' ? 'bg-blue-900 text-blue-300' : 'bg-yellow-900 text-yellow-300'}`}
                  >
                    {sign.direction === 'True Left' ? 'TL ↑' : 'TR ↓'}
                  </span>
                  <span className="text-white">{sign.sign_type}</span>
                </div>

                {/* Retrieval Type & Manual Override Indicator */}
                <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400">
                  <span>
                    {sign.retrieval_type === 'standard'
                      ? '📋 2-day'
                      : sign.retrieval_type === 'scheduled'
                        ? `📅 ${sign.retrieval_date ? formatAusDate(sign.retrieval_date) : 'TBD'}`
                        : sign.retrieval_type === 'tba'
                          ? '⏳ TBA'
                          : sign.retrieval_type?.startsWith('maintain')
                            ? `🔧 ${sign.retrieval_type.replace('maintain-', '').charAt(0).toUpperCase() + sign.retrieval_type.replace('maintain-', '').slice(1)}`
                            : '📋 Standard'}
                  </span>
                  {sign.status_manually_set && (
                    <span className="text-orange-400 bg-orange-900/50 px-1.5 py-0.5 rounded">
                      MANUAL OVERRIDE
                    </span>
                  )}
                </div>

                {/* Description */}
                {sign.description && (
                  <div className="text-gray-500 text-xs mt-1">{sign.description}</div>
                )}

                {/* Retrieved Date */}
                {sign.status === 'retrieved' && sign.retrieved_date && (
                  <div className="text-green-400 text-xs mt-1.5">
                    ✓ Retrieved {formatAusDate(sign.retrieved_date)}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-1 mt-2">
                  {/* Edit Button */}
                  <Button
                    onClick={() => handleStartEditSign(sign)}
                    size="sm"
                    className="bg-blue-700 hover:bg-blue-600 text-xs h-7 px-2 flex-1"
                  >
                    Edt
                  </Button>

                  {/* Navigate Button */}
                  {sign.lat && sign.lon && (
                    <Button
                      onClick={() => {
                        window.open(
                          `https://www.google.com/maps/dir/?api=1&destination=${sign.lat},${sign.lon}&travelmode=driving`,
                          '_blank'
                        );
                      }}
                      size="sm"
                      className="bg-indigo-700 hover:bg-indigo-600 text-xs h-7 px-2 flex-1"
                    >
                      Nav
                    </Button>
                  )}

                  {/* Status Actions - depending on current state */}
                  {signStatus === 'retrieved' ? (
                    // Undo Retrieved
                    <Button
                      onClick={() => handleUnretrieveSign(sign.id)}
                      size="sm"
                      className="bg-amber-700 hover:bg-amber-600 text-xs h-7 px-2 flex-1"
                    >
                      Unret
                    </Button>
                  ) : (
                    <>
                      {/* Mark Retrieved */}
                      <Button
                        onClick={() => handleMarkSignRetrieved(sign.id)}
                        size="sm"
                        className="bg-green-700 hover:bg-green-600 text-xs h-7 px-2 flex-1"
                      >
                        Ret
                      </Button>

                      {/* Manual Override or Clear Override */}
                      {sign.status_manually_set ? (
                        <Button
                          onClick={() => handleClearOverride(sign.id)}
                          size="sm"
                          className="bg-orange-700 hover:bg-orange-600 text-xs h-7 px-2 flex-1"
                        >
                          Clear
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleMarkSignDueRetrieval(sign.id)}
                          size="sm"
                          className="bg-pink-700 hover:bg-pink-600 text-xs h-7 px-2 flex-1"
                        >
                          Early
                        </Button>
                      )}
                    </>
                  )}

                  {/* Delete */}
                  <Button
                    onClick={() => {
                      if (confirm('Delete this sign?')) handleRemoveSign(sign.id);
                    }}
                    size="sm"
                    className="bg-red-700 hover:bg-red-600 text-xs h-7 px-2 flex-1"
                  >
                    Del
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 mb-4">
        <Button
          onClick={() => {
            const updatedSigns = job.signs.map((s) => ({
              ...s,
              status: 'retrieved' as const,
              retrieved_date: toIsoDate(new Date()),
            }));
            setJob({ ...job, signs: updatedSigns, status: 'retrieved' });
          }}
          className="flex-1 bg-green-700 hover:bg-green-600"
        >
          ✓ All Retrieved
        </Button>
        <Button
          onClick={() => {
            navigator.clipboard.writeText(generateShareText(job));
            alert('Copied to clipboard!');
          }}
          className="flex-1 bg-indigo-700 hover:bg-indigo-600"
        >
          📤 Share
        </Button>
      </div>

      {/* Save Button */}
      <Button
        onClick={handleSaveChanges}
        className="w-full bg-cyan-700 hover:bg-cyan-600 h-12 text-base"
      >
        💾 Save Changes
      </Button>
    </div>
  );
}

// ============================================
// PRESETS VIEW
// ============================================

interface PresetsViewProps {
  onBack: () => void;
  onUpdate: () => void;
}

function PresetsView({ onBack, onUpdate }: PresetsViewProps) {
  const [presets, setPresets] = useState<AfterCarePresets>(getAfterCarePresets());
  const [newPreset, setNewPreset] = useState('');
  const [newPresetCategory, setNewPresetCategory] = useState<SignCategory>('surface');

  const handleAddPreset = () => {
    if (!newPreset.trim()) return;
    addCustomPreset(newPresetCategory, newPreset.trim());
    setPresets(getAfterCarePresets());
    setNewPreset('');
    onUpdate();
  };

  const handleRemovePreset = (category: SignCategory, preset: string) => {
    if (DEFAULT_PRESETS[category].includes(preset)) {
      alert('Cannot remove default presets');
      return;
    }
    removeCustomPreset(category, preset);
    setPresets(getAfterCarePresets());
    onUpdate();
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="text-blue-400 text-sm">
          ← Back
        </button>
        <h2 className="text-lg font-bold text-cyan-400">⚙️ Sign Presets</h2>
        <div className="w-16"></div>
      </div>

      {/* Add New Preset */}
      <div className="bg-gray-800 rounded-lg p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">Add Custom Preset</h3>

        <div className="space-y-2">
          <select
            value={newPresetCategory}
            onChange={(e) => setNewPresetCategory(e.target.value as SignCategory)}
            className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white"
          >
            <option value="surface">Surface</option>
            <option value="speed">Speed</option>
            <option value="hazard">Hazard</option>
          </select>

          <Input
            value={newPreset}
            onChange={(e) => setNewPreset(e.target.value)}
            placeholder="New sign type..."
            className="bg-gray-700 border-gray-600 text-white"
          />

          <Button onClick={handleAddPreset} className="w-full bg-green-700 hover:bg-green-600">
            ➕ Add Preset
          </Button>
        </div>
      </div>

      {/* Surface Presets */}
      <div className="bg-gray-800 rounded-lg p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-2">Surface Signs</h3>
        <div className="space-y-1">
          {presets.surface.map((preset) => (
            <div key={preset} className="flex justify-between items-center text-sm py-1">
              <span className="text-white">{preset}</span>
              {!DEFAULT_PRESETS.surface.includes(preset) && (
                <button
                  onClick={() => handleRemovePreset('surface', preset)}
                  className="text-red-400 hover:text-red-300 text-xs"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Speed Presets */}
      <div className="bg-gray-800 rounded-lg p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-2">Speed Signs</h3>
        <div className="space-y-1">
          {presets.speed.map((preset) => (
            <div key={preset} className="flex justify-between items-center text-sm py-1">
              <span className="text-white">{preset}</span>
              {!DEFAULT_PRESETS.speed.includes(preset) && (
                <button
                  onClick={() => handleRemovePreset('speed', preset)}
                  className="text-red-400 hover:text-red-300 text-xs"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Hazard Presets */}
      <div className="bg-gray-800 rounded-lg p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-2">Hazard Signs</h3>
        <div className="space-y-1">
          {presets.hazard.map((preset) => (
            <div key={preset} className="flex justify-between items-center text-sm py-1">
              <span className="text-white">{preset}</span>
              {!DEFAULT_PRESETS.hazard.includes(preset) && (
                <button
                  onClick={() => handleRemovePreset('hazard', preset)}
                  className="text-red-400 hover:text-red-300 text-xs"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Note */}
      <p className="text-xs text-gray-500 text-center">
        Default presets cannot be removed. Custom presets are saved locally.
      </p>
    </div>
  );
}
