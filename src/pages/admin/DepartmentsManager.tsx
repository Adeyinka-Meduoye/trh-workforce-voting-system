import React, { useState, useEffect } from 'react';
import { Department, Organisation, Unit, StatusType } from '../../types';
import {
  getDepartments,
  getOrganisations,
  getUnits,
  createDepartment,
  updateDepartment,
  archiveDepartment
} from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useActionModal } from '../../context/ActionModalContext';
import {
  Layers,
  Plus,
  Search,
  Eye,
  Edit2,
  Archive,
  RotateCcw,
  Building2,
  FolderTree,
  AlertCircle,
  ShieldAlert,
  RefreshCw,
  Power,
  PowerOff
} from 'lucide-react';

export const DepartmentsManager: React.FC = () => {
  const { userProfile, adminUser, isSuperAdmin } = useAuth();
  const { notifyAction } = useActionModal();

  const userRole = adminUser?.role || 'admin';
  const isSuperAdminRole = Boolean(isSuperAdmin || userRole === 'super_admin' || adminUser?.email === 'yinkopet@gmail.com');
  const isChurchAdminRole = Boolean(isSuperAdminRole || userRole === 'admin');
  const isOrgAdminRole = userRole === 'organisation_admin';
  const isDeptAdminRole = userRole === 'department_admin';

  const [departments, setDepartments] = useState<Department[]>([]);
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedOrgFilter, setSelectedOrgFilter] = useState<string>(
    isOrgAdminRole && adminUser?.organisationId ? adminUser.organisationId : 'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null);

  // Form
  const [formData, setFormData] = useState({
    organisationId: '',
    name: '',
    slug: '',
    description: '',
    status: 'active' as StatusType
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const activeOrgFilter = (isOrgAdminRole && adminUser?.organisationId) 
        ? adminUser.organisationId 
        : (selectedOrgFilter === 'all' ? undefined : selectedOrgFilter);

      const [depts, orgs, unitList] = await Promise.all([
        getDepartments(activeOrgFilter, showArchived),
        getOrganisations(false),
        getUnits(undefined, undefined, false)
      ]);

      let filteredDepts = depts;
      if (isDeptAdminRole && adminUser?.departmentId) {
        filteredDepts = depts.filter((d) => d.id === adminUser.departmentId);
      } else if (isOrgAdminRole && adminUser?.organisationId) {
        filteredDepts = depts.filter((d) => d.organisationId === adminUser.organisationId);
      }

      setDepartments(filteredDepts);
      setOrganisations(
        isOrgAdminRole && adminUser?.organisationId
          ? orgs.filter((o) => o.id === adminUser.organisationId)
          : orgs
      );
      setUnits(unitList);
    } catch (e) {
      console.error('Error loading departments:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedOrgFilter, showArchived, adminUser?.organisationId, adminUser?.departmentId]);

  const handleOpenCreate = () => {
    const defaultOrg = (isOrgAdminRole && adminUser?.organisationId)
      ? adminUser.organisationId
      : (selectedOrgFilter !== 'all' ? selectedOrgFilter : (organisations[0]?.id || ''));

    setFormData({
      organisationId: defaultOrg,
      name: '',
      slug: '',
      description: '',
      status: 'active'
    });
    setFormError('');
    setEditingDept(null);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setFormData({
      organisationId: dept.organisationId,
      name: dept.name,
      slug: dept.slug,
      description: dept.description || '',
      status: dept.status
    });
    setFormError('');
    setEditingDept(dept);
    setIsCreateOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.organisationId) {
      setFormError('Please select a parent organisation.');
      return;
    }
    if (!formData.name.trim()) {
      setFormError('Department name is required.');
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

      const selectedOrg = organisations.find(o => o.id === formData.organisationId);

      if (editingDept) {
        await updateDepartment(editingDept.id, {
          ...formData,
          organisationName: selectedOrg?.name
        }, actor);
        notifyAction({
          type: 'update',
          title: 'Department Updated',
          details: `Department "${formData.name}" was successfully updated under organisation "${selectedOrg?.name || '—'}".`,
          resourceName: formData.name,
          actorName: actor.name,
          data: {
            'Department Name': formData.name,
            'Organisation': selectedOrg?.name || '—',
            'Status': formData.status,
            'Description': formData.description || '—'
          }
        });
      } else {
        await createDepartment({
          ...formData,
          organisationName: selectedOrg?.name,
          createdBy: actor.id
        }, actor);
        notifyAction({
          type: 'create',
          title: 'Department Created',
          details: `New department "${formData.name}" has been created under organisation "${selectedOrg?.name || '—'}".`,
          resourceName: formData.name,
          actorName: actor.name,
          data: {
            'Department Name': formData.name,
            'Organisation': selectedOrg?.name || '—',
            'Status': formData.status,
            'Description': formData.description || '—'
          }
        });
      }
      setIsCreateOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Error saving department.');
    } finally {
      setSaving(false);
    }
  };

  const handleViewDept = (dept: Department) => {
    notifyAction({
      type: 'read',
      title: 'Department Profile (Read Access)',
      details: `Inspecting department details, organization hierarchy, and unit statistics for "${dept.name}".`,
      resourceName: dept.name,
      data: {
        'Department Name': dept.name,
        'Organisation': dept.organisationName || '—',
        'Status': dept.status,
        'Description': dept.description || '—',
        'Units Under Dept': dept.unitCount || 0
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
      const deptToArchive = departments.find((d) => d.id === id);
      await archiveDepartment(id, actor);
      setConfirmArchiveId(null);
      loadData();
      notifyAction({
        type: 'delete',
        title: 'Department Archived',
        details: `Department "${deptToArchive?.name || id}" has been archived and hidden from active voting selectors.`,
        resourceName: deptToArchive?.name || id,
        actorName: actor.name
      });
    } catch (e) {
      console.error('Error archiving department:', e);
    }
  };

  const handleToggleStatus = async (dept: Department) => {
    try {
      const nextStatus: StatusType = dept.status === 'active' ? 'inactive' : 'active';
      const actor = {
        id: userProfile?.uid || 'admin',
        name: userProfile?.displayName || 'Church Administrator',
        email: userProfile?.email
      };
      await updateDepartment(dept.id, { status: nextStatus }, actor);
      loadData();
      notifyAction({
        type: 'update',
        title: 'Department Status Toggled',
        details: `Department "${dept.name}" status transitioned to ${nextStatus}.`,
        resourceName: dept.name,
        actorName: actor.name
      });
    } catch (e) {
      console.error('Error toggling department status:', e);
    }
  };

  const handleRestore = async (dept: Department) => {
    try {
      const actor = {
        id: userProfile?.uid || 'admin',
        name: userProfile?.displayName || 'Church Administrator',
        email: userProfile?.email
      };
      await updateDepartment(dept.id, { status: 'active' }, actor);
      loadData();
      notifyAction({
        type: 'update',
        title: 'Department Restored',
        details: `Department "${dept.name}" has been restored to active status.`,
        resourceName: dept.name,
        actorName: actor.name
      });
    } catch (e) {
      console.error('Error restoring department:', e);
    }
  };

  const filteredDepts = departments.filter((d) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return d.name.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-[#F8FAFC] flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#FF8A00]" />
            Departments & Teams Management
          </h2>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Manage sub-ministries, teams, bands, and departmental units across organisations.
          </p>
        </div>

        {!isDeptAdminRole && (
          <button
            id="btn-create-dept"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#FF8A00] to-[#E85B00] hover:from-[#E85B00] hover:to-[#FF8A00] text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md shadow-[#FF8A00]/20 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Department</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#1E293B] rounded-2xl border border-slate-800 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search departments by name or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#FF8A00] transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 self-end sm:self-center">
          {isOrgAdminRole ? (
            <div className="px-3 py-2 bg-[#334155] border border-purple-500/40 rounded-xl text-xs text-purple-300 font-medium flex items-center gap-1.5">
              <span>Scoped Org: {adminUser?.organisationName || 'Assigned Organisation'}</span>
            </div>
          ) : (
            <select
              value={selectedOrgFilter}
              onChange={(e) => setSelectedOrgFilter(e.target.value)}
              className="px-3 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00] font-medium"
            >
              <option value="all">All Organisations</option>
              {organisations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          )}

          <label className="flex items-center gap-2 text-xs text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded bg-[#334155] border-slate-700 text-[#FF8A00] focus:ring-[#FF8A00] w-3.5 h-3.5"
            />
            <span>Include Archived</span>
          </label>
        </div>
      </div>

      {/* Departments Table */}
      {loading ? (
        <div className="bg-[#1E293B] rounded-2xl border border-slate-800 py-16 text-center text-[#94A3B8] text-xs flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-5 h-5 text-[#FF8A00] animate-spin" />
          <span>Loading departments...</span>
        </div>
      ) : filteredDepts.length === 0 ? (
        <div className="bg-[#1E293B] rounded-2xl border border-dashed border-slate-700 p-12 text-center space-y-3">
          <Layers className="w-10 h-10 text-[#94A3B8] mx-auto opacity-50" />
          <h3 className="text-sm font-bold text-[#F8FAFC]">No Departments Found</h3>
          <p className="text-xs text-[#94A3B8] max-w-sm mx-auto">
            Create departments to organize ministry teams within your church organisations.
          </p>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-gradient-to-r from-[#FF8A00] to-[#E85B00] text-slate-950 rounded-xl text-xs font-bold hover:from-[#E85B00] hover:to-[#FF8A00]"
          >
            + Create Department
          </button>
        </div>
      ) : (
        <div className="bg-[#1E293B] rounded-2xl border border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0F172A]/70 border-b border-slate-800 text-[#94A3B8] uppercase tracking-wider text-[11px] font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Department / Team</th>
                  <th className="px-6 py-3.5">Parent Organisation</th>
                  <th className="px-6 py-3.5">Sub-Units</th>
                  <th className="px-6 py-3.5">Description</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredDepts.map((dept) => {
                  const isArchived = dept.status === 'archived';
                  const orgName = organisations.find(o => o.id === dept.organisationId)?.name || dept.organisationName || '—';
                  const deptUnits = units.filter(u => u.departmentId === dept.id);

                  return (
                    <tr key={dept.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#F8FAFC] text-sm">{dept.name}</div>
                        <div className="text-[11px] text-[#94A3B8] font-mono">{dept.slug}</div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#334155] border border-slate-700 text-[#F8FAFC] rounded-lg text-xs font-medium">
                          <Building2 className="w-3.5 h-3.5 text-[#FF8A00]" />
                          {orgName}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#251464]/80 border border-[#FF8A00]/30 text-[#FF8A00] rounded-md text-[11px] font-bold">
                            <FolderTree className="w-3 h-3" />
                            {deptUnits.length} {deptUnits.length === 1 ? 'Unit' : 'Units'}
                          </span>
                          {deptUnits.slice(0, 2).map((u) => (
                            <span key={u.id} className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px]">
                              {u.name}
                            </span>
                          ))}
                          {deptUnits.length > 2 && (
                            <span className="text-[10px] text-slate-400 font-medium">+{deptUnits.length - 2} more</span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 max-w-xs">
                        <p className="text-[#94A3B8] truncate">{dept.description || '—'}</p>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                            dept.status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : dept.status === 'inactive'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-700/50 text-[#94A3B8] border border-slate-600'
                          }`}
                        >
                          {dept.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleViewDept(dept)}
                            title="View Department Details (Read Access)"
                            className="p-1.5 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {!isArchived && (
                            <button
                              onClick={() => handleToggleStatus(dept)}
                              title={dept.status === 'active' ? 'Deactivate Department' : 'Activate Department'}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                dept.status === 'active'
                                  ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/15'
                                  : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/15'
                              }`}
                            >
                              {dept.status === 'active' ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenEdit(dept)}
                            title="Edit Department"
                            className="p-1.5 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#334155] rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {isArchived ? (
                            <button
                              onClick={() => handleRestore(dept)}
                              title="Restore Department"
                              className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setConfirmArchiveId(dept.id)}
                              title="Archive Department"
                              className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
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
          <div className="bg-[#1E293B] border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl max-w-lg w-full my-auto max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden animate-scaleIn">
            <div className="p-4 sm:p-6 flex items-start justify-between border-b border-slate-800 shrink-0">
              <div>
                <h3 className="text-base sm:text-lg font-bold font-display text-[#F8FAFC] flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#FF8A00]" />
                  {editingDept ? 'Edit Department' : 'Create New Department'}
                </h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Departments organize ministry members and voting categories within an organisation.
                </p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-[#94A3B8] hover:text-[#F8FAFC] text-xl font-bold p-1 rounded-lg hover:bg-[#334155]"
                title="Close"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto overscroll-contain flex-1">
                {formError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block font-semibold text-[#F8FAFC]">Parent Organisation *</label>
                  <select
                    required
                    value={formData.organisationId}
                    onChange={(e) => setFormData({ ...formData, organisationId: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
                  >
                    <option value="">Select Parent Organisation...</option>
                    {organisations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-[#F8FAFC]">Department / Team Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sanctuary Maintenance Team, Choir, Live Broadcast"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#FF8A00]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-[#F8FAFC]">Slug (Optional URL Identifier)</label>
                  <input
                    type="text"
                    placeholder="auto-generated-if-blank"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] font-mono placeholder:text-[#94A3B8] focus:outline-none focus:border-[#FF8A00]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-[#F8FAFC]">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Responsibilities, mandate, and service scope for this department..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#FF8A00]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-[#F8FAFC]">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as StatusType })}
                    className="w-full px-3.5 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="p-4 sm:p-6 border-t border-slate-800 shrink-0 flex items-center justify-end gap-3 bg-[#1E293B]">
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
                  className="px-5 py-2.5 bg-gradient-to-r from-[#FF8A00] to-[#E85B00] hover:from-[#E85B00] hover:to-[#FF8A00] text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-[#FF8A00]/20 disabled:opacity-50 cursor-pointer transition-all"
                >
                  {saving ? 'Saving...' : editingDept ? 'Update Department' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ARCHIVE CONFIRMATION MODAL */}
      {confirmArchiveId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#1E293B] border border-slate-800 rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-4 my-auto animate-scaleIn">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-[#F8FAFC]">Archive Department?</h3>
              <p className="text-xs text-[#94A3B8]">
                This department will be hidden from active dropdowns and voting filters. You can restore it anytime.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setConfirmArchiveId(null)}
                className="px-4 py-2 bg-[#334155] hover:bg-[#475569] text-[#F8FAFC] rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleArchive(confirmArchiveId)}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs shadow-md"
              >
                Archive Department
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
