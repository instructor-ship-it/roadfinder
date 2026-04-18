'use client';

import { Button } from '@/components/ui/button';
import { WorkZoneReport, WorkZoneReportProps } from '@/components/WorkZoneReport';

interface ReportExportModalProps extends WorkZoneReportProps {
  // Additional props specific to the modal
  onOpenStreetView?: (lat: number, lon: number) => void;
  onOpenGoogleMaps?: (url: string | null) => void;
}

/**
 * ReportExportModal - A wrapper around WorkZoneReport
 *
 * This component wraps the WorkZoneReport component which handles
 * all report generation and display logic internally.
 *
 * The WorkZoneReport component will:
 * 1. Generate a text report for clipboard/download
 * 2. Open a print window with a formatted HTML report
 */
export function ReportExportModal({
  isOpen,
  onClose,
  result,
  weather,
  warnings,
  traffic,
  places,
  crossRoads,
  signageCorridor,
  corridorIntersections,
  userTrafficCounts,
  selectedCountDetail,
  corridorSpeedZones,
  windGustThreshold,
}: ReportExportModalProps) {
  // The WorkZoneReport component handles all the report generation internally
  // It opens a print window with the formatted report
  return (
    <WorkZoneReport
      isOpen={isOpen}
      onClose={onClose}
      result={result}
      weather={weather}
      warnings={warnings}
      traffic={traffic}
      places={places}
      crossRoads={crossRoads}
      signageCorridor={signageCorridor}
      corridorIntersections={corridorIntersections}
      userTrafficCounts={userTrafficCounts}
      selectedCountDetail={selectedCountDetail}
      corridorSpeedZones={corridorSpeedZones}
      windGustThreshold={windGustThreshold}
    />
  );
}

export default ReportExportModal;
