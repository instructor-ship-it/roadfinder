'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { APP_VERSION } from '@/components/SettingsDrawer';
import {
  getQaHistory,
  deleteQaEntry,
  toggleQaFavorite,
  clearQaHistory,
  exportQaHistory,
  importQaHistory,
  saveQaEntry,
  type QaEntry,
} from '@/lib/qa-storage';

// Types
interface SearchableDocument {
  id: string;
  title: string;
  shortTitle: string;
  category?: string;
}

export default function QaPage() {
  // State
  const [documents, setDocuments] = useState<SearchableDocument[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [question, setQuestion] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [savedQAs, setSavedQAs] = useState<QaEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // AI direct chat state
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Load documents and saved Q&As on mount
  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const response = await fetch('/api/qa');
        if (response.ok) {
          const data = await response.json();
          setDocuments(data.documents || []);
        }
      } catch (err) {
        console.error('Failed to load documents:', err);
      } finally {
        setLoadingDocs(false);
      }
    };

    const loadSavedQAs = async () => {
      try {
        // Load from API (file-based storage)
        const response = await fetch('/api/qa-saved');
        if (response.ok) {
          const data = await response.json();
          const apiQAs = data.entries || [];

          // Load from localStorage
          const localQAs = getQaHistory();

          // Merge: API entries first, then local entries (avoiding duplicates by ID)
          const apiIds = new Set(apiQAs.map((qa: QaEntry) => qa.id));
          const uniqueLocalQAs = localQAs.filter((qa) => !apiIds.has(qa.id));

          // Combine and sort by date (newest first)
          const allQAs = [...apiQAs, ...uniqueLocalQAs].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          setSavedQAs(allQAs);
          return;
        }
      } catch (err) {
        console.error('Failed to load saved Q&As from API:', err);
      }

      // Fallback to localStorage only
      setSavedQAs(getQaHistory());
    };

    loadDocuments();
    loadSavedQAs();

    // Load API key from localStorage
    const savedKey = localStorage.getItem('ai_api_key') || '';
    setAiApiKey(savedKey);
  }, []);

  // Toggle document selection
  const toggleDocument = (docId: string) => {
    setSelectedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  // Select all documents
  const selectAllDocuments = () => {
    setSelectedDocs(new Set(documents.map((d) => d.id)));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedDocs(new Set());
  };

  // Generate prompt for AI (for external use)
  const generatePrompt = () => {
    if (!question.trim()) return;

    const docsToSearch =
      selectedDocs.size > 0 ? documents.filter((d) => selectedDocs.has(d.id)) : documents;

    const docList = docsToSearch
      .slice(0, 10)
      .map((d) => `- ${d.shortTitle} (${d.id})`)
      .join('\n');

    const prompt = `🔍 **TC Work Zone Locator - Q&A Request**

**Documents to search:**
${docList}

**Question:**
${question}

---
Please answer this question based on the documents listed above. After answering, please save the Q&A to GitHub using this format:

\`\`\`json
{
  "question": "${question.replace(/"/g, '\\"')}",
  "answer": "<your answer here>",
  "documents": ${JSON.stringify(docsToSearch.slice(0, 10).map((d) => d.id))},
  "documentNames": ${JSON.stringify(docsToSearch.slice(0, 10).map((d) => d.shortTitle))}
}
\`\`\`

Save this to: \`public/library/qa-saved.json\` (append to the array)`;

    setGeneratedPrompt(prompt);
  };

  // Ask AI directly (requires API key)
  const askAiDirectly = async () => {
    if (!question.trim()) return;

    // Check for API key
    const key = localStorage.getItem('ai_api_key') || aiApiKey;
    if (!key) {
      setAiError('Please configure your z.ai API key in Settings first.');
      return;
    }

    const docsToSearch =
      selectedDocs.size > 0 ? documents.filter((d) => selectedDocs.has(d.id)) : documents;

    // Build context from document titles
    const context = docsToSearch
      .slice(0, 10)
      .map((d) => `Document: ${d.title} (${d.id})`)
      .join('\n');

    setAiLoading(true);
    setAiError(null);
    setAiAnswer(null);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: key,
          messages: [{ role: 'user', content: question }],
          context,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setAiAnswer(data.answer);
      } else {
        setAiError(data.error || 'Failed to get answer');
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setAiLoading(false);
    }
  };

  // Save AI answer to history
  const saveAiAnswer = () => {
    if (!aiAnswer || !question) return;

    const docsToSearch =
      selectedDocs.size > 0 ? documents.filter((d) => selectedDocs.has(d.id)) : documents;

    const entry = saveQaEntry({
      question,
      answer: aiAnswer,
      documents: docsToSearch.slice(0, 10).map((d) => d.id),
      documentNames: docsToSearch.slice(0, 10).map((d) => d.shortTitle),
      category: 'AI Chat',
    });

    setSavedQAs((prev) => [entry, ...prev]);
    setAiAnswer(null);
    setQuestion('');
    alert('Saved to Q&A history!');
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Toggle favorite
  const handleToggleFavorite = async (id: string) => {
    // Update in local state immediately for UI responsiveness
    setSavedQAs((prev) =>
      prev.map((qa) => (qa.id === id ? { ...qa, isFavorite: !qa.isFavorite } : qa))
    );

    try {
      // Try to update in API (file-based storage)
      const entry = savedQAs.find((qa) => qa.id === id);
      if (entry) {
        await fetch('/api/qa-saved', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            updates: { isFavorite: !entry.isFavorite },
          }),
        });
      }
    } catch (err) {
      console.error('Failed to update favorite in API:', err);
    }

    // Also update localStorage
    toggleQaFavorite(id);
  };

  // Delete entry
  const handleDeleteEntry = async (id: string) => {
    if (!confirm('Delete this Q&A?')) return;

    try {
      // Try to delete from API first (file-based storage)
      const response = await fetch(`/api/qa-saved?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove from local state
        setSavedQAs((prev) => prev.filter((qa) => qa.id !== id));
        return;
      }
    } catch (err) {
      console.error('Failed to delete from API:', err);
    }

    // Fallback: delete from localStorage
    deleteQaEntry(id);
    setSavedQAs((prev) => prev.filter((qa) => qa.id !== id));
  };

  // Clear all Q&As
  const handleClearAll = () => {
    if (!confirm('Clear ALL saved Q&As? This cannot be undone.')) return;
    clearQaHistory();
    setSavedQAs([]);
  };

  // Export Q&As
  const handleExport = () => {
    const json = exportQaHistory();
    copyToClipboard(json);
    alert('Q&A history copied to clipboard!');
  };

  // Import Q&As
  const handleImport = () => {
    const json = prompt('Paste Q&A history JSON:');
    if (!json) return;

    const result = importQaHistory(json);
    if (result.success) {
      setSavedQAs(getQaHistory());
      alert(`Imported ${result.count} Q&As`);
    } else {
      alert(`Import failed: ${result.error}`);
    }
  };

  // Group documents by category
  const documentsByCategory = documents.reduce(
    (acc, doc) => {
      const cat = doc.category || 'other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(doc);
      return acc;
    },
    {} as Record<string, SearchableDocument[]>
  );

  // Filter saved Q&As
  const filteredQAs = savedQAs.filter((qa) => {
    if (filter === 'favorites' && !qa.isFavorite) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return qa.question.toLowerCase().includes(term) || qa.answer.toLowerCase().includes(term);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/library">
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                  ← Library
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white">🤖 AI Q&A Assistant</h1>
                <p className="text-xs text-gray-500">{APP_VERSION}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSavedQAs(getQaHistory())}
              className="bg-gray-700 border-gray-600"
            >
              🔄 Refresh ({savedQAs.length})
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Mode indicator */}
        {aiApiKey ? (
          <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 text-sm">
            <h3 className="font-semibold text-green-300 mb-2">🤖 AI Chat Ready</h3>
            <p className="text-green-200">
              Ask questions about traffic management, WHS, and road work procedures. Your API key is
              configured.
            </p>
          </div>
        ) : (
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 text-sm">
            <h3 className="font-semibold text-blue-300 mb-2">📋 Prompt Generation Mode</h3>
            <p className="text-blue-200 mb-2">
              You can generate prompts to use with any AI assistant (ChatGPT, Claude, etc.).
              Configure your z.ai API key in Settings to enable direct AI chat within the app.
            </p>
            <div className="flex gap-2">
              <Link href="/library">
                <Button className="bg-blue-600 hover:bg-blue-700 text-sm">⚙️ Settings</Button>
              </Link>
              <Button
                onClick={generatePrompt}
                disabled={!question.trim()}
                className="bg-purple-600 hover:bg-purple-700 text-sm disabled:opacity-50"
              >
                📋 Generate Prompt
              </Button>
            </div>
          </div>
        )}

        {/* Question Input */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Ask a question about traffic management, WHS, or road work:
          </label>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="e.g., What are the speed zone requirements for TC positions?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) =>
                e.key === 'Enter' && (aiApiKey ? askAiDirectly() : generatePrompt())
              }
              className="bg-gray-700 border-gray-600 text-white flex-1"
            />
            {aiApiKey ? (
              <Button
                onClick={askAiDirectly}
                disabled={!question.trim() || aiLoading}
                className="bg-green-600 hover:bg-green-700 px-6 disabled:opacity-50"
              >
                {aiLoading ? '🤔 Thinking...' : '🤖 Ask AI'}
              </Button>
            ) : (
              <Button
                onClick={generatePrompt}
                disabled={!question.trim()}
                className="bg-blue-600 hover:bg-blue-700 px-6 disabled:opacity-50"
              >
                📋 Generate Prompt
              </Button>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {aiApiKey
              ? 'Press Enter or click Ask AI to get an answer directly.'
              : 'Press Enter or click Generate Prompt to create a prompt you can use with any AI assistant.'}
          </p>
        </div>

        {/* AI Answer */}
        {(aiAnswer || aiError) && (
          <div
            className={`rounded-lg p-4 border ${aiError ? 'bg-red-900/30 border-red-700' : 'bg-green-900/30 border-green-700'}`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className={`font-semibold ${aiError ? 'text-red-300' : 'text-green-300'}`}>
                {aiError ? '❌ Error' : '✅ AI Answer'}
              </h3>
              {aiAnswer && (
                <div className="flex gap-2">
                  <Button
                    onClick={saveAiAnswer}
                    className="bg-purple-600 hover:bg-purple-700 text-sm"
                  >
                    💾 Save to History
                  </Button>
                  <Button
                    onClick={() => copyToClipboard(aiAnswer)}
                    className="bg-blue-600 hover:bg-blue-700 text-sm"
                  >
                    {copied ? '✓ Copied!' : '📋 Copy'}
                  </Button>
                </div>
              )}
            </div>
            {aiError ? (
              <p className="text-red-200">{aiError}</p>
            ) : aiAnswer ? (
              <div className="prose prose-invert prose-sm max-w-none text-gray-200">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiAnswer}</ReactMarkdown>
              </div>
            ) : null}
            {aiAnswer && selectedDocs.size > 0 && (
              <p className="text-xs text-gray-500 mt-3">
                Sources:{' '}
                {documents
                  .filter((d) => selectedDocs.has(d.id))
                  .slice(0, 10)
                  .map((d) => d.shortTitle)
                  .join(', ')}
              </p>
            )}
          </div>
        )}

        {/* Document Selection */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">📄 Select Documents to Search</h3>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAllDocuments}
                className="text-blue-400"
              >
                Select All
              </Button>
              <Button variant="ghost" size="sm" onClick={clearSelection} className="text-gray-400">
                Clear
              </Button>
            </div>
          </div>

          {loadingDocs ? (
            <div className="text-center py-4 text-gray-400">Loading documents...</div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {Object.entries(documentsByCategory).map(([category, docs]) => (
                <div key={category}>
                  <p className="text-xs text-gray-500 uppercase mb-1">{category}</p>
                  <div className="flex flex-wrap gap-2">
                    {docs.map((doc) => (
                      <button
                        key={doc.id}
                        onClick={() => toggleDocument(doc.id)}
                        className={`px-3 py-1 rounded text-sm transition-colors ${
                          selectedDocs.has(doc.id)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {selectedDocs.has(doc.id) ? '☑ ' : '☐ '}
                        {doc.shortTitle}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-500 mt-3">
            {selectedDocs.size === 0
              ? 'No documents selected - will search all documents'
              : `${selectedDocs.size} document${selectedDocs.size !== 1 ? 's' : ''} selected`}
          </p>
        </div>

        {/* Generated Prompt (fallback) */}
        {generatedPrompt && (
          <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-green-300">✅ Your Prompt is Ready!</h3>
              <Button
                onClick={() => copyToClipboard(generatedPrompt!)}
                className={copied ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}
              >
                {copied ? '✓ Copied!' : '📋 Copy Prompt'}
              </Button>
            </div>
            <pre className="bg-gray-900 rounded p-3 text-sm text-gray-300 whitespace-pre-wrap overflow-x-auto max-h-64 overflow-y-auto">
              {generatedPrompt}
            </pre>
            <p className="text-green-200 text-sm mt-3">
              👆 Copy this prompt and paste it in your AI chat. The AI will save the answer back to
              this app!
            </p>
          </div>
        )}

        {/* Saved Q&As */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">📚 Saved Q&As ({savedQAs.length})</h3>
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
                className={filter === 'all' ? 'bg-blue-600' : 'bg-gray-700 border-gray-600'}
              >
                All
              </Button>
              <Button
                variant={filter === 'favorites' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('favorites')}
                className={filter === 'favorites' ? 'bg-amber-600' : 'bg-gray-700 border-gray-600'}
              >
                ⭐ Favorites
              </Button>
            </div>
          </div>

          <Input
            type="text"
            placeholder="Search saved Q&As..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-gray-700 border-gray-600 text-white mb-3"
          />

          {filteredQAs.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No saved Q&As yet</p>
              <p className="text-sm mt-2">
                Generate a prompt, get an answer from AI, and save it here!
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredQAs.map((qa) => (
                <Card key={qa.id} className="bg-gray-900 border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {qa.isFavorite && <span className="text-amber-400">⭐</span>}
                          {qa.category && (
                            <Badge
                              variant="outline"
                              className="text-xs border-blue-500 text-blue-400"
                            >
                              {qa.category}
                            </Badge>
                          )}
                          <span className="text-xs text-gray-500">
                            {new Date(qa.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="font-semibold text-white mb-2">{qa.question}</p>
                        <div
                          className={`text-sm text-gray-300 prose prose-invert prose-sm max-w-none ${expandedId === qa.id ? '' : 'line-clamp-3'}`}
                        >
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{qa.answer}</ReactMarkdown>
                        </div>
                        <button
                          onClick={() => setExpandedId(expandedId === qa.id ? null : qa.id)}
                          className="text-blue-400 text-xs mt-1 hover:underline"
                        >
                          {expandedId === qa.id ? '▲ Show less' : '▼ Show full answer'}
                        </button>
                        {qa.documentNames?.length > 0 && (
                          <p className="text-xs text-gray-500 mt-2">
                            Sources: {qa.documentNames.join(', ')}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleFavorite(qa.id)}
                          className={qa.isFavorite ? 'text-amber-400' : 'text-gray-500'}
                        >
                          {qa.isFavorite ? '⭐' : '☆'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(qa.answer)}
                          className="text-blue-400"
                        >
                          📋
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEntry(qa.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          🗑️
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Export/Import/Clear buttons */}
          <div className="flex gap-2 mt-4 pt-4 border-t border-gray-700">
            <Button
              onClick={handleExport}
              variant="outline"
              size="sm"
              className="flex-1 bg-gray-700 border-gray-600"
            >
              📤 Export
            </Button>
            <Button
              onClick={handleImport}
              variant="outline"
              size="sm"
              className="flex-1 bg-gray-700 border-gray-600"
            >
              📥 Import
            </Button>
            <Button
              onClick={handleClearAll}
              variant="outline"
              size="sm"
              className="bg-gray-700 border-gray-600 text-red-400 hover:text-red-300"
            >
              🗑️ Clear All
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
