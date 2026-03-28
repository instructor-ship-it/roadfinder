'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const expandedCategories = [
  {
    id: 'tmp',
    title: 'Traffic Management Plans',
    icon: '📋',
    description: 'Regional TMPs with TGS diagrams, indexed by page',
    href: '/library/tmp',
    available: true,
    itemCount: '9 regions',
    color: 'bg-blue-600/20 border-blue-600/50',
  },
  {
    id: 'agttm',
    title: 'AGTTM Parts',
    icon: '📕',
    description: 'Austroads Guide to Temporary Traffic Management',
    href: '/library?category=standards',
    available: true,
    itemCount: '10 parts',
    color: 'bg-purple-600/20 border-purple-600/50',
  },
  {
    id: 'cop',
    title: 'Codes of Practice',
    icon: '📜',
    description: 'MRWA and WHS codes of practice',
    href: '/library?category=mrwa',
    available: true,
    itemCount: '4 documents',
    color: 'bg-amber-600/20 border-amber-600/50',
  },
];

export default function ExpandedLibraryPage() {
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
          <h1 className="text-2xl font-bold">📖 Expanded Library</h1>
          <p className="text-gray-400 mt-1">
            Detailed document viewers with page-by-page navigation
          </p>
        </div>
      </div>

      {/* Categories */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="space-y-4">
          {expandedCategories.map((category) => (
            <Link key={category.id} href={category.href}>
              <Card className={`bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors ${category.color}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">{category.icon}</span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{category.title}</h3>
                      <p className="text-sm text-gray-400">{category.description}</p>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-green-600 mb-1">{category.itemCount}</Badge>
                      <p className="text-xs text-gray-500">View →</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        
        {/* Info */}
        <div className="mt-8 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h3 className="font-bold text-lg mb-3">📖 What is Expanded Library?</h3>
          <p className="text-sm text-gray-400">
            The Expanded Library provides detailed document viewers with page-by-page 
            navigation, table of contents, and quick access to specific sections. 
            Currently available for TMPs with TGS diagrams, indexed by page number.
          </p>
        </div>
      </div>
    </div>
  );
}
