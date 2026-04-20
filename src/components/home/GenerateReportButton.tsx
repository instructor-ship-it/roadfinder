'use client';

import { Button } from '@/components/ui/button';

interface GenerateReportButtonProps {
  onGenerate: () => void;
  isGenerating: boolean;
  visible: boolean;
}

export function GenerateReportButton({
  onGenerate,
  isGenerating,
  visible,
}: GenerateReportButtonProps) {
  if (!visible) return null;

  return (
    <div className="mt-6 bg-gray-800 rounded-lg p-4">
      <Button
        onClick={onGenerate}
        disabled={isGenerating}
        className="w-full bg-purple-700 hover:bg-purple-600 h-12 text-base font-medium"
      >
        {isGenerating ? <>⏳ Generating Report...</> : <>📋 Generate Work Zone Report</>}
      </Button>
      <p className="text-xs text-gray-500 mt-2 text-center">
        Creates a comprehensive report with all work zone information
      </p>
    </div>
  );
}
