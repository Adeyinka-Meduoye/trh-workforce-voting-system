import React, { useState, useEffect } from 'react';
import { Person, Organisation, Department, Unit, StatusType, Membership } from '../../types';
import {
  getPeople,
  getOrganisations,
  getDepartments,
  getUnits,
  createPerson,
  updatePerson,
  archivePerson,
  deletePerson,
  createMembership,
  updateMembership,
  deleteMembership
} from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useActionModal } from '../../context/ActionModalContext';
import {
  Users,
  UserPlus,
  Eye,
  Search,
  Building2,
  Layers,
  FolderTree,
  KeyRound,
  Copy,
  Check,
  Edit2,
  Archive,
  RotateCcw,
  Sparkles,
  AlertCircle,
  ShieldAlert,
  RefreshCw,
  Mail,
  Phone,
  Network,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  BadgeCheck,
  Image as ImageIcon
} from 'lucide-react';

export const PeopleManager: React.FC = () => {
  const { userProfile, isSuperAdmin, adminUser } = useAuth();
  const { notifyAction } = useActionModal();

  // Role Scope Identification
  const effectiveRole = adminUser?.role || userProfile?.role;
  const isOrgAdminRole = effectiveRole === 'organisation_admin';
  const isDeptAdminRole = effectiveRole === 'department_admin';
  const scopedOrgId = (isOrgAdminRole || isDeptAdminRole) ? adminUser?.organisationId : undefined;
  const scopedDeptId = isDeptAdminRole ? adminUser?.departmentId : undefined;

  const [people, setPeople] = useState<Person[]>([]);
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [orgFilter, setOrgFilter] = useState<string>(() => scopedOrgId || 'all');
  const [deptFilter, setDeptFilter] = useState<string>(() => scopedDeptId || 'all');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // Sync scoped filters if admin session changes
  useEffect(() => {
    if (scopedOrgId && orgFilter !== scopedOrgId) {
      setOrgFilter(scopedOrgId);
    }
    if (scopedDeptId && deptFilter !== scopedDeptId) {
      setDeptFilter(scopedDeptId);
    }
  }, [scopedOrgId, scopedDeptId]);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Super Admin Delete Modal State
  const [memberToDelete, setMemberToDelete] = useState<Person | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Memberships Management State
  const [selectedPersonForMemberships, setSelectedPersonForMemberships] = useState<Person | null>(null);
  const [newMembershipOrg, setNewMembershipOrg] = useState('');
  const [newMembershipDept, setNewMembershipDept] = useState('');
  const [newMembershipUnit, setNewMembershipUnit] = useState('');
  const [newMembershipRole, setNewMembershipRole] = useState('');
  const [newMembershipStatus, setNewMembershipStatus] = useState<'active' | 'inactive'>('active');
  const [membershipSaving, setMembershipSaving] = useState(false);
  const [membershipError, setMembershipError] = useState('');

  // Form
  const [formData, setFormData] = useState({
    organisationId: '',
    departmentId: '',
    unitId: '',
    fullName: '',
    photoUrl: '',
    roleTitle: '',
    email: '',
    phone: '',
    voterCode: '',
    status: 'active' as StatusType
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const activeOrgFilter = (isOrgAdminRole || isDeptAdminRole) && scopedOrgId
        ? scopedOrgId
        : (orgFilter === 'all' ? undefined : orgFilter);

      const activeDeptFilter = isDeptAdminRole && scopedDeptId
        ? scopedDeptId
        : (deptFilter === 'all' ? undefined : deptFilter);

      const [peopleList, orgList, deptList, unitList] = await Promise.all([
        getPeople(
          activeOrgFilter,
          activeDeptFilter,
          unitFilter === 'all' ? undefined : unitFilter,
          showArchived
        ),
        getOrganisations(false),
        getDepartments(undefined, false),
        getUnits(undefined, undefined, false)
      ]);

      // Strict role isolation post-filtering to guarantee zero data leakage
      let finalPeople = peopleList;
      if (isDeptAdminRole && scopedDeptId) {
        finalPeople = finalPeople.filter(
          (p) =>
            p.departmentId === scopedDeptId ||
            (p.memberships && p.memberships.some((m) => m.departmentId === scopedDeptId))
        );
      } else if (isOrgAdminRole && scopedOrgId) {
        finalPeople = finalPeople.filter(
          (p) =>
            p.organisationId === scopedOrgId ||
            (p.memberships && p.memberships.some((m) => m.organisationId === scopedOrgId))
        );
      }

      // Filter organisation, department, and unit options strictly to scope
      let filteredOrgs = orgList;
      let filteredDepts = deptList;
      let filteredUnits = unitList;

      if (isOrgAdminRole && scopedOrgId) {
        filteredOrgs = orgList.filter((o) => o.id === scopedOrgId);
        filteredDepts = deptList.filter((d) => d.organisationId === scopedOrgId);
        filteredUnits = unitList.filter((u) => u.organisationId === scopedOrgId);
      } else if (isDeptAdminRole && scopedDeptId) {
        filteredOrgs = orgList.filter((o) => o.id === scopedOrgId);
        filteredDepts = deptList.filter((d) => d.id === scopedDeptId);
        filteredUnits = unitList.filter((u) => u.departmentId === scopedDeptId);
      }

      setPeople(finalPeople);
      setOrganisations(filteredOrgs);
      setDepartments(filteredDepts);
      setUnits(filteredUnits);
    } catch (e) {
      console.error('Error loading people:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgFilter, deptFilter, unitFilter, showArchived, scopedOrgId, scopedDeptId]);

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const generateVoterCode = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = 'VOTE-';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleOpenCreate = () => {
    const defaultOrg = scopedOrgId || (orgFilter !== 'all' ? orgFilter : (organisations[0]?.id || ''));
    const availableDepts = departments.filter((d) => !defaultOrg || d.organisationId === defaultOrg);
    const defaultDept = scopedDeptId || (deptFilter !== 'all' ? deptFilter : (availableDepts[0]?.id || ''));
    const availableUnits = units.filter((u) => !defaultDept || u.departmentId === defaultDept);
    const defaultUnit = unitFilter !== 'all' ? unitFilter : (availableUnits[0]?.id || '');

    setFormData({
      organisationId: defaultOrg,
      departmentId: defaultDept,
      unitId: defaultUnit,
      roleTitle: '',
      fullName: '',
      photoUrl: '',
      email: '',
      phone: '',
      voterCode: generateVoterCode(),
      status: 'active'
    });
    setFormError('');
    setEditingPerson(null);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (person: Person) => {
    setFormData({
      organisationId: scopedOrgId || person.organisationId,
      departmentId: scopedDeptId || person.departmentId || '',
      unitId: person.unitId || '',
      roleTitle: person.roleTitle || '',
      fullName: person.fullName,
      photoUrl: person.photoUrl || person.avatarUrl || '',
      email: person.email || '',
      phone: person.phone || '',
      voterCode: person.voterCode,
      status: person.status
    });
    setFormError('');
    setEditingPerson(person);
    setIsCreateOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveOrgId = scopedOrgId || formData.organisationId;
    const effectiveDeptId = scopedDeptId || formData.departmentId;

    if (!effectiveOrgId) {
      setFormError('Please select an organisation.');
      return;
    }
    if (!formData.fullName.trim()) {
      setFormError('Full name is required.');
      return;
    }
    if (!formData.voterCode.trim()) {
      setFormError('Voter code is required.');
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

      const selectedOrg = organisations.find((o) => o.id === effectiveOrgId);
      const selectedDept = departments.find((d) => d.id === effectiveDeptId);
      const selectedUnit = units.find((u) => u.id === formData.unitId);

      const payload = {
        organisationId: effectiveOrgId,
        organisationName: selectedOrg?.name,
        departmentId: effectiveDeptId || undefined,
        departmentName: selectedDept?.name,
        unitId: formData.unitId || undefined,
        unitName: selectedUnit?.name,
        roleTitle: formData.roleTitle.trim() || undefined,
        fullName: formData.fullName.trim(),
        photoUrl: formData.photoUrl.trim() || undefined,
        avatarUrl: formData.photoUrl.trim() || undefined,
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        voterCode: formData.voterCode.trim().toUpperCase(),
        status: formData.status
      };

      if (editingPerson) {
        await updatePerson(editingPerson.id, payload, actor);
        notifyAction({
          type: 'update',
          title: 'Church Member Updated',
          details: `Successfully updated the registry record for "${payload.fullName}". Departmental assignments and voter code synchronized.`,
          resourceName: payload.fullName,
          actorName: actor.name,
          data: {
            'Full Name': payload.fullName,
            'Photo URL': payload.photoUrl || 'Not provided (Default avatar)',
            'Role/Title': payload.roleTitle || '—',
            'Voter Code': payload.voterCode,
            'Organisation': payload.organisationName || '—',
            'Department': payload.departmentName || '—',
            'Unit': payload.unitName || '—',
            'Phone': payload.phone || '—',
            'Email': payload.email || '—',
            'Status': payload.status
          }
        });
      } else {
        await createPerson(payload, actor);
        notifyAction({
          type: 'create',
          title: 'Church Member Registered',
          details: `Successfully created and registered "${payload.fullName}" into the church workforce database with voter code ${payload.voterCode}.`,
          resourceName: payload.fullName,
          actorName: actor.name,
          data: {
            'Full Name': payload.fullName,
            'Photo URL': payload.photoUrl || 'Not provided (Default avatar)',
            'Role/Title': payload.roleTitle || '—',
            'Voter Code': payload.voterCode,
            'Organisation': payload.organisationName || '—',
            'Department': payload.departmentName || '—',
            'Unit': payload.unitName || '—',
            'Phone': payload.phone || '—',
            'Email': payload.email || '—',
            'Status': payload.status
          }
        });
      }
      setIsCreateOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Error saving church member.');
    } finally {
      setSaving(false);
    }
  };

  const handleViewMember = (person: Person) => {
    notifyAction({
      type: 'read',
      title: 'Church Member Profile (Read Access)',
      details: `Accessed workforce identity credentials, contact details, and department memberships for ${person.fullName}.`,
      resourceName: person.fullName,
      data: {
        'Full Name': person.fullName,
        'Photo URL': person.photoUrl || person.avatarUrl || 'Not set (Default avatar)',
        'Role / Title': person.roleTitle || '—',
        'Voter Code': person.voterCode,
        'Organisation': person.organisationName || '—',
        'Department': person.departmentName || '—',
        'Unit': person.unitName || '—',
        'Email': person.email || '—',
        'Phone': person.phone || '—',
        'Status': person.status,
        'Workforce Member': person.workforceMember !== false ? 'Yes' : 'No'
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
      const personToArchive = people.find((p) => p.id === id);
      await archivePerson(id, actor);
      setConfirmArchiveId(null);
      loadData();
      notifyAction({
        type: 'delete',
        title: 'Church Member Archived',
        details: `Member "${personToArchive?.fullName || id}" was archived from active voter status.`,
        resourceName: personToArchive?.fullName || id,
        actorName: actor.name
      });
    } catch (e) {
      console.error('Error archiving member:', e);
    }
  };

  const handleRestore = async (person: Person) => {
    try {
      const actor = {
        id: userProfile?.uid || 'admin',
        name: userProfile?.displayName || 'Church Administrator',
        email: userProfile?.email
      };
      await updatePerson(person.id, { status: 'active' }, actor);
      loadData();
      notifyAction({
        type: 'update',
        title: 'Church Member Restored',
        details: `Member "${person.fullName}" was restored to active church workforce status.`,
        resourceName: person.fullName,
        actorName: actor.name
      });
    } catch (e) {
      console.error('Error restoring member:', e);
    }
  };

  const handleDeleteMember = async () => {
    if (!memberToDelete) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      const actor = {
        id: userProfile?.uid || adminUser?.id || 'super_admin',
        name: userProfile?.displayName || adminUser?.fullName || 'Super Administrator',
        email: userProfile?.email || adminUser?.email
      };
      const deletedName = memberToDelete.fullName;
      await deletePerson(memberToDelete.id, actor);
      setMemberToDelete(null);
      await loadData();
      notifyAction({
        type: 'delete',
        title: 'Church Member Permanently Purged',
        details: `Registry entry and voter credentials for "${deletedName}" were permanently deleted by Super Administrator.`,
        resourceName: deletedName,
        actorName: actor.name
      });
    } catch (err: any) {
      console.error('Error deleting church member:', err);
      let msg = err.message || 'Failed to delete church member.';
      try {
        const parsed = JSON.parse(msg);
        if (parsed?.error) msg = parsed.error;
      } catch {}
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenMemberships = (person: Person) => {
    setSelectedPersonForMemberships(person);
    setNewMembershipOrg(scopedOrgId || person.organisationId || organisations[0]?.id || '');
    setNewMembershipDept(scopedDeptId || '');
    setNewMembershipUnit('');
    setNewMembershipRole('');
    setNewMembershipStatus('active');
    setMembershipError('');
  };

  const handleAddMembership = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPersonForMemberships) return;
    const finalOrg = scopedOrgId || newMembershipOrg;
    const finalDept = scopedDeptId || newMembershipDept;

    if (!finalOrg) {
      setMembershipError('Please select an organisation for this membership.');
      return;
    }

    setMembershipSaving(true);
    setMembershipError('');
    try {
      const actor = {
        id: userProfile?.uid || 'admin',
        name: userProfile?.displayName || 'Church Administrator',
        email: userProfile?.email
      };

      await createMembership(
        {
          personId: selectedPersonForMemberships.id,
          organisationId: finalOrg,
          departmentId: finalDept || undefined,
          unitId: newMembershipUnit || undefined,
          roleTitle: newMembershipRole.trim(),
          status: newMembershipStatus
        },
        actor
      );

      // Refresh list & current person's memberships
      await loadData();
      const updatedPeople = await getPeople(
        (isOrgAdminRole || isDeptAdminRole) && scopedOrgId ? scopedOrgId : (orgFilter === 'all' ? undefined : orgFilter),
        isDeptAdminRole && scopedDeptId ? scopedDeptId : (deptFilter === 'all' ? undefined : deptFilter),
        unitFilter === 'all' ? undefined : unitFilter,
        showArchived
      );
      setPeople(updatedPeople);
      const refreshedPerson = updatedPeople.find((p) => p.id === selectedPersonForMemberships.id);
      if (refreshedPerson) {
        setSelectedPersonForMemberships(refreshedPerson);
      }
      setNewMembershipDept(scopedDeptId || '');
      setNewMembershipUnit('');
      setNewMembershipRole('');
    } catch (err: any) {
      console.error('Error adding membership:', err);
      let errMsg = err?.message || 'Failed to add membership.';
      try {
        const parsed = JSON.parse(errMsg);
        if (parsed?.error) errMsg = parsed.error;
      } catch {}
      setMembershipError(errMsg);
    } finally {
      setMembershipSaving(false);
    }
  };

  const handleToggleMembershipStatus = async (mId: string, currentStatus: 'active' | 'inactive') => {
    if (!selectedPersonForMemberships) return;
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const actor = {
        id: userProfile?.uid || 'admin',
        name: userProfile?.displayName || 'Church Administrator',
        email: userProfile?.email
      };
      await updateMembership(mId, { status: nextStatus }, actor);
      const updatedPeople = await getPeople(
        orgFilter === 'all' ? undefined : orgFilter,
        deptFilter === 'all' ? undefined : deptFilter,
        unitFilter === 'all' ? undefined : unitFilter,
        showArchived
      );
      setPeople(updatedPeople);
      const refreshedPerson = updatedPeople.find(p => p.id === selectedPersonForMemberships.id);
      if (refreshedPerson) {
        setSelectedPersonForMemberships(refreshedPerson);
      }
    } catch (err: any) {
      console.error('Error toggling membership status:', err);
      let errMsg = err?.message || 'Failed to update membership status.';
      try {
        const parsed = JSON.parse(errMsg);
        if (parsed?.error) errMsg = parsed.error;
      } catch {}
      setMembershipError(errMsg);
    }
  };

  const handleDeleteMembership = async (mId: string) => {
    if (!selectedPersonForMemberships) return;
    if (!isSuperAdmin) {
      setMembershipError('Unauthorized: Only the Super Administrator can permanently delete memberships.');
      return;
    }
    try {
      const actor = {
        id: userProfile?.uid || adminUser?.id || 'admin',
        name: userProfile?.displayName || adminUser?.fullName || 'Church Administrator',
        email: userProfile?.email || adminUser?.email,
        role: adminUser?.role || (isSuperAdmin ? 'super_admin' : 'admin')
      };
      await deleteMembership(mId, actor);
      const updatedPeople = await getPeople(
        orgFilter === 'all' ? undefined : orgFilter,
        deptFilter === 'all' ? undefined : deptFilter,
        unitFilter === 'all' ? undefined : unitFilter,
        showArchived
      );
      setPeople(updatedPeople);
      const refreshedPerson = updatedPeople.find(p => p.id === selectedPersonForMemberships.id);
      if (refreshedPerson) {
        setSelectedPersonForMemberships(refreshedPerson);
      }
    } catch (err: any) {
      console.error('Error deleting membership:', err);
      let errMsg = err?.message || 'Failed to delete membership.';
      try {
        const parsed = JSON.parse(errMsg);
        if (parsed?.error) errMsg = parsed.error;
      } catch {}
      setMembershipError(errMsg);
    }
  };

  const filteredPeople = people.filter((p) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.fullName.toLowerCase().includes(q) ||
        p.voterCode.toLowerCase().includes(q) ||
        (p.email && p.email.toLowerCase().includes(q)) ||
        (p.phone && p.phone.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const availableDepartments = departments.filter(
    (d) => !formData.organisationId || d.organisationId === formData.organisationId
  );

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-[#F8FAFC] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#FF8A00]" />
            Members & Eligible Voters Directory
          </h2>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Manage church membership roster, department affiliations, and unique voter codes for recognition polls.
          </p>
        </div>

        <button
          id="btn-add-member"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#FF8A00] to-[#E85B00] hover:from-[#E85B00] hover:to-[#FF8A00] text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md shadow-[#FF8A00]/20 shrink-0 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Church Member</span>
        </button>
      </div>

      {/* Scoped Role Isolation Notice */}
      {isOrgAdminRole && (
        <div className="p-3 bg-purple-950/40 border border-purple-500/40 rounded-2xl flex items-center justify-between text-xs text-purple-200">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-purple-400 shrink-0" />
            <span>
              <strong>Organisation Admin Scope:</strong> Confined strictly to membership records of <strong className="text-white">{adminUser?.organisationName || organisations[0]?.name || 'your organisation'}</strong>.
            </span>
          </div>
          <span className="text-[11px] bg-purple-900/60 text-purple-200 font-semibold px-2 py-0.5 rounded-full border border-purple-400/30 shrink-0">
            {filteredPeople.length} Members
          </span>
        </div>
      )}

      {isDeptAdminRole && (
        <div className="p-3 bg-blue-950/40 border border-blue-500/40 rounded-2xl flex items-center justify-between text-xs text-blue-200">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400 shrink-0" />
            <span>
              <strong>Department Admin Scope:</strong> Confined strictly to membership records of <strong className="text-white">{adminUser?.departmentName || departments[0]?.name || 'your department'}</strong>.
            </span>
          </div>
          <span className="text-[11px] bg-blue-900/60 text-blue-200 font-semibold px-2 py-0.5 rounded-full border border-blue-400/30 shrink-0">
            {filteredPeople.length} Members
          </span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-[#1E293B] rounded-2xl border border-slate-800 p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by member name, voter code, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#FF8A00] transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Organisation Selector / Locked Pill */}
          {isOrgAdminRole || isDeptAdminRole ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-2 bg-purple-950/40 border border-purple-500/40 rounded-xl text-xs text-purple-200 font-medium">
              <Building2 className="w-3.5 h-3.5 text-purple-400" />
              <span>{adminUser?.organisationName || organisations.find((o) => o.id === scopedOrgId)?.name || 'Assigned Org'}</span>
              <span className="text-[10px] bg-purple-900/60 text-purple-300 px-1.5 py-0.2 rounded border border-purple-500/30">Locked</span>
            </div>
          ) : (
            <select
              value={orgFilter}
              onChange={(e) => {
                setOrgFilter(e.target.value);
                setDeptFilter('all');
                setUnitFilter('all');
              }}
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

          {/* Department Selector / Locked Pill */}
          {isDeptAdminRole ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-950/40 border border-blue-500/40 rounded-xl text-xs text-blue-200 font-medium">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>{adminUser?.departmentName || departments.find((d) => d.id === scopedDeptId)?.name || 'Assigned Dept'}</span>
              <span className="text-[10px] bg-blue-900/60 text-blue-300 px-1.5 py-0.2 rounded border border-blue-500/30">Locked</span>
            </div>
          ) : (
            <select
              value={deptFilter}
              onChange={(e) => {
                setDeptFilter(e.target.value);
                setUnitFilter('all');
              }}
              className="px-3 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00] font-medium"
            >
              <option value="all">All Departments</option>
              {departments
                .filter((d) => orgFilter === 'all' || d.organisationId === orgFilter)
                .map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
            </select>
          )}

          <select
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            className="px-3 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00] font-medium"
          >
            <option value="all">All Units</option>
            {units
              .filter(
                (u) =>
                  (orgFilter === 'all' || u.organisationId === orgFilter) &&
                  (deptFilter === 'all' || u.departmentId === deptFilter)
              )
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
          </select>

          <label className="flex items-center gap-2 text-xs text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded bg-[#334155] border-slate-700 text-[#FF8A00] focus:ring-[#FF8A00] w-3.5 h-3.5"
            />
            <span>Archived</span>
          </label>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-[#1E293B] rounded-2xl border border-slate-800 py-16 text-center text-[#94A3B8] text-xs flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-5 h-5 text-[#FF8A00] animate-spin" />
          <span>Loading membership directory...</span>
        </div>
      ) : filteredPeople.length === 0 ? (
        <div className="bg-[#1E293B] rounded-2xl border border-dashed border-slate-700 p-12 text-center space-y-3">
          <Users className="w-10 h-10 text-[#94A3B8] mx-auto opacity-50" />
          <h3 className="text-sm font-bold text-[#F8FAFC]">No Church Members Found</h3>
          <p className="text-xs text-[#94A3B8] max-w-sm mx-auto">
            Add members and volunteers to your church database to generate verified voting codes.
          </p>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-gradient-to-r from-[#FF8A00] to-[#E85B00] text-slate-950 rounded-xl text-xs font-bold hover:from-[#E85B00] hover:to-[#FF8A00]"
          >
            + Add Church Member
          </button>
        </div>
      ) : (
        <div className="bg-[#1E293B] rounded-2xl border border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0F172A]/70 border-b border-slate-800 text-[#94A3B8] uppercase tracking-wider text-[11px] font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Member Name</th>
                  <th className="px-6 py-3.5">Voter Code</th>
                  <th className="px-6 py-3.5">Affiliation</th>
                  <th className="px-6 py-3.5">Contact Info</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredPeople.map((person) => {
                  const isArchived = person.status === 'archived';
                  const orgName = organisations.find(o => o.id === person.organisationId)?.name || person.organisationName || '—';
                  const deptName = departments.find(d => d.id === person.departmentId)?.name || person.departmentName;

                  return (
                    <tr key={person.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {person.photoUrl || person.avatarUrl ? (
                            <img
                              src={person.photoUrl || person.avatarUrl}
                              alt={person.fullName}
                              className="w-8 h-8 rounded-full object-cover border border-[#FF8A00]/40 shrink-0 shadow-xs"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[#251464] border border-[#FF8A00]/30 text-[#FF8A00] font-bold text-xs flex items-center justify-center shrink-0">
                              {person.fullName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-[#F8FAFC] text-sm">{person.fullName}</div>
                            <div className="text-[11px] text-[#94A3B8] flex items-center gap-1.5">
                              {person.roleTitle ? (
                                <span className="text-[#FF8A00] font-medium">{person.roleTitle}</span>
                              ) : (
                                <span>ID: {person.id.slice(0, 8)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-1.5 bg-[#334155] border border-slate-700 px-2.5 py-1 rounded-lg">
                          <KeyRound className="w-3.5 h-3.5 text-[#FF8A00]" />
                          <span className="font-mono font-bold text-[#F8FAFC] tracking-wider text-xs">
                            {person.voterCode}
                          </span>
                          <button
                            onClick={() => handleCopyCode(person.voterCode, person.id)}
                            title="Copy Voter Code"
                            className="p-0.5 text-[#94A3B8] hover:text-[#FF8A00] transition-colors cursor-pointer"
                          >
                            {copiedCodeId === person.id ? (
                              <Check className="w-3.5 h-3.5 text-[#FF8A00]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-[#F8FAFC] font-medium">
                            <Building2 className="w-3.5 h-3.5 text-[#94A3B8]" />
                            <span>{orgName}</span>
                          </div>
                          {deptName && (
                            <div className="flex items-center gap-1 text-emerald-400 text-[11px]">
                              <Layers className="w-3 h-3" />
                              <span>{deptName}</span>
                            </div>
                          )}
                          {person.unitName && (
                            <div className="flex items-center gap-1 text-[#FF8A00] text-[11px]">
                              <FolderTree className="w-3 h-3" />
                              <span>{person.unitName}</span>
                            </div>
                          )}
                          {person.memberships && person.memberships.length > 0 && (
                            <div className="pt-0.5">
                              <button
                                onClick={() => handleOpenMemberships(person)}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-medium text-[10px] transition-colors cursor-pointer"
                                title="Click to view all memberships"
                              >
                                <Network className="w-2.5 h-2.5" />
                                <span>
                                  {person.memberships.length} {person.memberships.length === 1 ? 'membership' : 'memberships'}
                                </span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-0.5 text-[#94A3B8]">
                          {person.email && (
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3 h-3" />
                              <span>{person.email}</span>
                            </div>
                          )}
                          {person.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3 h-3" />
                              <span>{person.phone}</span>
                            </div>
                          )}
                          {!person.email && !person.phone && <span>—</span>}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                            person.status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : person.status === 'inactive'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-700/50 text-[#94A3B8] border border-slate-600'
                          }`}
                        >
                          {person.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleViewMember(person)}
                            title="View Member Profile & Voter Details (Read)"
                            className="p-1.5 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleOpenMemberships(person)}
                            title="Manage Memberships (Organisation, Dept, Unit)"
                            className="p-1.5 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-colors cursor-pointer"
                          >
                            <Network className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleOpenEdit(person)}
                            title="Edit Member"
                            className="p-1.5 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#334155] rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {isArchived ? (
                            <button
                              onClick={() => handleRestore(person)}
                              title="Restore Member"
                              className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setConfirmArchiveId(person.id)}
                              title="Archive Member"
                              className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          )}

                          {isSuperAdmin && (
                            <button
                              id={`btn-delete-person-${person.id}`}
                              onClick={() => {
                                setDeleteError('');
                                setMemberToDelete(person);
                              }}
                              title="Permanently Delete Member (Super Admin Only)"
                              className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
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
                  <UserPlus className="w-5 h-5 text-[#FF8A00]" />
                  {editingPerson ? 'Edit Church Member' : 'Add New Church Member'}
                </h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Church members use their unique voter code to cast verified recognition votes.
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
                <label className="block font-semibold text-[#F8FAFC]">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deaconess Sarah Jenkins"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#FF8A00]"
                />
              </div>

              {/* Photo Link / Profile Picture URL with Live Preview */}
              <div className="space-y-1.5 p-3 bg-[#0F172A]/70 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-[#F8FAFC]">Member Photo URL / Avatar Link</label>
                  <span className="text-[10px] text-[#FF8A00] font-medium">Auto-feeds to voting nominees</span>
                </div>
                <div className="flex gap-2.5 items-center">
                  <div className="relative flex-1">
                    <ImageIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/... or direct image URL"
                      value={formData.photoUrl}
                      onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 bg-[#1E293B] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#FF8A00]"
                    />
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#1E293B] border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                    {formData.photoUrl ? (
                      <img
                        src={formData.photoUrl}
                        alt="Member Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-[#251464] text-[#FF8A00] font-bold text-xs flex items-center justify-center">
                        {formData.fullName ? formData.fullName.charAt(0).toUpperCase() : '?'}
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-[#94A3B8]">
                  Direct portrait link (e.g. Unsplash, Cloudinary, Imgur). When this member is nominated for any award or voting exercise, this photo feeds directly into their nominee profile.
                </p>
              </div>

              {/* Ministry Role / Title */}
              <div className="space-y-1">
                <label className="block font-semibold text-[#F8FAFC]">Ministry Role / Workforce Title</label>
                <input
                  type="text"
                  placeholder="e.g. Sanctuary Care Lead, Lead Vocalist, Usher, Sound Engineer"
                  value={formData.roleTitle}
                  onChange={(e) => setFormData({ ...formData, roleTitle: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#FF8A00]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-[#F8FAFC]">Organisation *</label>
                  {isOrgAdminRole || isDeptAdminRole ? (
                    <div className="w-full px-3 py-2 bg-[#1E293B] border border-purple-500/40 rounded-xl text-xs text-purple-200 font-medium flex items-center justify-between">
                      <span className="truncate">
                        {adminUser?.organisationName || organisations.find((o) => o.id === (scopedOrgId || formData.organisationId))?.name || 'Assigned Organisation'}
                      </span>
                      <span className="text-[10px] bg-purple-900/60 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30 shrink-0">
                        Locked
                      </span>
                    </div>
                  ) : (
                    <select
                      required
                      value={formData.organisationId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          organisationId: e.target.value,
                          departmentId: '',
                          unitId: ''
                        })
                      }
                      className="w-full px-3 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
                    >
                      <option value="">Select Organisation...</option>
                      {organisations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-[#F8FAFC]">Department</label>
                  {isDeptAdminRole ? (
                    <div className="w-full px-3 py-2 bg-[#1E293B] border border-blue-500/40 rounded-xl text-xs text-blue-200 font-medium flex items-center justify-between">
                      <span className="truncate">
                        {adminUser?.departmentName || departments.find((d) => d.id === (scopedDeptId || formData.departmentId))?.name || 'Assigned Department'}
                      </span>
                      <span className="text-[10px] bg-blue-900/60 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30 shrink-0">
                        Locked
                      </span>
                    </div>
                  ) : (
                    <select
                      value={formData.departmentId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          departmentId: e.target.value,
                          unitId: ''
                        })
                      }
                      className="w-full px-3 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
                    >
                      <option value="">All / None</option>
                      {availableDepartments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-[#F8FAFC]">Unit (Under Dept)</label>
                  <select
                    value={formData.unitId}
                    onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
                    className="w-full px-3 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
                  >
                    <option value="">None / General</option>
                    {units
                      .filter(
                        (u) =>
                          (!formData.departmentId || u.departmentId === formData.departmentId) &&
                          (!formData.organisationId || u.organisationId === formData.organisationId)
                      )
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-[#F8FAFC]">Voter Code *</label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, voterCode: generateVoterCode() })}
                    className="text-[11px] text-[#FF8A00] hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generate Random Code</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. VOTE-98231"
                  value={formData.voterCode}
                  onChange={(e) => setFormData({ ...formData, voterCode: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] font-mono placeholder:text-[#94A3B8] focus:outline-none focus:border-[#FF8A00]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-[#F8FAFC]">Email Address</label>
                  <input
                    type="email"
                    placeholder="sarah@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#FF8A00]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-[#F8FAFC]">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+1-555-0192"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#FF8A00]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-[#F8FAFC]">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as StatusType })}
                  className="w-full px-3.5 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
                >
                  <option value="active">Active (Can Vote)</option>
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
                  {saving ? 'Saving...' : editingPerson ? 'Update Member' : 'Add Member'}
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
              <h3 className="text-base font-bold text-[#F8FAFC]">Archive Member?</h3>
              <p className="text-xs text-[#94A3B8]">
                This member will not be able to cast votes while archived. Their voter code and records will be preserved.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setConfirmArchiveId(null)}
                className="px-4 py-2 bg-[#334155] hover:bg-[#475569] text-[#F8FAFC] rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleArchive(confirmArchiveId)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer"
              >
                Archive Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUPER ADMIN PERMANENT DELETE CONFIRMATION MODAL */}
      {memberToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#1E293B] border border-rose-500/40 rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-5 my-auto max-h-[calc(100dvh-2rem)] overflow-y-auto animate-scaleIn">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-inner">
              <Trash2 className="w-7 h-7" />
            </div>

            <div className="text-center space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-black uppercase tracking-wider">
                Super Admin Privilege
              </div>
              <h3 className="text-lg font-bold text-[#F8FAFC]">Permanently Delete Member?</h3>
              <p className="text-xs text-[#94A3B8]">
                This action will permanently purge this record from church databases and revoke their voter credentials.
              </p>
            </div>

            {/* Member Details Summary Box */}
            <div className="p-4 bg-[#0F172A] rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center text-[#94A3B8]">
                <span>Full Name:</span>
                <span className="font-bold text-[#F8FAFC]">{memberToDelete.fullName}</span>
              </div>
              <div className="flex justify-between items-center text-[#94A3B8]">
                <span>Voter Code:</span>
                <span className="font-mono font-bold text-[#FF8A00] bg-[#FF8A00]/10 px-2 py-0.5 rounded border border-[#FF8A00]/30">
                  {memberToDelete.voterCode}
                </span>
              </div>
              <div className="flex justify-between items-center text-[#94A3B8]">
                <span>Organisation:</span>
                <span className="text-[#F8FAFC]">{memberToDelete.organisationName || '—'}</span>
              </div>
              {(memberToDelete.departmentName || memberToDelete.unitName) && (
                <div className="flex justify-between items-center text-[#94A3B8]">
                  <span>Dept / Unit:</span>
                  <span className="text-[#F8FAFC]">
                    {[memberToDelete.departmentName, memberToDelete.unitName].filter(Boolean).join(' • ')}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center text-[#94A3B8]">
                <span>Associated Memberships:</span>
                <span className="text-indigo-300 font-semibold">
                  {memberToDelete.memberships?.length || 0} unit affiliations
                </span>
              </div>
            </div>

            {deleteError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="text-[11px] text-[#94A3B8] bg-rose-950/20 border border-rose-900/40 p-3 rounded-xl flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>
                Warning: This action cannot be undone. All linked departmental and unit memberships for this member will also be deleted immediately.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setMemberToDelete(null);
                  setDeleteError('');
                }}
                className="px-4 py-2 bg-[#334155] hover:bg-[#475569] text-[#F8FAFC] rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-delete-member"
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteMember}
                className="px-5 py-2 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-bold rounded-xl text-xs shadow-lg shadow-rose-900/30 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Deleting Member...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Yes, Delete Member Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MULTI-MEMBERSHIP MANAGEMENT MODAL */}
      {selectedPersonForMemberships && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#1E293B] border border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-6 my-auto max-h-[calc(100dvh-2rem)] overflow-y-auto animate-scaleIn">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold font-display text-[#F8FAFC] flex items-center gap-2">
                  <Network className="w-5 h-5 text-indigo-400" />
                  Manage Memberships
                </h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  <span className="text-[#F8FAFC] font-semibold">{selectedPersonForMemberships.fullName}</span>{' '}
                  ({selectedPersonForMemberships.voterCode}) can hold multiple unit and department affiliations.
                </p>
              </div>
              <button
                onClick={() => setSelectedPersonForMemberships(null)}
                className="text-[#94A3B8] hover:text-[#F8FAFC] text-xl font-bold p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            {membershipError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{membershipError}</span>
              </div>
            )}

            {/* Existing Memberships List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                  Active Affiliations ({selectedPersonForMemberships.memberships?.length || 0})
                </h4>
              </div>

              {!selectedPersonForMemberships.memberships || selectedPersonForMemberships.memberships.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-700 text-center text-xs text-[#94A3B8]">
                  No formal membership records found for this member yet. Add their first affiliation below.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedPersonForMemberships.memberships.map((m) => {
                    const orgName = organisations.find((o) => o.id === m.organisationId)?.name || m.organisationName || 'Organisation';
                    const deptName = departments.find((d) => d.id === m.departmentId)?.name || m.departmentName;
                    const unitName = units.find((u) => u.id === m.unitId)?.name || m.unitName;

                    return (
                      <div
                        key={m.id}
                        className="p-3.5 bg-[#0F172A] border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#F8FAFC]">
                              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                              {orgName}
                            </span>
                            {deptName && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                <Layers className="w-3 h-3" />
                                {deptName}
                              </span>
                            )}
                            {unitName && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#FF8A00] bg-[#FF8A00]/10 px-2 py-0.5 rounded-md border border-[#FF8A00]/20">
                                <FolderTree className="w-3 h-3" />
                                {unitName}
                              </span>
                            )}
                          </div>
                          {m.roleTitle && (
                            <div className="text-[11px] text-[#94A3B8]">
                              Role: <span className="text-[#F8FAFC]">{m.roleTitle}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleToggleMembershipStatus(m.id, m.status)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
                              m.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                                : 'bg-slate-800 text-[#94A3B8] border-slate-700 hover:bg-slate-700'
                            }`}
                          >
                            {m.status === 'active' ? (
                              <>
                                <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" />
                                Active
                              </>
                            ) : (
                              'Inactive'
                            )}
                          </button>

                          {isSuperAdmin && (
                            <button
                              onClick={() => handleDeleteMembership(m.id)}
                              title="Remove this membership (Super Admin Only)"
                              className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add New Membership Form */}
            <form onSubmit={handleAddMembership} className="p-4 bg-[#0F172A]/80 border border-slate-800 rounded-2xl space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Add Another Membership
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-[#F8FAFC]">Organisation *</label>
                  {isOrgAdminRole || isDeptAdminRole ? (
                    <div className="w-full px-3 py-2 bg-[#1E293B] border border-purple-500/40 rounded-xl text-xs text-purple-200 font-medium flex items-center justify-between">
                      <span className="truncate">
                        {adminUser?.organisationName || organisations.find((o) => o.id === (scopedOrgId || newMembershipOrg))?.name || 'Assigned Org'}
                      </span>
                      <span className="text-[10px] bg-purple-900/60 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30 shrink-0">
                        Locked
                      </span>
                    </div>
                  ) : (
                    <select
                      required
                      value={newMembershipOrg}
                      onChange={(e) => {
                        setNewMembershipOrg(e.target.value);
                        setNewMembershipDept('');
                        setNewMembershipUnit('');
                      }}
                      className="w-full px-3 py-2 bg-[#1E293B] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-indigo-400"
                    >
                      <option value="">Select Organisation...</option>
                      {organisations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-[#F8FAFC]">Department</label>
                  {isDeptAdminRole ? (
                    <div className="w-full px-3 py-2 bg-[#1E293B] border border-blue-500/40 rounded-xl text-xs text-blue-200 font-medium flex items-center justify-between">
                      <span className="truncate">
                        {adminUser?.departmentName || departments.find((d) => d.id === (scopedDeptId || newMembershipDept))?.name || 'Assigned Dept'}
                      </span>
                      <span className="text-[10px] bg-blue-900/60 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30 shrink-0">
                        Locked
                      </span>
                    </div>
                  ) : (
                    <select
                      value={newMembershipDept}
                      onChange={(e) => {
                        setNewMembershipDept(e.target.value);
                        setNewMembershipUnit('');
                      }}
                      className="w-full px-3 py-2 bg-[#1E293B] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-indigo-400"
                    >
                      <option value="">Select Department (Optional)...</option>
                      {departments
                        .filter((d) => !newMembershipOrg || d.organisationId === newMembershipOrg)
                        .map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                    </select>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-[#F8FAFC]">Unit</label>
                  <select
                    value={newMembershipUnit}
                    onChange={(e) => setNewMembershipUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-[#1E293B] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-indigo-400"
                  >
                    <option value="">Select Unit (Optional)...</option>
                    {units
                      .filter(
                        (u) =>
                          (!newMembershipOrg || u.organisationId === newMembershipOrg) &&
                          (!newMembershipDept || u.departmentId === newMembershipDept)
                      )
                      .map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-[#F8FAFC]">Role or Title (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Unit Leader, Protocol Officer, Chorister"
                    value={newMembershipRole}
                    onChange={(e) => setNewMembershipRole(e.target.value)}
                    className="w-full px-3 py-2 bg-[#1E293B] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-indigo-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-[#F8FAFC]">Status</label>
                  <select
                    value={newMembershipStatus}
                    onChange={(e) => setNewMembershipStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#1E293B] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-indigo-400"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={membershipSaving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {membershipSaving ? 'Adding Membership...' : '+ Add Membership'}
                </button>
              </div>
            </form>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedPersonForMemberships(null)}
                className="px-4 py-2 bg-[#334155] hover:bg-[#475569] text-[#F8FAFC] rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
