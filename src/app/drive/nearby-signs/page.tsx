'use client';

import { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  getNearbySigns,
  calculateSignStatus,
  updateSignInJob,
  removeSignFromJob,
  getStatusInfo,
  type AfterCareSign,
  type AfterCareJob,
  type ComputedJobStatus,
} from '@/lib/aftercare';

// ============================================
// MAIN COMPONENT
// ============================================

function NearbySignsContent() {
  const searchParams = useSearchParams();
  const roadId = searchParams.get('road_id') || '';
  const slkStr = searchParams.get('slk') || '0';
  const slk = parseFloat(slkStr);
  const direction = (searchParams.get('direction') as 'increasing' | 'decreasing') || 'increasing';
  const lookahead = parseFloat(searchParams.get('lookahead') || '5');
  
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingSign, setEditingSign] = useState<{ jobId: string; signId: string } | null>(null);
  const [editSlk, setEditSlk] = useState('');
  
  // Load nearby signs using useMemo
  const allSigns = useMemo(() => {
    if (roadId && slk) {
      return getNearbySigns(roadId, slk, direction, lookahead);
    }
    return [];
  }, [roadId, slk, direction, lookahead, refreshKey]);
  
  // Filter to only show due-retrieval and due-maintenance signs
  const signs = useMemo(() => {
    return allSigns.filter(sign => {
      const status = calculateSignStatus(sign);
      return status === 'due-retrieval' || status === 'due-maintenance' || status === 'maintained';
    });
  }, [allSigns]);
  
  // Group signs by job
  const signsByJob = useMemo(() => {
    const groups: Record<string, { job: AfterCareJob; signs: typeof signs }> = {};
    for (const sign of signs) {
      if (!groups[sign.job.id]) {
        groups[sign.job.id] = { job: sign.job, signs: [] };
      }
      groups[sign.job.id].signs.push(sign);
    }
    return groups;
  }, [signs]);
  
  // Count by status
  const statusCounts = useMemo(() => {
    let dueRetrieval = 0;
    let dueMaintenance = 0;
    for (const sign of signs) {
      const status = calculateSignStatus(sign);
      if (status === 'due-retrieval') dueRetrieval++;
      else if (status === 'due-maintenance' || status === 'maintained') dueMaintenance++;
    }
    return { dueRetrieval, dueMaintenance };
  }, [signs]);
  
  // Handle mark retrieved
  const handleMarkRetrieved = (jobId: string, signId: string) => {
    updateSignInJob(jobId, signId, {
      status: 'retrieved',
      retrieved_date: new Date().toISOString().split('T')[0],
    });
    setRefreshKey(k => k + 1);
  };
  
  // Handle mark due for retrieval early
  const handleMarkDueRetrieval = (jobId: string, signId: string) => {
    updateSignInJob(jobId, signId, {
      status: 'due-retrieval',
      status_manually_set: true,
    });
    setRefreshKey(k => k + 1);
  };
  
  // Handle delete sign
  const handleDeleteSign = (jobId: string, signId: string) => {
    if (confirm('Delete this sign?')) {
      removeSignFromJob(jobId, signId);
      setRefreshKey(k => k + 1);
    }
  };
  
  // Handle start edit
  const handleStartEdit = (jobId: string, sign: AfterCareSign) => {
    setEditingSign({ jobId, signId: sign.id });
    setEditSlk(sign.slk.toFixed(2));
  };
  
  // Handle save edit
  const handleSaveEdit = () => {
    if (editingSign) {
      const newSlk = parseFloat(editSlk);
      if (!isNaN(newSlk)) {
        updateSignInJob(editingSign.jobId, editingSign.signId, { slk: newSlk });
      }
      setEditingSign(null);
      setRefreshKey(k => k + 1);
    }
  };
  
  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingSign(null);
  };
  
  // Generate Google Maps URL for all signs
  const mapsUrl = useMemo(() => {
    const signsWithCoords = signs.filter(s => s.lat && s.lon);
    if (signsWithCoords.length === 0) return null;
    
    const sorted = [...signsWithCoords].sort((a, b) => a.slk - b.slk);
    const coords = sorted.map(s => `${s.lat},${s.lon}`).join('/');
    return `https://www.google.com/maps/dir//${coords}`;
  }, [signs]);
  
  // Back URL
  const backUrl = `/drive?road_id=${encodeURIComponent(roadId)}&slk=${slk}&autostart=true`;
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 max-w-lg mx-auto">
      {/* Back Link */}
      <a href={backUrl} className="inline-flex items-center text-blue-400 text-sm mb-4 hover:text-blue-300">
        ← Back to SLK Tracking
      </a>
      
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-cyan-400">📍 Nearby Signs</h1>
        <p className="text-sm text-gray-400">
          {roadId} @ SLK {slk.toFixed(2)} ({lookahead}km radius)
        </p>
      </div>
      
      {/* Status Summary */}
      <div className="bg-gray-800 rounded-lg p-3 mb-4">
        <div className="flex justify-between items-center">
          <div className="text-sm">
            <span className="text-gray-400">Action Required: </span>
            <span className="text-white font-bold">{signs.length}</span>
          </div>
          <div className="flex gap-3 text-xs">
            {statusCounts.dueRetrieval > 0 && (
              <span className="text-red-400">🔴 {statusCounts.dueRetrieval} retrieval</span>
            )}
            {statusCounts.dueMaintenance > 0 && (
              <span className="text-yellow-400">🟡 {statusCounts.dueMaintenance} maintenance</span>
            )}
          </div>
        </div>
      </div>
      
      {/* Map Button */}
      {mapsUrl && (
        <Button
          onClick={() => window.open(mapsUrl, '_blank')}
          className="w-full mb-4 bg-green-700 hover:bg-green-600"
        >
          🗺️ Open All in Google Maps
        </Button>
      )}
      
      {/* Signs List */}
      {signs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-4xl mb-4">✅</p>
          <p>No signs requiring action</p>
          <p className="text-sm mt-2">All nearby signs are active or already retrieved</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(signsByJob).map(([jobId, { job, signs: jobSigns }]) => (
            <div key={jobId} className="bg-gray-800 rounded-lg overflow-hidden">
              {/* Job Header */}
              <div className="bg-gray-700 px-3 py-2 flex justify-between items-center">
                <div>
                  <span className="font-mono text-green-400 text-sm">{job.road_id}</span>
                  <span className="text-gray-400 text-xs ml-2">{job.road_name}</span>
                </div>
                <span className="text-xs text-gray-400">{jobSigns.length} sign{jobSigns.length !== 1 ? 's' : ''}</span>
              </div>
              
              {/* Signs */}
              <div className="divide-y divide-gray-700">
                {jobSigns.map((sign) => {
                  const status = calculateSignStatus(sign);
                  // Map sign status to computed job status for getStatusInfo
                  const mappedStatus: ComputedJobStatus = status === 'placed' ? 'active' : 
                                       status === 'maintained' ? 'due-maintenance' :
                                       status === 'due-retrieval' ? 'due-retrieval' :
                                       status === 'due-maintenance' ? 'due-maintenance' :
                                       'retrieved';
                  const statusInfo = getStatusInfo(mappedStatus);
                  const distanceM = Math.abs(sign.slk - slk) * 1000;
                  const positionLabel = sign.position === 'ahead' ? '↑' : '↓';
                  const positionColor = sign.position === 'ahead' ? 'text-green-400' : 'text-yellow-400';
                  const dirLabel = sign.direction === 'True Left' ? 'TL' : 'TR';
                  const isEditing = editingSign?.signId === sign.id;
                  
                  return (
                    <div key={sign.id} className="p-3">
                      {/* Sign Info */}
                      {isEditing ? (
                        // Edit Mode
                        <div className="space-y-2">
                          <div className="text-xs text-cyan-400 font-semibold">✏️ Editing Sign</div>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="text-xs text-gray-400">SLK</label>
                              <input
                                type="number"
                                step="0.01"
                                value={editSlk}
                                onChange={(e) => setEditSlk(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white font-mono text-sm"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={handleSaveEdit} size="sm" className="flex-1 bg-green-700 hover:bg-green-600 text-xs h-7">
                              Save
                            </Button>
                            <Button onClick={handleCancelEdit} size="sm" className="flex-1 bg-gray-600 hover:bg-gray-500 text-xs h-7">
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // View Mode
                        <>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className={positionColor}>{positionLabel}</span>
                                <span className="text-white font-medium">{sign.sign_type}</span>
                                <span className="text-gray-400 text-sm">({dirLabel})</span>
                              </div>
                              <div className="text-sm text-gray-400 mt-1">
                                SLK {sign.slk.toFixed(2)} • {distanceM.toFixed(0)}m {sign.position}
                              </div>
                              {sign.description && (
                                <div className="text-xs text-gray-500 mt-1">{sign.description}</div>
                              )}
                            </div>
                            <span className={`text-xs ${statusInfo.color}`}>{statusInfo.icon}</span>
                          </div>
                          
                          {/* Action Buttons - Same as Job Edit Mode */}
                          <div className="flex gap-1 mt-2">
                            {/* Edit Button */}
                            <Button 
                              onClick={() => handleStartEdit(jobId, sign)} 
                              size="sm" 
                              className="bg-blue-700 hover:bg-blue-600 text-xs h-7 px-2 flex-1"
                            >
                              Edt
                            </Button>
                            
                            {/* Navigate Button */}
                            {sign.lat && sign.lon ? (
                              <Button 
                                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${sign.lat},${sign.lon}&travelmode=driving`, '_blank')}
                                size="sm" 
                                className="bg-indigo-700 hover:bg-indigo-600 text-xs h-7 px-2 flex-1"
                              >
                                Nav
                              </Button>
                            ) : (
                              <Button 
                                size="sm" 
                                disabled
                                className="bg-gray-600 text-xs h-7 px-2 flex-1 opacity-50"
                              >
                                Nav
                              </Button>
                            )}
                            
                            {/* Mark Retrieved */}
                            <Button 
                              onClick={() => handleMarkRetrieved(jobId, sign.id)} 
                              size="sm" 
                              className="bg-green-700 hover:bg-green-600 text-xs h-7 px-2 flex-1"
                            >
                              Ret
                            </Button>
                            
                            {/* Mark Due Early */}
                            {status === 'due-retrieval' ? (
                              <Button 
                                size="sm" 
                                disabled
                                className="bg-gray-600 text-xs h-7 px-2 flex-1 opacity-50"
                              >
                                Early
                              </Button>
                            ) : (
                              <Button 
                                onClick={() => handleMarkDueRetrieval(jobId, sign.id)} 
                                size="sm" 
                                className="bg-pink-700 hover:bg-pink-600 text-xs h-7 px-2 flex-1"
                              >
                                Early
                              </Button>
                            )}
                            
                            {/* Delete */}
                            <Button 
                              onClick={() => handleDeleteSign(jobId, sign.id)} 
                              size="sm" 
                              className="bg-red-700 hover:bg-red-600 text-xs h-7 px-2 flex-1"
                            >
                              Del
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Full AfterCare Link */}
      <div className="mt-6 pt-4 border-t border-gray-700 text-center">
        <a href="/aftercare" className="text-cyan-400 text-sm hover:text-cyan-300">
          View All AfterCare Jobs →
        </a>
      </div>
    </div>
  );
}

export default function NearbySignsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 text-white p-4 max-w-lg mx-auto">
        <div className="text-center py-12">
          <p className="text-gray-400">Loading nearby signs...</p>
        </div>
      </div>
    }>
      <NearbySignsContent />
    </Suspense>
  );
}
