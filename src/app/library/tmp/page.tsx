'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const regions = [
  { id: 'wheatbelt', label: 'Wheatbelt', icon: '🌾', tmpCount: 1, hasData: true },
  { id: 'metro', label: 'Metropolitan', icon: '🏙️', tmpCount: 0, hasData: false },
  { id: 'southwest', label: 'South West', icon: '🌲', tmpCount: 0, hasData: false },
  { id: 'goldfields', label: 'Goldfields-Esperance', icon: '⛏️', tmpCount: 0, hasData: false },
  { id: 'midwest', label: 'Mid West', icon: '🌊', tmpCount: 0, hasData: false },
  { id: 'kimberley', label: 'Kimberley', icon: '🐊', tmpCount: 0, hasData: false },
  { id: 'pilbara', label: 'Pilbara', icon: '🏭', tmpCount: 0, hasData: false },
  { id: 'greatsouthern', label: 'Great Southern', icon: '🍇', tmpCount: 0, hasData: false },
];

export default function TmpIndexPage() {
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
          </div>
          <h1 className="text-2xl font-bold">📋 Traffic Management Plans</h1>
          <p className="text-gray-400 mt-1">
            Regional TMPs with TGS diagrams by MRWA region
          </p>
        </div>
      </div>

      {/* Region Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {regions.map((region) => (
            <Link key={region.id} href={`/library/tmp/${region.id}`}>
              <Card className={`bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors ${
                !region.hasData ? 'opacity-60' : ''
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{region.icon}</span>
                    <div className="flex-1">
                      <h3 className="font-semibold">{region.label}</h3>
                      <p className="text-sm text-gray-400">
                        {region.hasData ? (
                          <>
                            {region.tmpCount} TMP{region.tmpCount !== 1 ? 's' : ''} available
                          </>
                        ) : (
                          'Coming soon'
                        )}
                      </p>
                    </div>
                    {region.hasData && (
                      <Badge className="bg-green-600">Available</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        
        {/* Info Section */}
        <div className="mt-8 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h3 className="font-bold text-lg mb-3">📋 About TMPs</h3>
          <p className="text-sm text-gray-400 mb-2">
            Traffic Management Plans (TMPs) contain Traffic Guidance Scheme (TGS) diagrams 
            for non-complex worksites. Each regional TMP includes:
          </p>
          <ul className="text-sm text-gray-400 space-y-1 ml-4">
            <li>• Complete TGS diagram library</li>
            <li>• Setup and removal procedures</li>
            <li>• Risk assessment templates</li>
            <li>• Emergency arrangements</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
