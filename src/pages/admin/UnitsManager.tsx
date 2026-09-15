import React, { useState, useEffect } from 'react';
import { Unit, Department, Organisation, StatusType } from '../../types';
import {
  getUnits,
  getDepartments,
  getOrganisations,
  createUnit,
  updateUnit,
  archiveUnit,
  deleteUnit
} from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useActionModal } from '../../context/ActionModalContext';
import {
  Grid,
  Layers,
  Building2,
  Plus,
  Search,
  Eye,
  Edit2,
  Archive,
  RotateCcw,
  Trash2,
  AlertCircle,
  RefreshCw,
  FolderTree,
  UserCheck,
  CheckCircle2,
  Tag,
  Power,
  PowerOff
} from 'lucide-react';

export const UnitsManager: React.FC = () => {
  const { adminUser, userProfile, isSuperAdmin } = useAuth();
  const { notifyAction, confirmAction } = useActionModal();

  const [units, setUnits] = useState<Unit[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedOrgFilter, setSelectedOrgFilter] = useState<string>('all');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'archived'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [formData, setFormData] = useState({
    organisationId: '',
    departmentId: '',
    name: '',
    code: '',
    headOfUnit: '',
    description: '',
    status: 'active' as StatusType
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const includeArchived = statusFilter === 'all' || statusFilter === 'archived';
      const [uList, dList, oList] = await Promise.all([
        getUnits(
          selectedDeptFilter === 'all' ? undefined : selectedDeptFilter,
          selectedOrgFilter === 'all' ? undefined : selectedOrgFilter,
          includeArchived
        ),
        getDepartments(selectedOrgFilter === 'all' ? undefined : selectedOrgFilter, false),
        getOrganisations(false)
      ]);
      setUnits(uList);
      setDepartments(dList);
      setOrganisations(oList);
    } catch (e) {
      console.error('Error loading units:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedOrgFilter, selectedDeptFilter, statusFilter]);

  // When Org filter changes, reset Dept filter if not in selected Org
  const handleOrgFilterChange = (orgId: string) => {
    setSelectedOrgFilter(orgId);
    setSelectedDeptFilter('all');
  };

  const handleOpenCreate = () => {
    const defaultOrg = selectedOrgFilter !== 'all' ? selectedOrgFilter : (organisations[0]?.id || '');
    const availableDepts = departments.filter(d => !defaultOrg || d.organisationId === defaultOrg);
    const defaultDept = selectedDeptFilter !== 'all' ? selectedDeptFilter : (availableDepts[0]?.id || '');

    setFormData({
      organisationId: defaultOrg,
      departmentId: defaultDept,
      name: '',
      code: '',
      headOfUnit: '',
      description: '',
      status: 'active'
    });
    setFormError('');
    setEditingUnit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (unit: Unit) => {
    setFormData({
      organisationId: unit.organisationId,
      departmentId: unit.departmentId,
      name: unit.name,
      code: unit.code || '',
      headOfUnit: unit.headOfUnit || '',
      description: unit.description || '',
      status: unit.status
    });
    setFormError('');
    setEditingUnit(unit);
    setIsModalOpen(true);
  };

  const handleViewUnit = (unit: Unit) => {
    notifyAction({
      type: 'read',
      title: 'Unit Profile (Read Access)',
      details: `Inspecting unit structure, leadership, and departmental affiliations for "${unit.name}".`,
      resourceName: unit.name,
      data: {
        'Unit Name': unit.name,
        'Code': unit.code || '—',
        'Department': unit.departmentName || '—',
        'Organisation': unit.organisationName || '—',
        'Head of Unit': unit.headOfUnit || '—',
        'Status': unit.status,
        'Description': unit.description || '—'
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.organisationId) {
      setFormError('Please select a parent organisation');
      return;
    }
    if (!formData.departmentId) {
      setFormError('Please select a parent department (Units are under departments)');
      return;
    }
    if (!formData.name.trim()) {
      setFormError('Unit name is required');
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      const selectedOrg = organisations.find(o => o.id === formData.organisationId);
      const selectedDept = departments.find(d => d.id === formData.departmentId);

      const actor = {
        id: adminUser?.id || userProfile?.uid || 'admin',
        name: adminUser?.fullName || userProfile?.displayName || 'Administrator',
        email: adminUser?.email || userProfile?.email
      };

      const executeSave = async () => {
        setSaving(true);
        try {
          if (editingUnit) {
            await updateUnit(editingUnit.id, {
              organisationId: formData.organisationId,
              organisationName: selectedOrg?.name,
              departmentId: formData.departmentId,
              departmentName: selectedDept?.name,
              name: formData.name.trim(),
              code: formData.code.trim().toUpperCase(),
              headOfUnit: formData.headOfUnit.trim(),
              description: formData.description.trim(),
              status: formData.status
            }, actor);
            notifyAction({
              type: 'update',
              title: 'Unit Updated',
              details: `"${formData.name.trim()}" was updated successfully under department "${selectedDept?.name}".`,
              resourceName: formData.name.trim()
            });
          } else {
            await createUnit({
              organisationId: formData.organisationId,
              organisationName: selectedOrg?.name,
              departmentId: formData.departmentId,
              departmentName: selectedDept?.name,
              name: formData.name.trim(),
              slug: formData.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              code: formData.code.trim().toUpperCase(),
              headOfUnit: formData.headOfUnit.trim(),
              description: formData.description.trim(),
              status: formData.status
            }, actor);
            notifyAction({
              type: 'create',
              title: 'Unit Created',
              details: `"${formData.name.trim()}" was added under ${selectedDept?.name || 'Department'}.`,
              resourceName: formData.name.trim()
            });
          }

          setIsModalOpen(false);
          loadData();
        } catch (err: any) {
          console.error('Error saving unit:', err);
          setFormError(err.message || 'Failed to save unit');
        } finally {
          setSaving(false);
        }
      };

      // Moving a Unit to another Department should require confirmation
      if (editingUnit && editingUnit.departmentId !== formData.departmentId) {
        confirmAction({
          type: 'update',
          title: 'Confirm Moving Unit to Another Department',
          message: `Are you sure you want to move unit "${editingUnit.name}" from "${editingUnit.departmentName || 'Current Department'}" to "${selectedDept?.name || 'New Department'}"? Historical memberships and voting exercises will remain intact.`,
          confirmLabel: 'Move Unit',
          isDestructive: false,
          onConfirm: async () => {
            await executeSave();
          }
        });
        return;
      }

      await executeSave();
    } catch (err: any) {
      console.error('Error saving unit:', err);
      setFormError(err.message || 'Failed to save unit');
      setSaving(false);
    }
  };

  const handleArchive = async (unit: Unit) => {
    const isArchiving = unit.status !== 'archived';
    const actor = {
      id: adminUser?.id || userProfile?.uid || 'admin',
      name: adminUser?.fullName || userProfile?.displayName || 'Administrator',
      email: adminUser?.email || userProfile?.email
    };

    if (isArchiving) {
      confirmAction({
        type: 'delete',
        title: 'Archive Unit',
        message: `Are you sure you want to archive "${unit.name}"? Historical memberships and voting exercises will remain intact. The unit status will be set to "archived".`,
        confirmLabel: 'Archive Unit',
        isDestructive: true,
        onConfirm: async () => {
          await archiveUnit(unit.id, actor);
          notifyAction({
            type: 'update',
            title: 'Unit Archived',
            details: `"${unit.name}" has been moved to archived status. Historical records remain intact.`,
            resourceName: unit.name
          });
          loadData();
        }
      });
    } else {
      await updateUnit(unit.id, { status: 'active' }, actor);
      notifyAction({
        type: 'update',
        title: 'Unit Restored',
        details: `"${unit.name}" has been restored to active status.`,
        resourceName: unit.name
      });
      loadData();
    }
  };

  const handleToggleStatus = async (unit: Unit) => {
    const nextStatus: StatusType = unit.status === 'active' ? 'inactive' : 'active';
    const actor = {
      id: adminUser?.id || userProfile?.uid || 'admin',
      name: adminUser?.fullName || userProfile?.displayName || 'Administrator',
      email: adminUser?.email || userProfile?.email
    };
    try {
      await updateUnit(unit.id, { status: nextStatus }, actor);
      notifyAction({
        type: 'update',
        title: 'Status Changed',
        details: `Unit "${unit.name}" is now ${nextStatus}.`,
        resourceName: unit.name
      });
      loadData();
    } catch (e: any) {
      console.error('Error toggling unit status:', e);
    }
  };

  const handleDelete = (unit: Unit) => {
    confirmAction({
      type: 'delete',
      title: 'Permanently Delete Unit',
      message: `Are you sure you want to permanently delete "${unit.name}"? This action cannot be undone. For historical data preservation, archiving is strongly recommended.`,
      confirmLabel: 'Delete Unit',
      isDestructive: true,
      onConfirm: async () => {
        const actor = {
          id: adminUser?.id || userProfile?.uid || 'admin',
          name: adminUser?.fullName || userProfile?.displayName || 'Administrator',
          email: adminUser?.email || userProfile?.email
        };
        await deleteUnit(unit.id, actor);
        notifyAction({
          type: 'delete',
          title: 'Unit Deleted',
          details: `"${unit.name}" was permanently removed.`,
          resourceName: unit.name
        });
        loadData();
      }
    });
  };

  const filteredUnits = units.filter(u => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.code && u.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.departmentName && u.departmentName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.organisationName && u.organisationName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.headOfUnit && u.headOfUnit.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const formAvailableDepts = departments.filter(
    d => !formData.organisationId || d.organisationId === formData.organisationId
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1E293B] p-6 rounded-xl border border-[#334155]">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#FF8A00]/20 flex items-center justify-center text-[#FF8A00] border border-[#FF8A00]/30">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#F8FAFC]">Units Management</h1>
              <p className="text-xs text-[#94A3B8]">
                Operational service units situated directly under church departments
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FF8A00] hover:bg-[#E67C00] text-[#0F172A] font-bold rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add New Unit
        </button>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4">
          <p className="text-xs text-[#94A3B8] font-medium uppercase tracking-wider">Total Units</p>
          <p className="text-2xl font-bold text-[#F8FAFC] mt-1">{units.length}</p>
        </div>
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4">
          <p className="text-xs text-[#94A3B8] font-medium uppercase tracking-wider">Active Units</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">
            {units.filter(u => u.status === 'active').length}
          </p>
        </div>
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4">
          <p className="text-xs text-[#94A3B8] font-medium uppercase tracking-wider">Parent Depts</p>
          <p className="text-2xl font-bold text-purple-400 mt-1">{departments.length}</p>
        </div>
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4">
          <p className="text-xs text-[#94A3B8] font-medium uppercase tracking-wider">Hierarchy Level</p>
          <p className="text-xs font-semibold text-[#FF8A00] mt-2">
            Org → Dept → <span className="underline">Unit</span>
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#1E293B] p-4 rounded-xl border border-[#334155] flex flex-col md:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search units by name, code, department, head..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#FF8A00]"
          />
        </div>

        {/* Organisation Filter */}
        <div className="w-full md:w-56">
          <select
            value={selectedOrgFilter}
            onChange={e => handleOrgFilterChange(e.target.value)}
            className="w-full px-3 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
          >
            <option value="all">All Organisations</option>
            {organisations.map(o => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>

        {/* Department Filter (Cascading) */}
        <div className="w-full md:w-56">
          <select
            value={selectedDeptFilter}
            onChange={e => setSelectedDeptFilter(e.target.value)}
            className="w-full px-3 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
          >
            <option value="all">All Departments</option>
            {departments
              .filter(d => selectedOrgFilter === 'all' || d.organisationId === selectedOrgFilter)
              .map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="w-full md:w-44">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="w-full px-3 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
            <option value="archived">Archived Only</option>
          </select>
        </div>
      </div>

      {/* Units List / Table */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-[#94A3B8] flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-[#FF8A00]" />
            <p className="text-sm">Loading units directory...</p>
          </div>
        ) : filteredUnits.length === 0 ? (
          <div className="py-16 text-center text-[#94A3B8] space-y-3">
            <FolderTree className="w-10 h-10 mx-auto text-[#64748B]" />
            <p className="text-base font-semibold text-[#F8FAFC]">No units found</p>
            <p className="text-xs text-[#64748B] max-w-sm mx-auto">
              {searchQuery || selectedOrgFilter !== 'all' || selectedDeptFilter !== 'all'
                ? 'No units match your current filters. Try changing or clearing your filters.'
                : 'Get started by clicking "Add New Unit" to create sub-departmental service units.'}
            </p>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF8A00] text-[#0F172A] font-bold text-xs rounded-lg mt-2"
            >
              <Plus className="w-3.5 h-3.5" />
              Create First Unit
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#334155] bg-[#0F172A]/50 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                  <th className="py-3.5 px-4">Unit Name & Code</th>
                  <th className="py-3.5 px-4">Parent Department</th>
                  <th className="py-3.5 px-4">Organisation</th>
                  <th className="py-3.5 px-4">Head of Unit</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155] text-sm">
                {filteredUnits.map(unit => (
                  <tr key={unit.id} className="hover:bg-[#334155]/20 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#FF8A00]/10 border border-[#FF8A00]/20 flex items-center justify-center text-[#FF8A00] shrink-0 font-bold text-xs">
                          {unit.code ? unit.code.slice(0, 3) : <Tag className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="font-semibold text-[#F8FAFC] flex items-center gap-2">
                            {unit.name}
                            {unit.code && (
                              <span className="px-1.5 py-0.5 rounded bg-[#334155] text-[10px] font-mono text-[#94A3B8]">
                                {unit.code}
                              </span>
                            )}
                          </div>
                          {unit.description && (
                            <p className="text-xs text-[#94A3B8] line-clamp-1 max-w-xs">{unit.description}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 text-xs font-medium">
                        <Layers className="w-3 h-3 text-purple-400" />
                        {unit.departmentName || 'Department'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20 text-xs font-medium">
                        <Building2 className="w-3 h-3 text-blue-400" />
                        {unit.organisationName || 'Organisation'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {unit.headOfUnit ? (
                        <div className="flex items-center gap-1.5 text-xs text-[#F8FAFC]">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                          {unit.headOfUnit}
                        </div>
                      ) : (
                        <span className="text-xs text-[#64748B] italic">Not specified</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          unit.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : unit.status === 'inactive'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-slate-700 text-slate-400 border border-slate-600'
                        }`}
                      >
                        {unit.status.charAt(0).toUpperCase() + unit.status.slice(1)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleViewUnit(unit)}
                          title="View Unit Profile (Read Access)"
                          className="p-1.5 text-sky-400 hover:text-sky-300 hover:bg-sky-500/15 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {unit.status !== 'archived' && (
                          <button
                            onClick={() => handleToggleStatus(unit)}
                            title={unit.status === 'active' ? 'Deactivate Unit' : 'Activate Unit'}
                            className={`p-1.5 rounded-lg transition-colors ${
                              unit.status === 'active'
                                ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/15'
                                : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/15'
                            }`}
                          >
                            {unit.status === 'active' ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenEdit(unit)}
                          title="Edit Unit"
                          className="p-1.5 text-[#94A3B8] hover:text-[#FF8A00] hover:bg-[#334155] rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleArchive(unit)}
                          title={unit.status === 'archived' ? 'Restore Unit' : 'Archive Unit'}
                          className="p-1.5 text-[#94A3B8] hover:text-amber-400 hover:bg-[#334155] rounded-lg transition-colors"
                        >
                          {unit.status === 'archived' ? <RotateCcw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                        </button>

                        {isSuperAdmin && (
                          <button
                            onClick={() => handleDelete(unit)}
                            title="Delete Unit"
                            className="p-1.5 text-[#94A3B8] hover:text-red-400 hover:bg-[#334155] rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm p-3 sm:p-4 flex items-center justify-center">
          <div className="bg-[#1E293B] border border-[#334155] rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 my-auto max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-[#334155] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#FF8A00]/20 flex items-center justify-center text-[#FF8A00] border border-[#FF8A00]/30 shrink-0">
                  <FolderTree className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#F8FAFC]">
                    {editingUnit ? 'Edit Service Unit' : 'Add New Service Unit'}
                  </h3>
                  <p className="text-xs text-[#94A3B8]">Unit is situated directly under a parent department</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#94A3B8] hover:text-white p-1.5 rounded-lg hover:bg-[#334155] transition-colors"
                title="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto overscroll-contain flex-1">
                {formError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

              {/* Step 1: Parent Organisation */}
              <div>
                <label className="block text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider mb-1.5">
                  1. Parent Organisation *
                </label>
                <select
                  value={formData.organisationId}
                  onChange={e => {
                    const orgId = e.target.value;
                    const depts = departments.filter(d => d.organisationId === orgId);
                    setFormData(prev => ({
                      ...prev,
                      organisationId: orgId,
                      departmentId: depts[0]?.id || ''
                    }));
                  }}
                  required
                  className="w-full px-3 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
                >
                  <option value="">Select Organisation</option>
                  {organisations.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>

              {/* Step 2: Parent Department (Cascading) */}
              <div>
                <label className="block text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider mb-1.5">
                  2. Parent Department (Unit is under Department) *
                </label>
                <select
                  value={formData.departmentId}
                  onChange={e => setFormData({ ...formData, departmentId: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
                >
                  <option value="">Select Department</option>
                  {formAvailableDepts.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                {formAvailableDepts.length === 0 && formData.organisationId && (
                  <p className="text-[11px] text-amber-400 mt-1">
                    No departments found under this organisation. Please create a department first.
                  </p>
                )}
              </div>

              {/* Step 3: Unit Name & Code */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider mb-1.5">
                    Unit Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Camera Operations Unit"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#FF8A00]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider mb-1.5">
                    Code / Abbr.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. COU"
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-[#F8FAFC] placeholder-[#64748B] font-mono focus:outline-none focus:border-[#FF8A00]"
                  />
                </div>
              </div>

              {/* Step 4: Head of Unit */}
              <div>
                <label className="block text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider mb-1.5">
                  Head of Unit / Coordinator (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Brother Emmanuel Vance"
                  value={formData.headOfUnit}
                  onChange={e => setFormData({ ...formData, headOfUnit: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#FF8A00]"
                />
              </div>

              {/* Step 5: Description */}
              <div>
                <label className="block text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider mb-1.5">
                  Description / Responsibilities (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Briefly describe what this operational unit handles..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#FF8A00]"
                />
              </div>

              {/* Step 6: Status */}
              <div>
                <label className="block text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider mb-1.5">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as StatusType })}
                  className="w-full px-3 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              </div>

              {/* Action Buttons - Fixed at bottom */}
              <div className="p-4 sm:p-6 border-t border-[#334155] flex items-center justify-end gap-3 bg-[#1E293B] shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-[#334155] hover:bg-[#475569] text-white font-medium text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-[#FF8A00] hover:bg-[#E67C00] text-[#0F172A] font-bold text-xs rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-md shadow-[#FF8A00]/20"
                >
                  {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {editingUnit ? 'Save Changes' : 'Create Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
