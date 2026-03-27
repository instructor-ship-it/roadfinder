'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const regionLabels: Record<string, string> = {
  wheatbelt: 'Wheatbelt',
  metro: 'Metropolitan',
  southwest: 'South West',
  goldfields: 'Goldfields-Esperance',
  midwest: 'Mid West',
  kimberley: 'Kimberley',
  pilbara: 'Pilbara',
  greatsouthern: 'Great Southern',
  southcoastal: 'South Coastal',
};

export default function TmpRegionPage() {
  const params = useParams();
  const region = params.region as string;
  
  const [tmps, setTmps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTmps = async () => {
      try {
        // For now, we have the Wheatbelt TMP
        // In future, this would load from a registry
        if (region === 'wheatbelt') {
          const response = await fetch('/library/mrwa/tmp/catalog.json');
          if (response.ok) {
            const data = await response.json();
            setTmps([{
              id: 'tmp-0922-01531-rev6',
              title: data.document.title,
              subtitle: data.document.subtitle,
              revision: data.document.revision,
              pages: data.document.pages_total,
              tgsCount: data.document.tgs_count,
              effective: data.document.effective_date,
              expiry: data.document.expiry_date,
            }]);
          }
        }
      } catch (error) {
        console.error('Failed to load TMPs:', error);
      } finally {
        setLoading(false);
      }
    };
    loadTmps();
  }, [region]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading TMPs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-2">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                ← Home
              </Button>
            </Link>
            <Link href="/library">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                📚 Library
              </Button>
            </Link>
            <Link href="/library/tmp">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                📋 TMP
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl font-bold">
            🛣️ {regionLabels[region] || region} TMPs
          </h1>
          <p className="text-gray-400 mt-1">
            Traffic Management Plans for the {regionLabels[region] || region} region
          </p>
        </div>
      </div>

      {/* TMP List */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {tmps.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">No TMPs available for this region yet.</p>
            <Link href="/library">
              <Button variant="outline" className="bg-gray-700 border-gray-600">
                Back to Library
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {tmps.map((tmp) => (
              <Link key={tmp.id} href={`/library/tmp/${region}/${tmp.id}`}>
                <Card className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{tmp.title}</span>
                          <Badge className="bg-green-600 text-xs">Current</Badge>
                        </div>
                        <p className="text-sm text-gray-400 mb-2">{tmp.subtitle}</p>
                        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                          <span>📋 Revision {tmp.revision}</span>
                          <span>📄 {tmp.pages} pages</span>
                          <span>🚧 {tmp.tgsCount} TGS diagrams</span>
                          <span>📅 {tmp.effective} - {tmp.expiry}</span>
                        </div>
                      </div>
                      <div className="text-blue-400 text-sm">
                        View →
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
