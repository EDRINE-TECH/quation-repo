import React, { useState } from 'react';
import { Client } from '../types';
import { getWhatsAppUrl, formatDate } from '../utils/formatters';
import { 
  Users, 
  UserPlus, 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  Edit2, 
  Trash2, 
  MessageCircle, 
  Plus, 
  FileText,
  X 
} from 'lucide-react';

interface ClientsManagerProps {
  clients: Client[];
  onAddClient: (client: Client) => void;
  onUpdateClient: (client: Client) => void;
  onDeleteClient: (id: string) => void;
  onStartQuoteForClient: (client: Client) => void;
}

export const ClientsManager: React.FC<ClientsManagerProps> = ({
  clients,
  onAddClient,
  onUpdateClient,
  onDeleteClient,
  onStartQuoteForClient,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string>('');

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const openAddModal = () => {
    setEditingClient(null);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setNotes('');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setName(client.name);
    setPhone(client.phone);
    setEmail(client.email || '');
    setAddress(client.address || '');
    setNotes(client.notes || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setFormError('Client Name and Phone Number are required.');
      return;
    }
    setFormError('');

    if (editingClient) {
      onUpdateClient({
        ...editingClient,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    } else {
      const newClient: Client = {
        id: `cli_${Math.random().toString(36).substring(2, 9)}`,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
        created_at: new Date().toISOString(),
      };
      onAddClient(newClient);
    }

    setIsModalOpen(false);
  };

  const filteredClients = clients.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      (c.address && c.address.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Client Directory</span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-800 text-amber-400 rounded-full">
              {clients.length}
            </span>
          </h1>
          <p className="text-xs text-slate-400">Save client contacts for quick quote creation & WhatsApp follow-ups</p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-amber-500/20 text-sm active:scale-95 transition-all"
        >
          <UserPlus size={16} />
          <span>Add Client</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-3 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search clients by name, phone or site location..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400"
        />
      </div>

      {/* Clients list */}
      {filteredClients.length === 0 ? (
        <div className="p-8 text-center bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl space-y-3">
          <Users size={32} className="mx-auto text-slate-600" />
          <p className="text-slate-400 text-sm">No clients found matching your search.</p>
          <button
            type="button"
            onClick={openAddModal}
            className="text-xs bg-slate-800 text-amber-400 hover:text-amber-300 px-4 py-2 rounded-xl font-bold inline-flex items-center gap-1.5"
          >
            <Plus size={14} />
            <span>Add New Client</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-white text-base">{client.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-300 mt-1">
                    <Phone size={13} className="text-emerald-400" />
                    <span className="font-mono font-medium">{client.phone}</span>
                  </div>
                </div>

                {/* Quick WhatsApp Link */}
                <a
                  href={getWhatsAppUrl(client.phone, `Hello ${client.name}, following up regarding your quotation.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 border border-emerald-500/30"
                >
                  <MessageCircle size={14} />
                  <span>WhatsApp</span>
                </a>
              </div>

              {/* Optional details */}
              {(client.address || client.email || client.notes) && (
                <div className="p-2.5 bg-slate-950/70 rounded-xl space-y-1 text-xs text-slate-400 border border-slate-800/80">
                  {client.address && (
                    <div className="flex items-center gap-1.5">
                      <MapPin size={12} className="text-amber-400 shrink-0" />
                      <span className="truncate">{client.address}</span>
                    </div>
                  )}
                  {client.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail size={12} className="text-sky-400 shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  {client.notes && (
                    <p className="text-[11px] text-slate-400 italic pt-0.5 border-t border-slate-800/60">
                      {client.notes}
                    </p>
                  )}
                </div>
              )}

              {/* Footer actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => onStartQuoteForClient(client)}
                  className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold rounded-xl flex items-center gap-1.5 active:scale-95"
                >
                  <FileText size={13} />
                  <span>New Quote for Client</span>
                </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(client)}
                      className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800 active:scale-95"
                      title="Edit client"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(client.id)}
                      className="p-2 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 active:scale-95"
                      title="Delete client"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {confirmDeleteId === client.id && (
                  <div className="mt-2 p-2.5 bg-rose-950/60 border border-rose-500/40 rounded-xl flex items-center justify-between text-xs animate-in fade-in">
                    <span className="text-rose-200 font-medium">Delete {client.name}?</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteClient(client.id);
                          setConfirmDeleteId(null);
                        }}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
        </div>
      )}

      {/* Add / Edit Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-2xl text-white space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-base text-amber-400">
              {editingClient ? 'Edit Client' : 'Add New Client'}
            </h3>
            {formError && (
              <div className="p-2.5 bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <X size={14} className="shrink-0 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Client Name * (Required)
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Hajji Musa Kasule"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Phone / WhatsApp * (Required)
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +256 772 123 456"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Site / Residence Address (Optional)
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Muyenga Tank Hill Road"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. client@example.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Notes / Job Reference (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Prefers calls after 4pm"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 rounded-xl text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 rounded-xl text-xs font-bold text-slate-950"
                >
                  {editingClient ? 'Save Changes' : 'Save Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
