import React, { useState, useEffect } from 'react';
import { Organisation, StatusType } from '../../types';
import {
  getOrganisations,
  createOrganisation,
  updateOrganisation,
  archiveOrganisation
} from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useActionModal } from '../../context/ActionModalContext';
import {
  Building2,
  Plus,
  Search,
  Eye,
  Edit2,
  Archive,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Layers,
  Vote,
  ExternalLink,
  ShieldAlert,
  Power,
  PowerOff
} from 'lucide-react';

export const OrganisationsManager: React.FC = () => {
  const { userProfile, adminUser, isSuperAdmin } = useAuth();
  const { notifyAction } = useActionModal();

  const userRole = adminUser?.role || 'admin';
  const isSuperAdminRole = Boolean(isSuperAdmin || userRole === 'super_admin' || adminUser?.email === 'yinkopet@gmail.com');
  const isChurchAdminRole = Boolean(isSuperAdminRole || userRole === 'admin');

  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organisation | null>(null);
  const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    logoUrl: '',
    status: 'active' as StatusType
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await getOrganisations(showArchived);
      setOrganisations(list);
    } catch (e) {
      console.error('Error loading organisations:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [showArchived]);

  if (!isChurchAdminRole) {
    return (
      <div className="bg-[#1E293B] border border-slate-800 rounded-3xl p-8 text-center max-w-xl mx-auto space-y-4 my-12 shadow-xl">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#F8FAFC]">Access Restricted: Church Administrator Authority Required</h3>
          <p className="text-xs text-[#94A3B8] mt-1.5 leading-relaxed">
            Only Church Administrators and Super Administrators can register, reconfigure, or archive top-level church organisations. Organisation Administrators and Department Administrators are scoped to their assigned unit/department operations.
          </p>
          <div className="mt-4 p-3 bg-slate-900 border border-slate-800 rounded-xl text-[11px] text-slate-400">
            Current Role: <span className="text-[#FF8A00] font-bold uppercase">{userRole.replace('_', ' ')}</span>
            {adminUser?.organisationName && <span> • Scoped to: <strong className="text-white">{adminUser.organisationName}</strong></span>}
          </div>
        </div>
      </div>
    );
  }

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      logoUrl: '',
      status: 'active'
    });
    setFormError('');
    setEditingOrg(null);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (org: Organisation) => {
    setFormData({
      name: org.name,
      slug: org.slug,
      description: org.description || '',
      logoUrl: org.logoUrl || '',
      status: org.status
    });
    setFormError('');
    setEditingOrg(org);
    setIsCreateOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Organisation name is required.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const actor = {
        id: userProfile?.uid || 'admin',
        name: userProfile?.displayName || 'Church Administrator',
        email: userProfile?.email
      };

      if (editingOrg) {
        await updateOrganisation(editingOrg.id, formData, actor);
        notifyAction({
          type: 'update',
          title: 'Organisation Updated',
          details: `Organisation "${formData.name}" has been updated successfully.`,
          resourceName: formData.name,
          actorName: actor.name,
          data: {
            'Organisation Name': formData.name,
            'Slug': formData.slug || '—',
            'Status': formData.status,
            'Description': formData.description || '—'
          }
        });
      } else {
        await createOrganisation(
          {
            ...formData,
            createdBy: actor.id
          },
          actor
        );
        notifyAction({
          type: 'create',
          title: 'Organisation Created',
          details: `New organisation "${formData.name}" was registered successfully in the system.`,
          resourceName: formData.name,
          actorName: actor.name,
          data: {
            'Organisation Name': formData.name,
            'Slug': formData.slug || '—',
            'Status': formData.status,
            'Description': formData.description || '—'
          }
        });
      }
      setIsCreateOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Error saving organisation.');
    } finally {
      setSaving(false);
    }
  };

  const handleViewOrg = (org: Organisation) => {
    notifyAction({
      type: 'read',
      title: 'Organisation Profile (Read Access)',
      details: `Inspecting record details, departmental scope, and status for "${org.name}".`,
      resourceName: org.name,
      data: {
        'Organisation Name': org.name,
        'Slug / Identifier': org.slug || '—',
        'Status': org.status,
        'Description': org.description || '—',
        'Department Count': org.departmentCount || 0
      }
    });
  };

  const handleArchive = async (id: string) => {
    try {
      const actor = {
        id: userProfile?.uid || 'admin',
        name: userProfile?.displayName || 'Church Administrator',
        email: userProfile?.email
      };
      const orgToArchive = organisations.find((o) => o.id === id);
      await archiveOrganisation(id, actor);
      setConfirmArchiveId(null);
      loadData();
      notifyAction({
        type: 'delete',
        title: 'Organisation Archived',
        details: `Organisation "${orgToArchive?.name || id}" has been archived and hidden from active selectors.`,
        resourceName: orgToArchive?.name || id,
        actorName: actor.name
      });
    } catch (e) {
      console.error('Error archiving organisation:', e);
    }
  };

  const handleToggleStatus = async (org: Organisation) => {
    try {
      const nextStatus: StatusType = org.status === 'active' ? 'inactive' : 'active';
      const actor = {
        id: userProfile?.uid || 'admin',
        name: userProfile?.displayName || 'Church Administrator',
        email: userProfile?.email
      };
      await updateOrganisation(org.id, { status: nextStatus }, actor);
      loadData();
      notifyAction({
        type: 'update',
        title: 'Organisation Status Toggled',
        details: `Organisation "${org.name}" status transitioned to ${nextStatus}.`,
        resourceName: org.name,
        actorName: actor.name
      });
    } catch (e) {
      console.error('Error toggling organisation status:', e);
    }
  };

  const handleRestore = async (org: Organisation) => {
    try {
      const actor = {
        id: userProfile?.uid || 'admin',
        name: userProfile?.displayName || 'Church Administrator',
        email: userProfile?.email
      };
      await updateOrganisation(org.id, { status: 'active' }, actor);
      loadData();
      notifyAction({
        type: 'update',
        title: 'Organisation Restored',
        details: `Organisation "${org.name}" has been restored to active status.`,
        resourceName: org.name,
        actorName: actor.name
      });
    } catch (e) {
      console.error('Error restoring organisation:', e);
    }
  };

  const filteredOrgs = organisations.filter((org) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return org.name.toLowerCase().includes(q) || org.description?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-[#F8FAFC] flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#FF8A00]" />
            Organisations Management
          </h2>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Configure church-wide ministries, directorates, and operational organisations.
          </p>
        </div>

        <button
          id="btn-create-org"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#FF8A00] to-[#E85B00] hover:opacity-95 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-[#FF8A00]/25"
        >
          <Plus className="w-4 h-4" />
          <span>New Organisation</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#1E293B] rounded-2xl border border-[#334155] p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search organisations by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#334155] border border-[#475569] rounded-xl text-xs text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#FF8A00]"
          />
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <label className="flex items-center gap-2 text-xs text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded bg-[#334155] border-[#475569] text-[#FF8A00] focus:ring-[#FF8A00] w-3.5 h-3.5"
            />
            <span>Include Archived</span>
          </label>
        </div>
      </div>

      {/* Organisations Table */}
      {loading ? (
        <div className="py-12 text-center text-[#94A3B8] text-xs">
          Loading organisations from Firestore...
        </div>
      ) : filteredOrgs.length === 0 ? (
        <div className="bg-[#1E293B] rounded-2xl border border-dashed border-[#334155] p-12 text-center space-y-3">
          <Building2 className="w-10 h-10 text-[#94A3B8] mx-auto" />
          <h3 className="text-sm font-bold text-[#F8FAFC]">No Organisations Found</h3>
          <p className="text-xs text-[#94A3B8] max-w-sm mx-auto">
            Get started by creating your first church organisation (e.g. Sanctuary, Music, Media, Protocol).
          </p>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-gradient-to-r from-[#FF8A00] to-[#E85B00] text-white rounded-xl text-xs font-bold hover:opacity-95 shadow-md shadow-[#FF8A00]/25"
          >
            Create Organisation
          </button>
        </div>
      ) : (
        <div className="bg-[#1E293B] rounded-2xl border border-[#334155] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0F172A] border-b border-[#334155] text-[#94A3B8] uppercase tracking-wider text-[11px] font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Organisation</th>
                  <th className="px-6 py-3.5">Description</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Departments</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155]">
                {filteredOrgs.map((org) => {
                  const isArchived = org.status === 'archived';
                  return (
                    <tr key={org.id} className="hover:bg-[#334155]/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#251464] border border-[#FF8A00]/30 overflow-hidden shrink-0 flex items-center justify-center font-bold text-[#FF8A00] text-xs">
                            {org.logoUrl ? (
                              <img src={org.logoUrl} alt={org.name} className="w-full h-full object-cover" />
                            ) : (
                              org.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-[#F8FAFC] text-sm">{org.name}</div>
                            <div className="text-[11px] text-[#94A3B8] font-mono">{org.slug}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 max-w-xs">
                        <p className="text-[#94A3B8] truncate">{org.description || '—'}</p>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                            org.status === 'active'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : org.status === 'inactive'
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-[#334155] text-[#94A3B8] border border-[#475569]'
                          }`}
                        >
                          {org.status}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#334155] text-[#F8FAFC] border border-[#475569] rounded-lg text-xs font-semibold">
                          <Layers className="w-3.5 h-3.5 text-[#FF8A00]" />
                          {org.departmentCount || 0} Depts
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleViewOrg(org)}
                            title="View Organisation Profile (Read Access)"
                            className="p-1.5 text-sky-400 hover:text-sky-300 hover:bg-sky-500/15 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {!isArchived && (
                            <button
                              onClick={() => handleToggleStatus(org)}
                              title={org.status === 'active' ? 'Deactivate Organisation' : 'Activate Organisation'}
                              className={`p-1.5 rounded-lg transition-colors ${
                                org.status === 'active'
                                  ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/15'
                                  : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/15'
                              }`}
                            >
                              {org.status === 'active' ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenEdit(org)}
                            title="Edit Organisation"
                            className="p-1.5 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#334155] rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {isArchived ? (
                            <button
                              onClick={() => handleRestore(org)}
                              title="Restore Organisation"
                              className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/15 rounded-lg transition-colors"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setConfirmArchiveId(org.id)}
                              title="Archive Organisation"
                              className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 rounded-lg transition-colors"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm p-3 sm:p-4 flex items-center justify-center">
          <div className="bg-[#1E293B] rounded-2xl sm:rounded-3xl max-w-lg w-full my-auto max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden shadow-2xl border border-[#334155] animate-scaleUp">
            <div className="p-4 sm:p-6 flex items-center justify-between border-b border-[#334155] shrink-0">
              <h3 className="text-base sm:text-lg font-bold font-display text-[#F8FAFC]">
                {editingOrg ? 'Edit Organisation' : 'Create New Organisation'}
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-[#94A3B8] hover:text-[#F8FAFC] font-bold text-lg p-1 rounded-lg hover:bg-[#334155]"
                title="Close"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto overscroll-contain flex-1">
                {formError && (
                  <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-[#F8FAFC] mb-1">Organisation Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sanctuary Organisation, Music Directorate"
                    value={formData.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setFormData({
                        ...formData,
                        name,
                        slug: editingOrg ? formData.slug : name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
                      });
                    }}
                    className="w-full px-3 py-2 bg-[#334155] border border-[#475569] rounded-xl text-xs text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#FF8A00]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#F8FAFC] mb-1">Slug / Identifier</label>
                  <input
                    type="text"
                    placeholder="e.g. sanctuary-organisation"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-3 py-2 bg-[#334155] border border-[#475569] rounded-xl text-xs font-mono text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#FF8A00]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#F8FAFC] mb-1">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Describe the scope and purpose of this church organisation..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-[#334155] border border-[#475569] rounded-xl text-xs text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#FF8A00] resize-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#F8FAFC] mb-1">Logo / Banner URL</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formData.logoUrl}
                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                    className="w-full px-3 py-2 bg-[#334155] border border-[#475569] rounded-xl text-xs text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#FF8A00]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#F8FAFC] mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as StatusType })}
                    className="w-full px-3 py-2 bg-[#334155] border border-[#475569] rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="p-4 sm:p-6 border-t border-[#334155] shrink-0 flex items-center justify-end gap-3 bg-[#1E293B]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2.5 bg-[#334155] hover:bg-[#475569] text-[#F8FAFC] rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#FF8A00] to-[#E85B00] hover:opacity-95 text-white rounded-xl text-xs font-bold shadow-md shadow-[#FF8A00]/25 disabled:opacity-50 cursor-pointer transition-all"
                >
                  {saving ? 'Saving...' : editingOrg ? 'Update Organisation' : 'Create Organisation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM ARCHIVE (SOFT DELETE) DIALOG */}
      {confirmArchiveId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#1E293B] rounded-2xl sm:rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#334155] space-y-4 my-auto animate-scaleUp">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#F8FAFC]">Archive Organisation?</h3>
            </div>

            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Archiving hides this organisation from active lists while safely preserving historical voting records, votes, and awards. You can restore it at any time.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmArchiveId(null)}
                className="px-4 py-2 text-[#94A3B8] hover:text-[#F8FAFC] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleArchive(confirmArchiveId)}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Archive Organisation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
