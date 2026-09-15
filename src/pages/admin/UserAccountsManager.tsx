import React, { useState, useEffect } from 'react';
import { UserAccount, UserRole, Organisation, Department, StatusType } from '../../types';
import {
  getUserAccounts,
  createUserAccount,
  updateUserAccount,
  deleteUserAccount,
  getOrganisations,
  getDepartments
} from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useActionModal } from '../../context/ActionModalContext';
import {
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  Search,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  Edit3,
  Trash2,
  Lock,
  Building2,
  Layers,
  AlertCircle,
  Sparkles,
  RefreshCw,
  UserCheck,
  Users
} from 'lucide-react';
import { OFFICIAL_USERNAMES } from '../../constants/officialUsers';

export const UserAccountsManager: React.FC = () => {
  const { adminUser, updateAdminSession, isSuperAdmin } = useAuth();
  const { notifyAction, confirmAction } = useActionModal();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [resettingPasswordUser, setResettingPasswordUser] = useState<UserAccount | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Dedicated Username Edit State
  const [editingUsernameUser, setEditingUsernameUser] = useState<UserAccount | null>(null);
  const [newUsernameInput, setNewUsernameInput] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    password: '',
    email: '',
    phone: '',
    role: 'admin' as UserRole,
    organisationId: '',
    departmentId: '',
    status: 'active' as StatusType
  });
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Password visibility map for table rows
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allUsers, allOrgs, allDepts] = await Promise.all([
        getUserAccounts(),
        getOrganisations(false),
        getDepartments(undefined, false)
      ]);
      setUsers(allUsers);
      setOrganisations(allOrgs);
      setDepartments(allDepts);
    } catch (e) {
      console.error('Error loading user accounts:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItemId(id);
    setTimeout(() => setCopiedItemId(null), 2000);
  };

  const togglePasswordReveal = (userId: string) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({
      fullName: '',
      username: '',
      password: generateRandomPassword(),
      email: '',
      phone: '',
      role: 'admin',
      organisationId: '',
      departmentId: '',
      status: 'active'
    });
    setFormError(null);
    setShowFormPassword(true);
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (user: UserAccount) => {
    setEditingUser(user);
    setFormData({
      fullName: user.fullName,
      username: user.username,
      password: user.password,
      email: user.email || '',
      phone: user.phone || '',
      role: user.role,
      organisationId: user.organisationId || '',
      departmentId: user.departmentId || '',
      status: user.status
    });
    setFormError(null);
    setShowFormPassword(false);
    setIsCreateModalOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      setFormError('Full name is required.');
      return;
    }
    if (!formData.username.trim()) {
      setFormError('Username (Login ID) is required.');
      return;
    }
    if (!formData.password.trim()) {
      setFormError('Password is required.');
      return;
    }
    if (formData.role === 'organisation_admin' && !formData.organisationId) {
      setFormError('Assigned Organisation is required for an Organisation Administrator.');
      return;
    }
    if (formData.role === 'department_admin' && !formData.departmentId) {
      setFormError('Assigned Department is required for a Department Administrator.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const actor = {
        id: adminUser?.id || 'superadmin',
        name: adminUser?.fullName || 'Super Administrator',
        email: adminUser?.email,
        role: adminUser?.role
      };

      const selectedOrg = organisations.find((o) => o.id === formData.organisationId);
      const selectedDept = departments.find((d) => d.id === formData.departmentId);

      const payload: Omit<UserAccount, 'id' | 'updatedAt' | 'createdAt'> = {
        fullName: formData.fullName.trim(),
        username: formData.username.trim(),
        password: formData.password.trim(),
        email: formData.email.trim() || '',
        phone: formData.phone.trim() || '',
        role: formData.role,
        status: formData.status,
        organisationId: formData.organisationId || undefined,
        organisationName: selectedOrg?.name,
        departmentId: formData.departmentId || undefined,
        departmentName: selectedDept?.name
      };

      if (editingUser) {
        await updateUserAccount(editingUser.id, payload, actor);
        triggerToast(`User account @${payload.username} updated globally across the app.`);
        notifyAction({
          type: 'update',
          title: 'User Account Updated',
          details: `User account @${payload.username} (${payload.fullName}) was updated with role "${payload.role.replace('_', ' ')}".`,
          resourceName: `@${payload.username}`,
          actorName: actor.name,
          data: {
            'Full Name': payload.fullName,
            'Username': `@${payload.username}`,
            'Role': payload.role,
            'Status': payload.status,
            'Organisation': payload.organisationName || 'Global Access'
          }
        });
        // If editing current logged in user, refresh context session
        if (adminUser?.id === editingUser.id) {
          updateAdminSession({ ...adminUser, ...payload });
        }
      } else {
        await createUserAccount(payload, actor);
        triggerToast(`New user account @${payload.username} created with role "${payload.role.replace('_', ' ')}".`);
        notifyAction({
          type: 'create',
          title: 'User Account Created',
          details: `New administrator @${payload.username} (${payload.fullName}) was created with access role "${payload.role.replace('_', ' ')}".`,
          resourceName: `@${payload.username}`,
          actorName: actor.name,
          data: {
            'Full Name': payload.fullName,
            'Username': `@${payload.username}`,
            'Role': payload.role,
            'Status': payload.status,
            'Organisation': payload.organisationName || 'Global Access'
          }
        });
      }

      setIsCreateModalOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Error saving user account.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEditUsername = (user: UserAccount) => {
    setEditingUsernameUser(user);
    setNewUsernameInput(user.username);
    setUsernameError(null);
  };

  const handleSaveUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUsernameUser) return;
    const cleanUsername = newUsernameInput.trim();
    if (!cleanUsername) {
      setUsernameError('Username cannot be empty.');
      return;
    }

    setSavingUsername(true);
    setUsernameError(null);
    try {
      const actor = {
        id: adminUser?.id || 'superadmin',
        name: adminUser?.fullName || 'Super Administrator',
        email: adminUser?.email,
        role: adminUser?.role
      };

      await updateUserAccount(editingUsernameUser.id, { username: cleanUsername }, actor);
      triggerToast(`Official username updated to "@${cleanUsername}" across the app.`);
      
      notifyAction({
        type: 'update',
        title: 'Username Updated Across App',
        details: `Official username for ${editingUsernameUser.fullName} changed from "@${editingUsernameUser.username}" to "@${cleanUsername}".`,
        resourceName: `@${cleanUsername}`,
        actorName: actor.name,
        data: {
          'Previous Username': `@${editingUsernameUser.username}`,
          'New Official Username': `@${cleanUsername}`,
          'Full Name': editingUsernameUser.fullName,
          'Role': editingUsernameUser.role
        }
      });

      if (adminUser?.id === editingUsernameUser.id) {
        updateAdminSession({ ...adminUser, username: cleanUsername });
      }

      setEditingUsernameUser(null);
      await loadData();
    } catch (err: any) {
      setUsernameError(err.message || 'Failed to update username. Please try again.');
    } finally {
      setSavingUsername(false);
    }
  };

  const handleViewUser = (u: UserAccount) => {
    notifyAction({
      type: 'read',
      title: 'User Account Profile (Read Access)',
      details: `Reviewing account permissions, role privileges, and credentials metadata for @${u.username}.`,
      resourceName: `@${u.username}`,
      data: {
        'Full Name': u.fullName,
        'Username': `@${u.username}`,
        'System Role': u.role,
        'Email Address': u.email || '—',
        'Phone Number': u.phone || '—',
        'Status': u.status,
        'Organisation': u.organisationName || 'Global System Access',
        'Department': u.departmentName || '—'
      }
    });
  };

  const handleOpenPasswordReset = (user: UserAccount) => {
    setResettingPasswordUser(user);
    setNewPasswordInput(generateRandomPassword());
  };

  const handleConfirmPasswordReset = async () => {
    if (!resettingPasswordUser || !newPasswordInput.trim()) return;
    setSaving(true);
    try {
      const actor = {
        id: adminUser?.id || 'superadmin',
        name: adminUser?.fullName || 'Super Administrator',
        email: adminUser?.email,
        role: adminUser?.role
      };

      await updateUserAccount(resettingPasswordUser.id, { password: newPasswordInput.trim() }, actor);
      triggerToast(`Password globally updated for @${resettingPasswordUser.username}.`);
      notifyAction({
        type: 'update',
        title: 'Security Credentials Updated',
        details: `Password has been reset for administrator @${resettingPasswordUser.username}.`,
        resourceName: `@${resettingPasswordUser.username}`,
        actorName: actor.name
      });
      setResettingPasswordUser(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error resetting password.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (adminUser?.id === id) {
      alert('You cannot delete your own active administrator account.');
      setDeletingUserId(null);
      return;
    }

    setSaving(true);
    try {
      const actor = {
        id: adminUser?.id || 'superadmin',
        name: adminUser?.fullName || 'Super Administrator',
        email: adminUser?.email,
        role: adminUser?.role || (isSuperAdmin ? 'super_admin' : 'admin')
      };

      const userToDelete = users.find((u) => u.id === id);
      await deleteUserAccount(id, actor);
      triggerToast('User account successfully removed globally.');
      notifyAction({
        type: 'delete',
        title: 'User Account Purged',
        details: `Account @${userToDelete?.username || id} (${userToDelete?.fullName || 'User'}) was permanently deleted from the database.`,
        resourceName: `@${userToDelete?.username || id}`,
        actorName: actor.name
      });
      setDeletingUserId(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error deleting user account.');
    } finally {
      setSaving(false);
    }
  };

  // Filtered list
  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (statusFilter !== 'all' && u.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (u.fullName || '').toLowerCase().includes(q);
      const matchUsername = (u.username || '').toLowerCase().includes(q);
      const matchEmail = (u.email || '').toLowerCase().includes(q);
      const matchRole = (u.role || '').toLowerCase().includes(q);
      const matchOrg = (u.organisationName || '').toLowerCase().includes(q);
      return matchName || matchUsername || matchEmail || matchRole || matchOrg;
    }
    return true;
  });

  const superAdminCount = users.filter((u) => u.role === 'super_admin').length;
  const orgAdminCount = users.filter((u) => u.role === 'organisation_admin').length;
  const deptAdminCount = users.filter((u) => u.role === 'department_admin').length;
  const churchAdminCount = users.filter((u) => u.role === 'admin').length;

  const userRole = adminUser?.role || 'admin';
  const isSuperAdminRole = Boolean(isSuperAdmin || userRole === 'super_admin' || adminUser?.email === 'yinkopet@gmail.com');

  if (!isSuperAdminRole) {
    return (
      <div className="bg-[#1E293B] border border-slate-800 rounded-3xl p-8 text-center max-w-xl mx-auto space-y-4 my-12 shadow-xl">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
          <Lock className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#F8FAFC]">Access Restricted: Super Administrator Only</h3>
          <p className="text-xs text-[#94A3B8] mt-1.5 leading-relaxed">
            User accounts management, password resets, and role permissions are strictly restricted to the Super Administrator to ensure platform integrity and church governance.
          </p>
          <div className="mt-4 p-3 bg-slate-900 border border-slate-800 rounded-xl text-[11px] text-slate-400">
            Current Account Role: <span className="text-[#FF8A00] font-bold uppercase">{userRole.replace('_', ' ')}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1E293B] border border-emerald-500/50 text-[#F8FAFC] px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs animate-slideUp">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Check className="w-3.5 h-3.5" />
          </div>
          <span>{successToast}</span>
        </div>
      )}

      {/* Senior Header & Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-[#F8FAFC] flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#FF8A00]" />
            User Access & RBAC Management
          </h2>
          <p className="text-xs text-[#94A3B8] mt-0.5 max-w-2xl">
            Super Admin control: Generate login credentials, update passwords globally, and manage staff access.
          </p>
        </div>

        <button
          id="btn-create-user-account"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#FF8A00] to-[#E85B00] hover:from-[#E85B00] hover:to-[#FF8A00] text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md shadow-[#FF8A00]/20 shrink-0 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Create User Account</span>
        </button>
      </div>

      {/* Role Boundaries Explanation Card */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 text-xs space-y-2">
        <div className="flex items-center gap-2 text-[#FF8A00] font-bold">
          <ShieldCheck className="w-4 h-4" />
          <span>Role-Based Access Control (RBAC) Governance Guidelines</span>
        </div>
        <p className="text-slate-300 leading-relaxed">
          Each administrative role has distinct, non-overlapping boundaries:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1 text-[11px]">
          <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl">
            <div className="font-bold text-[#FF8A00]">Super Admin</div>
            <div className="text-slate-400 mt-1">Full global control: User accounts, passwords, church branding, audit logs, and all voting cycles.</div>
          </div>
          <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl">
            <div className="font-bold text-blue-400">Church Admin</div>
            <div className="text-slate-400 mt-1">Church & workforce operations: All exercises, orgs, and rosters. Cannot access user accounts or church settings.</div>
          </div>
          <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl">
            <div className="font-bold text-purple-400">Organisation Admin</div>
            <div className="text-slate-400 mt-1">Scoped to 1 organisation: Can only manage exercises, departments, and units within that organisation.</div>
          </div>
          <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl">
            <div className="font-bold text-emerald-400">Department Admin</div>
            <div className="text-slate-400 mt-1">Scoped to 1 department: Can only manage exercises, units, and personnel inside their department.</div>
          </div>
        </div>
      </div>

      {/* Role Metrics Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-4 space-y-1 shadow-xs">
          <span className="text-[11px] text-[#94A3B8] font-medium flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#FF8A00]" /> Total Admin Accounts
          </span>
          <div className="text-2xl font-bold font-display text-[#F8FAFC]">{users.length}</div>
        </div>

        <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-4 space-y-1 shadow-xs">
          <span className="text-[11px] text-[#94A3B8] font-medium flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#FF8A00]" /> Super Admins
          </span>
          <div className="text-2xl font-bold font-display text-[#FF8A00]">{superAdminCount}</div>
        </div>

        <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-4 space-y-1 shadow-xs">
          <span className="text-[11px] text-[#94A3B8] font-medium flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-blue-400" /> Org & Church Admins
          </span>
          <div className="text-2xl font-bold font-display text-blue-400">{churchAdminCount + orgAdminCount}</div>
        </div>

        <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-4 space-y-1 shadow-xs">
          <span className="text-[11px] text-[#94A3B8] font-medium flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-400" /> Department Admins
          </span>
          <div className="text-2xl font-bold font-display text-emerald-400">{deptAdminCount}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#1E293B] rounded-2xl border border-slate-800 p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, username, email, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#FF8A00] transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00] font-medium"
          >
            <option value="all">All Roles ({users.length})</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Church Admin</option>
            <option value="organisation_admin">Organisation Admin</option>
            <option value="department_admin">Department Admin</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00] font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive</option>
          </select>

          <button
            onClick={loadData}
            title="Refresh Users"
            className="p-2 bg-[#334155] hover:bg-[#475569] text-[#94A3B8] hover:text-[#F8FAFC] rounded-xl border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#FF8A00]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Section: Registered System Users */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold font-display text-[#F8FAFC] flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#FF8A00]" />
            Registered System Users
          </h3>
          <span className="text-xs text-[#94A3B8] font-mono">
            Showing {filteredUsers.length} of {users.length} users
          </span>
        </div>

        {loading ? (
          <div className="bg-[#1E293B] rounded-2xl border border-slate-800 py-16 text-center text-[#94A3B8] text-xs flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 text-[#FF8A00] animate-spin" />
            <span>Loading registered administrator accounts...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-[#1E293B] rounded-2xl border border-dashed border-slate-700 p-12 text-center space-y-3">
            <ShieldAlert className="w-10 h-10 text-[#94A3B8] mx-auto opacity-50" />
            <h3 className="text-sm font-bold text-[#F8FAFC]">No Users Found</h3>
            <p className="text-xs text-[#94A3B8] max-w-sm mx-auto">
              Create an administrative user account to delegate organisation or department leadership.
            </p>
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-gradient-to-r from-[#FF8A00] to-[#E85B00] text-slate-950 rounded-xl text-xs font-bold hover:from-[#E85B00] hover:to-[#FF8A00]"
            >
              + Create User Account
            </button>
          </div>
        ) : (
          <div className="bg-[#1E293B] rounded-2xl border border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0F172A]/70 border-b border-slate-800 text-[#94A3B8] uppercase tracking-wider text-[11px] font-semibold">
                  <tr>
                    <th className="px-6 py-3.5">Full Name</th>
                    <th className="px-6 py-3.5">Official Username / Login ID</th>
                    <th className="px-6 py-3.5">Password</th>
                    <th className="px-6 py-3.5">Role</th>
                    <th className="px-6 py-3.5">Created</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-sans">
                  {filteredUsers.map((user) => {
                    const isRevealed = !!revealedPasswords[user.id];
                    const isCurrentUser = adminUser?.id === user.id;

                    return (
                      <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                        {/* 1. Full Name */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#251464] border border-[#FF8A00]/30 text-[#FF8A00] font-bold text-xs flex items-center justify-center shrink-0">
                              {user.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-[#F8FAFC] text-sm flex items-center gap-1.5">
                                <span>{user.fullName}</span>
                                {isCurrentUser && (
                                  <span className="text-[10px] bg-[#FF8A00]/20 text-[#FF8A00] border border-[#FF8A00]/40 px-1.5 py-0.2 rounded font-semibold">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[#94A3B8] flex items-center gap-1.5 mt-0.5">
                                {user.email && <span>{user.email}</span>}
                                {user.organisationName && (
                                  <span className="text-[#94A3B8] font-medium">
                                    • {user.organisationName}
                                  </span>
                                )}
                                {user.departmentName && (
                                  <span className="text-emerald-400">
                                    ({user.departmentName})
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Username (Login ID) */}
                        <td className="px-6 py-4">
                          <div className="inline-flex items-center gap-1.5 bg-[#334155] border border-slate-700 px-2.5 py-1 rounded-lg group">
                            <span className="font-mono font-bold text-[#F8FAFC] text-xs tracking-wide">
                              @{user.username}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyText(user.username, `user-${user.id}`)}
                              title="Copy Login ID"
                              className="p-0.5 text-[#94A3B8] hover:text-[#FF8A00] transition-colors cursor-pointer"
                            >
                              {copiedItemId === `user-${user.id}` ? (
                                <Check className="w-3.5 h-3.5 text-[#FF8A00]" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditUsername(user)}
                              title="Edit Official Username across App"
                              className="p-0.5 text-[#94A3B8] hover:text-[#FF8A00] transition-colors cursor-pointer ml-0.5"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* 3. Password */}
                        <td className="px-6 py-4">
                          <div className="inline-flex items-center gap-2 bg-[#334155]/60 border border-slate-700/80 px-2.5 py-1 rounded-lg">
                            <Lock className="w-3.5 h-3.5 text-[#94A3B8]" />
                            <span className="font-mono text-xs text-[#F8FAFC]">
                              {isRevealed ? user.password : '••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePasswordReveal(user.id)}
                              title={isRevealed ? 'Hide Password' : 'Show Password'}
                              className="p-0.5 text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
                            >
                              {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyText(user.password, `pass-${user.id}`)}
                              title="Copy Password"
                              className="p-0.5 text-[#94A3B8] hover:text-[#FF8A00] transition-colors cursor-pointer"
                            >
                              {copiedItemId === `pass-${user.id}` ? (
                                <Check className="w-3.5 h-3.5 text-[#FF8A00]" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* 4. Role */}
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                              user.role === 'super_admin'
                                ? 'bg-[#FF8A00]/20 text-[#FF8A00] border border-[#FF8A00]/30'
                                : user.role === 'admin'
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                : user.role === 'organisation_admin'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : user.role === 'department_admin'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-slate-700/50 text-[#94A3B8] border border-slate-600'
                            }`}
                          >
                            {user.role.replace('_', ' ')}
                          </span>
                        </td>

                        {/* 5. Created */}
                        <td className="px-6 py-4 text-[#94A3B8] text-[11px] whitespace-nowrap font-mono">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Recent'}
                        </td>

                        {/* 6. Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleViewUser(user)}
                              title="View Account Profile (Read Access)"
                              className="p-1.5 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 rounded-lg transition-colors cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditUsername(user)}
                              title="Edit Official Username across App"
                              className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenPasswordReset(user)}
                              title="Reset Password"
                              className="p-1.5 text-[#94A3B8] hover:text-[#FF8A00] hover:bg-[#334155] rounded-lg transition-colors cursor-pointer"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEdit(user)}
                              title="Edit User"
                              className="p-1.5 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#334155] rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            {isSuperAdmin && !isCurrentUser && (
                              <button
                                type="button"
                                onClick={() => setDeletingUserId(user.id)}
                                title="Delete Account (Super Admin Only)"
                                className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
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
      </div>

      {/* MODAL 1: Create / Edit User Account */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm p-3 sm:p-4 flex items-center justify-center">
          <div className="bg-[#1E293B] border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl max-w-lg w-full my-auto max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden animate-scaleIn">
            <div className="p-4 sm:p-6 flex items-start justify-between border-b border-slate-800 shrink-0">
              <div>
                <h3 className="text-base sm:text-lg font-bold font-display text-[#F8FAFC] flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-[#FF8A00]" />
                  {editingUser ? 'Update Administrator Account' : 'Create New User Account'}
                </h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Credentials and roles configured here are globally synchronized across the app.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#F8FAFC] text-xl font-bold p-1 rounded-lg hover:bg-[#334155]"
                title="Close"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto overscroll-contain flex-1">
                {formError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}
              {/* Full Name */}
              <div className="space-y-1">
                <label className="block font-semibold text-[#F8FAFC]">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pastor David Vance"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#FF8A00]"
                />
              </div>

              {/* Username (Login ID) */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-[#F8FAFC]">Official Username / Login ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior & Founding Pastor, or custom username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#FF8A00]"
                />
                <div className="space-y-1 bg-[#0F172A] p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-[#94A3B8] block font-medium">
                    Quick-Select Official Username:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {OFFICIAL_USERNAMES.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setFormData({ ...formData, username: name })}
                        className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                          formData.username === name
                            ? 'bg-[#251464] border-[#FF8A00] text-[#FF8A00] font-semibold'
                            : 'bg-[#1E293B] border-slate-700 text-[#94A3B8] hover:text-[#F8FAFC]'
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
                <span className="text-[10px] text-[#94A3B8] block">
                  Used for logging in to the Admin CMS and identification across voting records and audits.
                </span>
              </div>

              {/* Password with Generator */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-[#F8FAFC]">Password *</label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, password: generateRandomPassword() })}
                    className="text-[11px] text-[#FF8A00] hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generate Strong Password</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showFormPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3.5 py-2 pr-10 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] font-mono focus:outline-none focus:border-[#FF8A00]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFormPassword(!showFormPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#F8FAFC]"
                  >
                    {showFormPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-1">
                <label className="block font-semibold text-[#F8FAFC]">Administrative Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-3.5 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00] font-medium"
                >
                  <option value="super_admin">Super Admin (Full Global Control & User Access)</option>
                  <option value="admin">Church Admin (Manage Exercises & Settings)</option>
                  <option value="organisation_admin">Organisation Admin (Specific Church Organisation)</option>
                  <option value="department_admin">Department Admin (Specific Team / Ministry)</option>
                </select>
              </div>

              {/* Conditional Organisation Selector */}
              {(formData.role === 'organisation_admin' || formData.role === 'department_admin') && (
                <div className="space-y-1">
                  <label className="block font-semibold text-[#F8FAFC]">Assigned Organisation</label>
                  <select
                    value={formData.organisationId}
                    onChange={(e) => setFormData({ ...formData, organisationId: e.target.value, departmentId: '' })}
                    className="w-full px-3.5 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
                  >
                    <option value="">Select Organisation...</option>
                    {organisations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Conditional Department Selector */}
              {formData.role === 'department_admin' && (
                <div className="space-y-1">
                  <label className="block font-semibold text-[#F8FAFC]">Assigned Department</label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
                  >
                    <option value="">Select Department...</option>
                    {departments
                      .filter((d) => !formData.organisationId || d.organisationId === formData.organisationId)
                      .map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-[#F8FAFC]">Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="user@trhworkforce.org"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-semibold text-[#F8FAFC]">Phone (Optional)</label>
                  <input
                    type="tel"
                    placeholder="+1-555-0199"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="block font-semibold text-[#F8FAFC]">Account Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as StatusType })}
                  className="w-full px-3.5 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
                >
                  <option value="active">Active (Can log in)</option>
                  <option value="inactive">Inactive (Access suspended)</option>
                </select>
              </div>

              </div>

              {/* Actions - Pinned to footer */}
              <div className="p-4 sm:p-6 border-t border-slate-800 shrink-0 flex items-center justify-end gap-3 bg-[#1E293B]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 bg-[#334155] hover:bg-[#475569] text-[#F8FAFC] rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#FF8A00] to-[#E85B00] hover:from-[#E85B00] hover:to-[#FF8A00] text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-[#FF8A00]/20 disabled:opacity-50 cursor-pointer transition-all"
                >
                  {saving ? 'Saving...' : editingUser ? 'Update User Account' : 'Create User Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Reset Password Modal */}
      {resettingPasswordUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#1E293B] border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-5 my-auto animate-scaleIn">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold font-display text-[#F8FAFC] flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-[#FF8A00]" />
                  Reset User Password
                </h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Update login password for <span className="text-[#F8FAFC] font-semibold">{resettingPasswordUser.fullName}</span> (@{resettingPasswordUser.username})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResettingPasswordUser(null)}
                className="text-[#94A3B8] hover:text-[#F8FAFC] text-xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-[#F8FAFC]">New Global Password</label>
                  <button
                    type="button"
                    onClick={() => setNewPasswordInput(generateRandomPassword())}
                    className="text-[11px] text-[#FF8A00] hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generate New</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] font-mono focus:outline-none focus:border-[#FF8A00]"
                />
              </div>

              <div className="p-3 bg-[#0F172A] border border-slate-800 rounded-xl text-[11px] text-[#94A3B8]">
                Once updated, the user will be able to log in immediately with this new password.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setResettingPasswordUser(null)}
                  className="px-4 py-2 bg-[#334155] hover:bg-[#475569] text-[#F8FAFC] rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving || !newPasswordInput.trim()}
                  onClick={handleConfirmPasswordReset}
                  className="px-5 py-2 bg-gradient-to-r from-[#FF8A00] to-[#E85B00] hover:from-[#E85B00] hover:to-[#FF8A00] text-slate-950 font-bold rounded-xl text-xs shadow-md disabled:opacity-50"
                >
                  {saving ? 'Updating...' : 'Save Password Globally'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Delete Confirmation */}
      {deletingUserId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#1E293B] border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-4 my-auto animate-scaleIn">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-[#F8FAFC]">Confirm Account Deletion</h3>
              <p className="text-xs text-[#94A3B8]">
                Are you sure you want to permanently delete this user account? Their administrative access will be revoked immediately across the app.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUserId(null)}
                className="px-4 py-2 bg-[#334155] hover:bg-[#475569] text-[#F8FAFC] rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleDeleteUser(deletingUserId)}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs shadow-md disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Dedicated Edit Official Username Modal */}
      {editingUsernameUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#1E293B] border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-5 my-auto max-h-[calc(100dvh-2rem)] overflow-y-auto animate-scaleIn">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold font-display text-[#F8FAFC] flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-[#FF8A00]" />
                  Edit Official Username Across App
                </h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Update login username across the app for <span className="text-[#F8FAFC] font-semibold">{editingUsernameUser.fullName}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUsernameUser(null)}
                className="text-[#94A3B8] hover:text-[#F8FAFC] text-xl font-bold p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            {usernameError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{usernameError}</span>
              </div>
            )}

            <form onSubmit={handleSaveUsername} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block font-semibold text-[#F8FAFC]">
                  Official Username / Login ID *
                </label>
                <input
                  type="text"
                  required
                  value={newUsernameInput}
                  onChange={(e) => setNewUsernameInput(e.target.value)}
                  placeholder="Enter official username title or custom ID"
                  className="w-full px-3.5 py-2.5 bg-[#334155] border border-slate-700 rounded-xl text-xs sm:text-sm text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
                />
              </div>

              {/* Quick Official Title Suggestions */}
              <div className="space-y-2 bg-[#0F172A] border border-slate-800 p-3.5 rounded-xl">
                <div className="text-[11px] font-semibold text-[#94A3B8] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#FF8A00]" />
                  <span>Choose from Official Usernames:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {OFFICIAL_USERNAMES.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setNewUsernameInput(name)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer text-left ${
                        newUsernameInput === name
                          ? 'bg-[#251464] border-[#FF8A00] text-[#FF8A00] font-bold shadow-xs'
                          : 'bg-[#1E293B] border-slate-700 hover:border-[#FF8A00]/50 text-[#94A3B8] hover:text-[#F8FAFC]'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[11px] text-blue-300 space-y-1">
                <p className="font-semibold text-blue-200">Instant Global Propagation:</p>
                <p>
                  Changing this username updates the user's login ID across the app, login dropdowns, audit trails, and role assignments immediately.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUsernameUser(null)}
                  className="px-4 py-2 bg-[#334155] hover:bg-[#475569] text-[#F8FAFC] rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingUsername || !newUsernameInput.trim()}
                  className="px-5 py-2 bg-gradient-to-r from-[#FF8A00] to-[#E85B00] hover:from-[#E85B00] hover:to-[#FF8A00] text-slate-950 font-bold rounded-xl text-xs shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {savingUsername ? 'Updating across app...' : 'Save Username Globally'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
