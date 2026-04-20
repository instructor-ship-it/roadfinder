'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getState,
  addContact,
  updateContact,
  deleteContact,
  toggleContactOnJob,
  clearAllFromJob,
  getContactsOnJob,
  setCurrentJobName,
  exportContacts,
  importContacts,
  clearAllContacts,
  searchContacts,
  getTitles,
  type Contact,
} from '@/lib/contacts-storage';
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  PhoneIcon,
  MailIcon,
  TruckIcon,
  BriefcaseIcon,
  CheckCircleIcon,
} from 'lucide-react';
import { usePromptDialog } from '@/components/ui/prompt-dialog';

export default function ContactsPage() {
  const router = useRouter();
  const promptDialog = usePromptDialog();

  // Initialize state from storage
  const initialState = getState();
  const [contacts, setContacts] = useState<Contact[]>(initialState.contacts);
  const [currentJobName, setCurrentJobNameState] = useState<string>(
    initialState.currentJobName || ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'job' | 'all'>('job');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [showJobNameModal, setShowJobNameModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    title: 'Traffic Controller',
    company: '',
    vehicle: '',
    phone: '',
    email: '',
    notes: '',
  });

  // Refresh contacts from storage
  const refreshContacts = () => {
    const state = getState();
    setContacts(state.contacts);
    setCurrentJobNameState(state.currentJobName || '');
  };

  // Filter contacts based on tab and search
  const filteredContacts =
    activeTab === 'job'
      ? contacts.filter((c) => c.isOnCurrentJob)
      : searchQuery
        ? searchContacts(searchQuery)
        : contacts;

  // Sort: on job first, then alphabetically by name
  const sortedContacts = [...filteredContacts].sort((a, b) => {
    if (a.isOnCurrentJob && !b.isOnCurrentJob) return -1;
    if (!a.isOnCurrentJob && b.isOnCurrentJob) return 1;
    return a.name.localeCompare(b.name);
  });

  const contactsOnJob = contacts.filter((c) => c.isOnCurrentJob);

  // Handle form submit
  const handleFormSubmit = () => {
    if (!formData.name.trim()) return;

    if (editingContact) {
      updateContact(editingContact.id, formData);
    } else {
      addContact({
        ...formData,
        isOnCurrentJob: activeTab === 'job', // Auto-add to job if adding from job tab
      });
    }

    resetForm();
    refreshContacts();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      title: 'Traffic Controller',
      company: '',
      vehicle: '',
      phone: '',
      email: '',
      notes: '',
    });
    setShowAddForm(false);
    setEditingContact(null);
  };

  const handleEdit = (contact: Contact) => {
    setFormData({
      name: contact.name,
      title: contact.title,
      company: contact.company || '',
      vehicle: contact.vehicle || '',
      phone: contact.phone || '',
      email: contact.email || '',
      notes: contact.notes || '',
    });
    setEditingContact(contact);
    setShowAddForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this contact?')) {
      deleteContact(id);
      refreshContacts();
    }
  };

  const handleToggleJob = (id: string) => {
    toggleContactOnJob(id);
    refreshContacts();
  };

  const handleClearJob = () => {
    if (confirm('Remove all contacts from current job?')) {
      clearAllFromJob();
      refreshContacts();
    }
  };

  const handleSaveJobName = () => {
    setCurrentJobName(currentJobName || undefined);
    setShowJobNameModal(false);
    refreshContacts();
  };

  const handleExport = () => {
    const json = exportContacts();
    navigator.clipboard.writeText(json);
    alert('Contacts exported to clipboard!');
  };

  const handleImport = async () => {
    const json = await promptDialog.prompt({
      title: 'Import Contacts',
      message: 'Paste your exported contacts JSON below:',
      placeholder: 'Paste JSON here...',
      multiline: true,
      confirmLabel: 'Import',
    });
    if (!json) return;

    const result = importContacts(json);
    if (result.success) {
      alert(`Imported ${result.count} contacts`);
      refreshContacts();
    } else {
      alert(`Import failed: ${result.error}`);
    }
  };

  const handleClearAll = () => {
    if (confirm('Delete ALL contacts? This cannot be undone.')) {
      clearAllContacts();
      refreshContacts();
    }
  };

  // Phone click handler
  const handlePhoneClick = (phone: string) => {
    window.open(`tel:${phone.replace(/\s/g, '')}`, '_self');
  };

  // Email click handler
  const handleEmailClick = (email: string) => {
    window.open(`mailto:${email}`, '_self');
  };

  const titles = getTitles();

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="h-8 w-8 flex items-center justify-center rounded-md text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Contact Directory</h1>
            <p className="text-xs text-gray-500">
              {contactsOnJob.length} on job · {contacts.length} total
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="h-8 px-3 flex items-center gap-1 rounded-md bg-cyan-600 text-white text-sm hover:bg-cyan-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4" /> Add
          </button>
        </div>
      </div>

      {/* Current Job Banner */}
      {contactsOnJob.length > 0 && (
        <div className="px-4 py-3 bg-cyan-900/30 border-b border-cyan-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <BriefcaseIcon className="h-4 w-4 text-cyan-400" />
                <span className="text-sm font-medium text-cyan-300">
                  {currentJobName || 'Current Job'}
                </span>
              </div>
              <p className="text-xs text-cyan-400 mt-0.5">
                {contactsOnJob.length} contact{contactsOnJob.length !== 1 ? 's' : ''} assigned
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowJobNameModal(true)}
                className="px-2 py-1 text-xs bg-cyan-700 text-cyan-200 rounded hover:bg-cyan-600"
              >
                Edit Job
              </button>
              <button
                onClick={handleClearJob}
                className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('job')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'job'
              ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-900/20'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          On Job ({contactsOnJob.length})
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'all'
              ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-900/20'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          All Contacts ({contacts.length})
        </button>
      </div>

      {/* Search (only on All tab) */}
      {activeTab === 'all' && (
        <div className="px-4 py-3 border-b border-gray-800">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, title, vehicle, phone..."
            className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
      )}

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="px-4 py-4 bg-gray-800 border-b border-gray-700">
          <h3 className="text-sm font-medium mb-3">
            {editingContact ? 'Edit Contact' : 'Add New Contact'}
          </h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Full name"
                  className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Title/Role</label>
                <select
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  {titles.map((title) => (
                    <option key={title} value={title}>
                      {title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Company</label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="Company name"
                  className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Vehicle</label>
                <input
                  type="text"
                  value={formData.vehicle}
                  onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })}
                  placeholder="e.g., White Hilux"
                  className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0400 000 000"
                  className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                  className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Notes</label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleFormSubmit}
                disabled={!formData.name.trim()}
                className="flex-1 py-2 rounded-lg bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingContact ? 'Save Changes' : 'Add Contact'}
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 rounded-lg bg-gray-600 text-white text-sm hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact List */}
      <div className="px-4 py-3">
        {sortedContacts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-3">👥</div>
            <p className="text-sm">
              {activeTab === 'job' ? 'No contacts on current job' : 'No contacts yet'}
            </p>
            <p className="text-xs mt-1">
              {activeTab === 'job'
                ? 'Add contacts and assign them to this job'
                : 'Add a contact using the button above'}
            </p>
            {activeTab === 'job' && contacts.length > 0 && (
              <button
                onClick={() => setActiveTab('all')}
                className="mt-4 px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm hover:bg-cyan-700"
              >
                Browse All Contacts
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedContacts.map((contact) => (
              <div
                key={contact.id}
                className={`rounded-lg border overflow-hidden ${
                  contact.isOnCurrentJob
                    ? 'border-cyan-500/50 bg-cyan-900/20'
                    : 'border-gray-700 bg-gray-800'
                }`}
              >
                <div className="p-3">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-lg font-medium">
                      {contact.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{contact.name}</span>
                        {contact.isOnCurrentJob && (
                          <span className="text-xs bg-cyan-600 text-white px-1.5 py-0.5 rounded">
                            On Job
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-400">
                        {contact.title}
                        {contact.company && ` · ${contact.company}`}
                      </div>
                      {contact.vehicle && (
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <TruckIcon className="h-3 w-3" />
                          {contact.vehicle}
                        </div>
                      )}

                      {/* Contact actions */}
                      <div className="flex gap-2 mt-2">
                        {contact.phone && (
                          <button
                            onClick={() => handlePhoneClick(contact.phone!)}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600/20 text-green-400 rounded hover:bg-green-600/30"
                          >
                            <PhoneIcon className="h-3 w-3" />
                            {contact.phone}
                          </button>
                        )}
                        {contact.email && (
                          <button
                            onClick={() => handleEmailClick(contact.email!)}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/30"
                          >
                            <MailIcon className="h-3 w-3" />
                            Email
                          </button>
                        )}
                      </div>

                      {contact.notes && (
                        <div className="text-xs text-gray-500 mt-1 italic">{contact.notes}</div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => handleToggleJob(contact.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          contact.isOnCurrentJob
                            ? 'bg-cyan-600 text-white hover:bg-cyan-700'
                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                        }`}
                        title={contact.isOnCurrentJob ? 'Remove from job' : 'Add to job'}
                      >
                        {contact.isOnCurrentJob ? (
                          <CheckCircleIcon className="h-4 w-4" />
                        ) : (
                          <PlusIcon className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleEdit(contact)}
                        className="p-2 rounded-lg bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(contact.id)}
                        className="p-2 rounded-lg bg-gray-700 text-gray-400 hover:text-red-400 hover:bg-gray-600"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {contacts.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-800">
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="flex-1 py-2 rounded-lg bg-gray-700 text-gray-300 text-sm hover:bg-gray-600"
            >
              📤 Export
            </button>
            <button
              onClick={handleImport}
              className="flex-1 py-2 rounded-lg bg-gray-700 text-gray-300 text-sm hover:bg-gray-600"
            >
              📥 Import
            </button>
            <button
              onClick={handleClearAll}
              className="flex-1 py-2 rounded-lg bg-red-600/20 text-red-400 text-sm hover:bg-red-600/30"
            >
              🗑️ Clear All
            </button>
          </div>
        </div>
      )}

      {/* Job Name Modal */}
      {showJobNameModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-800 rounded-lg p-4 w-full max-w-sm">
            <h3 className="text-lg font-medium mb-3">Job/Project Name</h3>
            <input
              type="text"
              value={currentJobName}
              onChange={(e) => setCurrentJobNameState(e.target.value)}
              placeholder="e.g., Great Eastern Hwy Works"
              className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              autoFocus
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSaveJobName}
                className="flex-1 py-2 rounded-lg bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-700"
              >
                Save
              </button>
              <button
                onClick={() => setShowJobNameModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-600 text-white text-sm hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
