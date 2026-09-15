import React, { useState, useEffect } from 'react';
import { VotingExercise, ExerciseStatus } from '../../types';
import {
  getVotingExercises,
  deleteVotingExercise,
  getOrganisations,
  getPeople,
  getVotingResults
} from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useActionModal } from '../../context/ActionModalContext';
import { exportVotingResultsCSV, exportVotingResultsPDF } from '../../utils/exportResults';
import { downloadChartAsImage } from '../../utils/chartExport';
import { ExtendVotingModal } from '../../components/admin/ExtendVotingModal';
import { OrganisationsManager } from './OrganisationsManager';
import { DepartmentsManager } from './DepartmentsManager';
import { UnitsManager } from './UnitsManager';
import { PeopleManager } from './PeopleManager';
import { UserAccountsManager } from './UserAccountsManager';
import { VotingExerciseBuilder } from './VotingExerciseBuilder';
import { ExerciseDetailManage } from './ExerciseDetailManage';
import { AuditLogsViewer } from './AuditLogsViewer';
import { SystemSettings } from './SystemSettings';
import { VotingAnalyticsSection } from './VotingAnalyticsSection';
import { LegacyHallOfFameManager } from './LegacyHallOfFameManager';
import { AdminLogin } from './AdminLogin';
import {
  Vote,
  Building2,
  Layers,
  Users,
  ShieldAlert,
  ShieldCheck,
  Settings,
  Plus,
  Search,
  Clock,
  ChevronRight,
  TrendingUp,
  Award,
  Trophy,
  LogOut,
  ExternalLink,
  Download,
  ImageDown,
  FileSpreadsheet,
  FileText,
  Trash2,
  Sparkles,
  BarChart3,
  CheckCircle2,
  FolderTree,
  Info,
  HelpCircle,
  Lock,
  Shield
} from 'lucide-react';

interface AdminDashboardProps {
  onNavigateToVoterPortal: () => void;
  onNavigateToExerciseVote?: (exerciseId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigateToVoterPortal,
  onNavigateToExerciseVote
}) => {
  const { adminUser, isAdmin, isSuperAdmin, logoutAdmin, userProfile } = useAuth();
  const { notifyAction, confirmAction } = useActionModal();

  // Active Admin Section
  const [activeSection, setActiveSection] = useState<
    'exercises' | 'hall_of_fame' | 'analytics' | 'organisations' | 'departments' | 'units' | 'people' | 'users' | 'audit' | 'settings'
  >('exercises');

  // Sub-views for Exercises
  const [isCreatingExercise, setIsCreatingExercise] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);

  // Stats & Lists
  const [exercises, setExercises] = useState<VotingExercise[]>([]);
  const [orgCount, setOrgCount] = useState(0);
  const [peopleCount, setPeopleCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Export Results Modal state
  const [exportModalExercise, setExportModalExercise] = useState<VotingExercise | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  // Extend Voting Period Modal state
  const [extendModalExercise, setExtendModalExercise] = useState<VotingExercise | null>(null);

  // Exercise Filter
  const [statusFilter, setStatusFilter] = useState<'all' | ExerciseStatus>('all');
  const [orgFilter, setOrgFilter] = useState<string>('all');
  const [organisations, setOrganisations] = useState<{ id: string; name: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 6;

  // Role Scope Helper Flags
  const userRole = adminUser?.role || 'admin';
  const isSuperAdminRole = Boolean(isSuperAdmin || userRole === 'super_admin' || adminUser?.email === 'yinkopet@gmail.com');
  const isChurchAdminRole = Boolean(isSuperAdminRole || userRole === 'admin');
  const isOrgAdminRole = Boolean(userRole === 'organisation_admin');
  const isDeptAdminRole = Boolean(userRole === 'department_admin');

  // Role Guide Modal State
  const [showRoleGuideModal, setShowRoleGuideModal] = useState(false);

  const loadSummary = async () => {
    setLoading(true);
    try {
      let [exList, orgList, peepList] = await Promise.all([
        getVotingExercises({ includeArchived: true }),
        getOrganisations(false),
        getPeople(undefined, undefined, false)
      ]);

      // Role-based scope confinement
      if (isOrgAdminRole && adminUser?.organisationId) {
        exList = exList.filter(
          (ex) =>
            ex.organisationId === adminUser.organisationId ||
            (ex.organisationName && adminUser.organisationName && ex.organisationName.trim().toLowerCase() === adminUser.organisationName.trim().toLowerCase())
        );
        peepList = peepList.filter((p) => p.organisationId === adminUser.organisationId);
        orgList = orgList.filter((o) => o.id === adminUser.organisationId);
      } else if (isDeptAdminRole && adminUser?.departmentId) {
        exList = exList.filter(
          (ex) =>
            ex.departmentId === adminUser.departmentId ||
            (ex.departmentName && adminUser.departmentName && ex.departmentName.trim().toLowerCase() === adminUser.departmentName.trim().toLowerCase())
        );
        peepList = peepList.filter((p) => p.departmentId === adminUser.departmentId);
      }

      setExercises(exList);
      setOrganisations(orgList);
      setOrgCount(orgList.length);
      setPeopleCount(peepList.length);
    } catch (e) {
      console.error('Error loading admin summary:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadSummary();
    }
  }, [isAdmin]);

  const handleLogout = () => {
    confirmAction({
      type: 'logout',
      title: 'Confirm Administrative Sign Out',
      message: 'Are you sure you want to end your current administrative session? You will need to enter your username and password to log in again.',
      confirmLabel: 'Sign Out',
      onConfirm: async () => {
        const actorName = adminUser?.fullName || 'Super Admin';
        const actorRole = adminUser?.role || 'super_admin';
        await logoutAdmin();
        notifyAction({
          type: 'logout',
          title: 'Session Terminated',
          details: 'You have been successfully and securely signed out of the Admin CMS.',
          actorName,
          actorRole
        });
      }
    });
  };

  const handleExportCSV = async (exercise: VotingExercise) => {
    setExportLoading(true);
    try {
      const result = await getVotingResults(exercise.id);
      if (!result) {
        alert('Could not retrieve results for this exercise.');
        return;
      }
      exportVotingResultsCSV(exercise, result);
      notifyAction({
        type: 'read',
        title: 'Exported Voting Results (CSV)',
        details: `Generated and downloaded official CSV voting report for "${exercise.title}".`,
        resourceName: exercise.title,
        actorName: adminUser?.fullName || 'Super Admin',
        actorRole: adminUser?.role || 'super_admin'
      });
      setExportModalExercise(null);
    } catch (err: any) {
      alert('Error exporting CSV: ' + err.message);
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportPDF = async (exercise: VotingExercise) => {
    setExportLoading(true);
    try {
      const result = await getVotingResults(exercise.id);
      if (!result) {
        alert('Could not retrieve results for this exercise.');
        return;
      }
      await exportVotingResultsPDF(exercise, result);
      notifyAction({
        type: 'read',
        title: 'Exported Official Church Results Record (PDF)',
        details: `Generated and downloaded formatted PDF official voting document with visual charts for "${exercise.title}".`,
        resourceName: exercise.title,
        actorName: adminUser?.fullName || 'Super Admin',
        actorRole: adminUser?.role || 'super_admin'
      });
      setExportModalExercise(null);
    } catch (err: any) {
      alert('Error exporting PDF: ' + err.message);
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportCharts = async (exercise: VotingExercise) => {
    setExportLoading(true);
    try {
      const result = await getVotingResults(exercise.id);
      if (!result) {
        alert('Could not retrieve results for this exercise.');
        return;
      }
      const outcome = await downloadChartAsImage('both', exercise, result);
      if (outcome.success) {
        notifyAction({
          type: 'read',
          title: 'Exported Voting Charts (PNG Images)',
          details: `Downloaded high-resolution chart images for "${exercise.title}".`,
          resourceName: exercise.title,
          actorName: adminUser?.fullName || 'Super Admin',
          actorRole: adminUser?.role || 'super_admin'
        });
        setExportModalExercise(null);
      }
    } catch (err: any) {
      alert('Error exporting charts: ' + err.message);
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeleteExercise = (exercise: VotingExercise) => {
    if (!isSuperAdmin) {
      alert('Unauthorized: Only the Super Administrator can permanently delete a voting cycle.');
      return;
    }

    const isDuring = exercise.status === 'open' || (exercise.totalVotes || 0) > 0;
    const warningMsg = isDuring
      ? `CRITICAL WARNING: This voting cycle ("${exercise.title}") is currently ACTIVE or has live votes cast (${exercise.totalVotes || 0} votes recorded). Deleting it will immediately terminate voting, purge all active ballots, erase nominees, criteria, eligibility records, and delete all results across the database. This action CANNOT be undone. Are you absolutely sure you want to permanently delete this voting cycle?`
      : `WARNING: Deleting "${exercise.title}" will permanently remove this voting cycle, its evaluation criteria, nominees, voter eligibility lists, and all certified reports from the system. This action CANNOT be undone. Proceed with permanent deletion?`;

    confirmAction({
      type: 'delete',
      title: isDuring ? 'Delete Active Voting Cycle' : 'Permanently Delete Voting Cycle',
      message: warningMsg,
      confirmLabel: 'Permanently Delete Cycle',
      isDanger: true,
      onConfirm: async () => {
        try {
          const actor = {
            id: adminUser?.id || userProfile?.uid || 'superadmin',
            name: adminUser?.fullName || userProfile?.displayName || 'Super Admin',
            email: adminUser?.email || userProfile?.email || 'superadmin@trhministries.org',
            role: adminUser?.role || (isSuperAdmin ? 'super_admin' : 'admin')
          };
          await deleteVotingExercise(exercise.id, actor);
          notifyAction({
            type: 'delete',
            title: 'Voting Cycle Purged',
            details: `Voting cycle "${exercise.title}" and all related data were permanently deleted by the Super Administrator.`,
            resourceName: exercise.title,
            actorName: actor.name,
            actorRole: actor.role
          });
          loadSummary();
        } catch (err: any) {
          alert(err?.message || 'Failed to delete voting cycle.');
        }
      }
    });
  };

  const totalVotesAcrossExercises = exercises.reduce((sum, e) => sum + (e.totalVotes || 0), 0);
  const activeExercisesCount = exercises.filter((e) => e.status === 'open').length;

  const filteredExercises = exercises.filter((ex) => {
    if (statusFilter !== 'all' && ex.status !== statusFilter) return false;
    if (orgFilter !== 'all' && ex.organisationId !== orgFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        ex.title.toLowerCase().includes(q) ||
        ex.organisationName?.toLowerCase().includes(q) ||
        ex.departmentName?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filteredExercises.length / itemsPerPage) || 1;
  const paginatedExercises = filteredExercises.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const allNavTabs = [
    { id: 'exercises', label: 'Voting Exercises', icon: Vote, allowed: true },
    { id: 'hall_of_fame', label: 'Hall of Fame Archive', icon: Trophy, allowed: isChurchAdminRole },
    { id: 'analytics', label: 'Voting Analytics', icon: TrendingUp, allowed: isChurchAdminRole },
    { id: 'organisations', label: 'Organisations', icon: Building2, allowed: isChurchAdminRole },
    { id: 'departments', label: 'Departments', icon: Layers, allowed: isChurchAdminRole || isOrgAdminRole },
    { id: 'units', label: 'Units', icon: FolderTree, allowed: true },
    { id: 'people', label: 'Members & Voters', icon: Users, allowed: true },
    { id: 'users', label: 'User Accounts', icon: ShieldCheck, allowed: isSuperAdminRole },
    { id: 'audit', label: 'Audit Trail', icon: ShieldAlert, allowed: isSuperAdminRole },
    { id: 'settings', label: 'Church Settings', icon: Settings, allowed: isSuperAdminRole }
  ];

  const visibleTabs = allNavTabs.filter((tab) => tab.allowed);

  // Auto-redirect if an active tab is disallowed for current role
  useEffect(() => {
    if (!isAdmin) {
      setActiveSection('exercises');
      setIsCreatingExercise(false);
      setSelectedExerciseId(null);
      return;
    }
    const isCurrentTabAllowed = allNavTabs.find((t) => t.id === activeSection)?.allowed;
    if (isCurrentTabAllowed === false) {
      setActiveSection('exercises');
    }
  }, [isAdmin, activeSection, isSuperAdminRole, isChurchAdminRole, isOrgAdminRole, isDeptAdminRole]);

  // If user is not authenticated as an admin, show login form
  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-[#1E293B] border border-slate-800 rounded-2xl px-5 py-3 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
            <ShieldAlert className="w-4 h-4 text-[#FF8A00]" />
            <span>Admin CMS is protected. Please sign in with your administrative account.</span>
          </div>
          <button
            onClick={onNavigateToVoterPortal}
            className="text-xs font-bold text-[#FF8A00] hover:text-[#F8FAFC] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Return to Public Voter Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        <AdminLogin onLoginSuccess={() => loadSummary()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Admin User Profile Bar & Quick Links */}
      <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#251464] to-[#0F172A] border border-[#FF8A00]/40 text-[#FF8A00] font-bold text-sm flex items-center justify-center shrink-0 shadow-md">
            {adminUser?.fullName?.charAt(0) || 'A'}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-[#F8FAFC] text-sm">{adminUser?.fullName || 'Administrator'}</span>
              <span className="font-mono text-[11px] text-[#94A3B8]">(@{adminUser?.username || 'admin'})</span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                  isSuperAdminRole
                    ? 'bg-[#FF8A00]/20 text-[#FF8A00] border border-[#FF8A00]/30'
                    : isChurchAdminRole
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : isOrgAdminRole
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {isSuperAdminRole
                  ? 'Super Admin'
                  : isChurchAdminRole
                  ? 'Church Admin'
                  : isOrgAdminRole
                  ? 'Organisation Admin'
                  : isDeptAdminRole
                  ? 'Department Admin'
                  : adminUser?.role.replace('_', ' ') || 'Admin'}
              </span>
            </div>
            <p className="text-[11px] text-[#94A3B8] mt-0.5">
              {isSuperAdminRole && 'Global Church Authority • Full CMS Unrestricted Access'}
              {isChurchAdminRole && !isSuperAdminRole && 'Church-Wide Operations • Exercises, Orgs & Directory'}
              {isOrgAdminRole && `Scoped to Organisation: ${adminUser?.organisationName || 'Assigned Organisation'}`}
              {isDeptAdminRole && `Scoped to Department: ${adminUser?.departmentName || 'Assigned Department'}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
          <button
            onClick={() => setShowRoleGuideModal(true)}
            className="text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-xl transition-all border border-slate-700 flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Explain and review administrative role restrictions"
          >
            <Shield className="w-3.5 h-3.5 text-[#FF8A00]" />
            <span>Roles & Permissions Guide</span>
          </button>

          <button
            onClick={onNavigateToVoterPortal}
            className="text-xs font-bold text-[#FF8A00] hover:text-[#F8FAFC] bg-[#251464]/80 hover:bg-[#251464] px-3.5 py-2 rounded-xl transition-all border border-[#FF8A00]/40 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>Public Voter Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          <button
            id="btn-admin-logout"
            onClick={handleLogout}
            title="Sign out of Admin CMS"
            className="text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-2 rounded-xl transition-colors border border-red-500/20 flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Role Restriction Notice for Non-Super Admins */}
      {!isSuperAdminRole && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-slate-300">
            <Lock className="w-4 h-4 text-[#FF8A00] shrink-0" />
            <span>
              {isOrgAdminRole && (
                <>
                  <strong className="text-white">Organisation Admin Mode:</strong> Your administrative permissions are restricted to{' '}
                  <strong className="text-[#FF8A00]">{adminUser?.organisationName || 'your assigned organisation'}</strong>. Global user accounts, church settings, audit trail, and other organisations are protected.
                </>
              )}
              {isDeptAdminRole && (
                <>
                  <strong className="text-white">Department Admin Mode:</strong> Your permissions are restricted to{' '}
                  <strong className="text-emerald-400">{adminUser?.departmentName || 'your assigned department'}</strong>.
                </>
              )}
              {isChurchAdminRole && !isSuperAdminRole && (
                <>
                  <strong className="text-white">Church Admin Mode:</strong> You have broad church-wide operational access. User accounts management and core church security settings remain restricted to Super Administrators.
                </>
              )}
            </span>
          </div>
          <button
            onClick={() => setShowRoleGuideModal(true)}
            className="text-[11px] font-bold text-[#FF8A00] hover:underline shrink-0 cursor-pointer"
          >
            View Permissions Matrix →
          </button>
        </div>
      )}

      {/* Top Admin Navigation Tabs */}
      <div className="bg-[#1E293B] rounded-2xl border border-slate-800 p-2 shadow-xs flex items-center overflow-x-auto gap-2">
        <div className="flex items-center gap-1.5 min-w-max">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => {
                  setActiveSection(tab.id as any);
                  setIsCreatingExercise(false);
                  setSelectedExerciseId(null);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-[#FF8A00] to-[#E85B00] text-slate-950 shadow-md shadow-[#FF8A00]/25'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#334155]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 1: VOTING EXERCISES */}
      {activeSection === 'exercises' && (
        <>
          {isCreatingExercise ? (
            <VotingExerciseBuilder
              onSuccess={(newId) => {
                setIsCreatingExercise(false);
                setSelectedExerciseId(newId);
                loadSummary();
              }}
              onCancel={() => setIsCreatingExercise(false)}
            />
          ) : selectedExerciseId ? (
            <ExerciseDetailManage
              exerciseId={selectedExerciseId}
              onBack={() => {
                setSelectedExerciseId(null);
                loadSummary();
              }}
            />
          ) : (
            <div className="space-y-6">
              {/* Stat Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-[#1E293B] rounded-2xl border border-slate-800 p-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#94A3B8]">Active Exercises</span>
                    <div className="w-8 h-8 rounded-xl bg-[#251464] text-[#FF8A00] border border-[#FF8A00]/30 flex items-center justify-center">
                      <Vote className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold font-display text-[#F8FAFC] mt-2">
                    {activeExercisesCount}
                  </div>
                  <span className="text-[11px] text-[#94A3B8]">of {exercises.length} total</span>
                </div>

                <div className="bg-[#1E293B] rounded-2xl border border-slate-800 p-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#94A3B8]">Ballots Cast</span>
                    <div className="w-8 h-8 rounded-xl bg-[#251464] text-[#FF8A00] border border-[#FF8A00]/30 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold font-display text-[#F8FAFC] mt-2">
                    {totalVotesAcrossExercises}
                  </div>
                  <span className="text-[11px] text-[#94A3B8]">Total votes recorded</span>
                </div>

                <div className="bg-[#1E293B] rounded-2xl border border-slate-800 p-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#94A3B8]">Organisations</span>
                    <div className="w-8 h-8 rounded-xl bg-[#251464] text-[#FF8A00] border border-[#FF8A00]/30 flex items-center justify-center">
                      <Building2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold font-display text-[#F8FAFC] mt-2">
                    {orgCount}
                  </div>
                  <span className="text-[11px] text-[#94A3B8]">Active ministries</span>
                </div>

                <div className="bg-[#1E293B] rounded-2xl border border-slate-800 p-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#94A3B8]">Church Members</span>
                    <div className="w-8 h-8 rounded-xl bg-[#251464] text-[#FF8A00] border border-[#FF8A00]/30 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold font-display text-[#F8FAFC] mt-2">
                    {peopleCount}
                  </div>
                  <span className="text-[11px] text-[#94A3B8]">Registered voters</span>
                </div>
              </div>

              {/* Action & Filter Header */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold font-display text-[#F8FAFC]">
                    Church Voting Exercises
                  </h2>
                  <p className="text-xs text-[#94A3B8]">
                    Create, schedule, monitor, and manage election and award exercises.
                  </p>
                </div>

                <button
                  id="btn-launch-exercise"
                  onClick={() => setIsCreatingExercise(true)}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#FF8A00] to-[#E85B00] hover:from-[#E85B00] hover:to-[#FF8A00] text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md shadow-[#FF8A00]/25 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Launch New Exercise</span>
                </button>
              </div>

              {/* Search & Status Filters */}
              <div className="bg-[#1E293B] rounded-2xl border border-slate-800 p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-xs">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search exercises by title, organisation, or team..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#FF8A00] transition-colors"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <select
                    value={orgFilter}
                    onChange={(e) => {
                      setOrgFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-3 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] font-medium focus:outline-none focus:border-[#FF8A00]"
                  >
                    <option value="all">All Organisations</option>
                    {organisations.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    {(['all', 'open', 'scheduled', 'closed', 'draft'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => {
                          setStatusFilter(st);
                          setCurrentPage(1);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                          statusFilter === st
                            ? 'bg-gradient-to-r from-[#FF8A00] to-[#E85B00] text-slate-950 shadow-xs'
                            : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#334155]'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Exercises List */}
              {loading ? (
                <div className="py-12 text-center text-[#94A3B8] text-xs">
                  Loading voting exercises...
                </div>
              ) : filteredExercises.length === 0 ? (
                <div className="bg-[#1E293B] rounded-2xl border border-dashed border-slate-700 p-12 text-center space-y-3">
                  <Vote className="w-10 h-10 text-[#94A3B8] mx-auto opacity-50" />
                  <h3 className="text-sm font-bold text-[#F8FAFC]">No Voting Exercises Found</h3>
                  <p className="text-xs text-[#94A3B8] max-w-sm mx-auto">
                    Get started by using the 6-step creation wizard to launch your first church voting exercise.
                  </p>
                  <button
                    onClick={() => setIsCreatingExercise(true)}
                    className="px-4 py-2 bg-gradient-to-r from-[#FF8A00] to-[#E85B00] text-slate-950 rounded-xl text-xs font-bold hover:from-[#E85B00] hover:to-[#FF8A00] shadow-md shadow-[#FF8A00]/25 cursor-pointer"
                  >
                    Launch New Exercise
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {paginatedExercises.map((ex) => (
                      <div
                        key={ex.id}
                        className="bg-[#1E293B] rounded-2xl border border-slate-800 p-5 hover:border-[#FF8A00]/40 transition-all shadow-xs flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                ex.status === 'open'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : ex.status === 'scheduled'
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                  : ex.status === 'closed'
                                  ? 'bg-[#334155] text-[#94A3B8] border border-slate-700'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {ex.status}
                            </span>

                            <div className="text-xs font-bold text-[#F8FAFC] font-mono">
                              {ex.totalVotes || 0} votes cast
                            </div>
                          </div>

                          <div>
                            <h3
                              className="text-base font-bold font-display text-[#F8FAFC] hover:text-[#FF8A00] transition-colors cursor-pointer"
                              onClick={() => setSelectedExerciseId(ex.id)}
                            >
                              {ex.title}
                            </h3>
                            <p className="text-xs text-[#94A3B8] line-clamp-2 mt-0.5">
                              {ex.description || 'No description provided.'}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[11px]">
                            {ex.scopeType && (
                              <span className={`px-2 py-0.5 rounded-md font-semibold text-[10px] uppercase tracking-wider border ${
                                ex.scopeType === 'church'
                                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                  : ex.scopeType === 'workforce'
                                  ? 'bg-amber-500/20 text-[#FF8A00] border-amber-500/30'
                                  : ex.scopeType === 'department'
                                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                  : ex.scopeType === 'unit'
                                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                                  : ex.scopeType === 'custom'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : 'bg-slate-700 text-slate-300 border-slate-600'
                              }`}>
                                {ex.scopeType}
                              </span>
                            )}
                            <span className="flex items-center gap-1 bg-[#334155] text-[#F8FAFC] px-2 py-1 rounded-md border border-slate-700 font-medium">
                              <Building2 className="w-3 h-3 text-[#94A3B8]" />
                              {ex.organisationName || 'Church Wide'}
                            </span>
                            {ex.departmentName && (
                              <span className="flex items-center gap-1 bg-[#334155] text-[#F8FAFC] px-2 py-1 rounded-md border border-slate-700 font-medium">
                                <Layers className="w-3 h-3 text-[#FF8A00]" />
                                {ex.departmentName}
                              </span>
                            )}
                            {ex.unitName && (
                              <span className="flex items-center gap-1 bg-[#0e3b43] text-cyan-300 px-2 py-1 rounded-md border border-cyan-500/30 font-medium">
                                <FolderTree className="w-3 h-3 text-cyan-400" />
                                {ex.unitName}
                              </span>
                            )}
                            <span className="flex items-center gap-1 bg-[#251464] text-[#FF8A00] px-2 py-1 rounded-md border border-[#FF8A00]/30 font-medium">
                              <Award className="w-3 h-3 text-[#FF8A00]" />
                              {ex.categoryName || 'Award'}
                            </span>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1 text-[11px] text-[#94A3B8]">
                            <Clock className="w-3 h-3" />
                            <span>Ends: {new Date(ex.endTime).toLocaleDateString()}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Extend Voting Period Quick Button */}
                            <button
                              onClick={() => setExtendModalExercise(ex)}
                              title="Extend Voting Cycle Deadline"
                              className="px-2.5 py-1.5 bg-[#251464] hover:bg-[#251464]/80 text-[#FF8A00] rounded-xl text-xs font-semibold transition-colors border border-[#FF8A00]/30 flex items-center gap-1 cursor-pointer"
                            >
                              <Clock className="w-3.5 h-3.5 text-[#FF8A00]" />
                              <span className="hidden sm:inline">Extend</span>
                            </button>

                            {/* Export Official Results Button */}
                            <button
                              onClick={() => setExportModalExercise(ex)}
                              title="Export Official Results (CSV / PDF)"
                              className="px-2.5 py-1.5 bg-[#334155] hover:bg-[#475569] text-[#F8FAFC] rounded-xl text-xs font-semibold transition-colors border border-slate-700 flex items-center gap-1 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5 text-[#FF8A00]" />
                              <span className="hidden sm:inline">Export</span>
                            </button>

                            {ex.status === 'open' && onNavigateToExerciseVote && (
                              <button
                                onClick={() => onNavigateToExerciseVote(ex.id)}
                                className="px-3 py-1.5 bg-[#251464] text-[#FF8A00] hover:bg-[#251464]/80 rounded-xl text-xs font-bold transition-colors border border-[#FF8A00]/30 cursor-pointer"
                              >
                                Vote
                              </button>
                            )}
                            {/* Delete Cycle Button (Super Admin Only) */}
                            {isSuperAdmin && (
                              <button
                                onClick={() => handleDeleteExercise(ex)}
                                title="Permanently Delete Voting Cycle (Super Admin Only)"
                                className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 rounded-xl text-xs transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={() => setSelectedExerciseId(ex.id)}
                              className="px-3.5 py-1.5 bg-gradient-to-r from-[#FF8A00] to-[#E85B00] hover:from-[#E85B00] hover:to-[#FF8A00] text-slate-950 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                            >
                              <span>Manage</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between bg-[#1E293B] px-4 py-3 border border-slate-800 rounded-2xl text-xs">
                      <div className="text-[#94A3B8]">
                        Showing page <span className="font-bold text-[#F8FAFC]">{currentPage}</span> of{' '}
                        <span className="font-bold text-[#F8FAFC]">{totalPages}</span> ({filteredExercises.length} total)
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          className="px-3 py-1.5 bg-[#334155] text-[#F8FAFC] rounded-lg font-bold disabled:opacity-40 hover:bg-[#475569] transition-colors cursor-pointer"
                        >
                          Previous
                        </button>
                        <button
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          className="px-3 py-1.5 bg-[#334155] text-[#F8FAFC] rounded-lg font-bold disabled:opacity-40 hover:bg-[#475569] transition-colors cursor-pointer"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* SECTION 1.5: HALL OF FAME ARCHIVE (PREVIOUS WEB APP WINNERS) */}
      {activeSection === 'hall_of_fame' && (
        <LegacyHallOfFameManager onNavigateToPublicHallOfFame={onNavigateToVoterPortal} />
      )}

      {/* SECTION 2: VOTING ANALYTICS */}
      {activeSection === 'analytics' && <VotingAnalyticsSection />}

      {/* SECTION 3: ORGANISATIONS */}
      {activeSection === 'organisations' && <OrganisationsManager />}

      {/* SECTION 4: DEPARTMENTS */}
      {activeSection === 'departments' && <DepartmentsManager />}

      {/* SECTION 4.5: UNITS (UNDER DEPARTMENTS) */}
      {activeSection === 'units' && <UnitsManager />}

      {/* SECTION 5: PEOPLE / VOTERS */}
      {activeSection === 'people' && <PeopleManager />}

      {/* SECTION 6: USER ACCOUNTS & RBAC MANAGEMENT */}
      {activeSection === 'users' && <UserAccountsManager />}

      {/* SECTION 7: AUDIT LOGS */}
      {activeSection === 'audit' && <AuditLogsViewer />}

      {/* SECTION 8: SYSTEM SETTINGS */}
      {activeSection === 'settings' && <SystemSettings />}

      {/* EXPORT OFFICIAL RESULTS MODAL */}
      {exportModalExercise && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#1E293B] border border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-8 max-w-md w-full shadow-2xl space-y-6 my-auto max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-tr from-[#251464] to-[#0F172A] border border-[#FF8A00]/30 rounded-2xl text-[#FF8A00]">
                  <Download className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-display text-[#F8FAFC]">
                    Export Voting Results
                  </h3>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    Official Church Record Generation
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[#334155]/60 border border-slate-700/80 rounded-2xl p-4 space-y-2">
              <div className="text-xs font-semibold text-[#F8FAFC]">
                {exportModalExercise.title}
              </div>
              <div className="text-[11px] text-[#94A3B8] flex items-center justify-between">
                <span>Directorate / Org:</span>
                <span className="text-[#F8FAFC] font-medium">{exportModalExercise.organisationName}</span>
              </div>
              <div className="text-[11px] text-[#94A3B8] flex items-center justify-between">
                <span>Recorded Ballots:</span>
                <span className="text-[#FF8A00] font-bold">{exportModalExercise.totalVotes || 0} votes</span>
              </div>
            </div>

            <p className="text-xs text-[#94A3B8]">
              Select the desired output format for this recognition exercise report:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => handleExportCSV(exportModalExercise)}
                disabled={exportLoading}
                className="p-4 bg-[#334155] hover:bg-[#475569] border border-slate-700 hover:border-emerald-500/40 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer text-center group disabled:opacity-50"
              >
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold text-[#F8FAFC]">CSV Spreadsheet</div>
                <span className="text-[10px] text-[#94A3B8]">Raw voter tallies & data</span>
              </button>

              <button
                onClick={() => handleExportPDF(exportModalExercise)}
                disabled={exportLoading}
                className="p-4 bg-[#334155] hover:bg-[#475569] border border-slate-700 hover:border-[#FF8A00]/40 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer text-center group disabled:opacity-50"
              >
                <div className="p-2.5 rounded-xl bg-[#FF8A00]/10 text-[#FF8A00] group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold text-[#F8FAFC]">Official PDF Record</div>
                <span className="text-[10px] text-[#94A3B8]">With visual charts & seals</span>
              </button>

              <button
                onClick={() => handleExportCharts(exportModalExercise)}
                disabled={exportLoading}
                className="p-4 bg-[#334155] hover:bg-[#475569] border border-slate-700 hover:border-cyan-500/40 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer text-center group disabled:opacity-50"
              >
                <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
                  <ImageDown className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold text-[#F8FAFC]">Charts (PNG)</div>
                <span className="text-[10px] text-[#94A3B8]">High-res standalone images</span>
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setExportModalExercise(null)}
                disabled={exportLoading}
                className="px-4 py-2 bg-[#334155] hover:bg-[#475569] text-[#F8FAFC] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extend Voting Period Modal */}
      <ExtendVotingModal
        exercise={extendModalExercise}
        isOpen={!!extendModalExercise}
        onClose={() => setExtendModalExercise(null)}
        onSuccess={() => {
          setExtendModalExercise(null);
          loadSummary();
        }}
      />

      {/* Administrative Roles & Restrictions Guide Modal */}
      {showRoleGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="bg-[#1E293B] border border-slate-700/80 rounded-2xl sm:rounded-3xl p-5 sm:p-8 max-w-2xl w-full shadow-2xl space-y-6 my-auto max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-tr from-[#251464] to-[#0F172A] border border-[#FF8A00]/40 rounded-2xl text-[#FF8A00]">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#F8FAFC]">
                    Administrative Roles & Access Restrictions
                  </h3>
                  <p className="text-xs text-[#94A3B8]">
                    TRH Ministries Global RBAC (Role-Based Access Control) Policy
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRoleGuideModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-200 leading-relaxed">
              <span className="font-bold text-[#FF8A00]">Why were these restrictions instituted?</span>
              <p className="mt-1 text-slate-300">
                To safeguard church governance, non-super administrative roles are restricted so they cannot take over the platform. Organisation and Department Admins are scoped exclusively to their operational domain and cannot touch global settings, other organisations, or user accounts.
              </p>
            </div>

            {/* Role Cards Breakdown */}
            <div className="space-y-4 text-xs">
              {/* Super Admin */}
              <div className="p-4 bg-[#0F172A] border-l-4 border-[#FF8A00] border-y border-r border-slate-800 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#FF8A00] text-sm">1. Super Administrator</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#FF8A00]/20 text-[#FF8A00] text-[10px] font-bold uppercase">
                    Full Church Governance
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Holds absolute, unrestricted authority across the entire platform. Can create and manage user accounts, assign admin roles, edit Church Settings, inspect immutable Audit Trails, permanently delete cycles, and configure voting across all scopes.
                </p>
              </div>

              {/* Church Admin */}
              <div className="p-4 bg-[#0F172A] border-l-4 border-blue-500 border-y border-r border-slate-800 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-400 text-sm">2. Church Administrator</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold uppercase">
                    Church-Wide Operations
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Responsible for broad church-wide and workforce-wide operations. Can create and oversee exercises across all directorates, manage organisations, departments, units, and church member rosters.
                </p>
                <p className="text-slate-400 text-[11px]">
                  <strong className="text-rose-400">Strict Restrictions:</strong> Cannot manage user credentials/passwords, alter Church branding/settings, view security audit trails, or permanently delete voting exercises.
                </p>
              </div>

              {/* Organisation Admin */}
              <div className="p-4 bg-[#0F172A] border-l-4 border-purple-500 border-y border-r border-slate-800 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-400 text-sm">3. Organisation Administrator</span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold uppercase">
                    Single Organisation Scope
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Bound strictly to their assigned Organisation (Directorate). Can launch and manage voting exercises for their organisation, create departments and units under it, and manage their assigned personnel.
                </p>
                <p className="text-slate-400 text-[11px]">
                  <strong className="text-rose-400">Strict Restrictions:</strong> No access to Church-wide or other organisations' voting exercises, cannot edit top-level organisations list, cannot access user accounts, church settings, or audit logs.
                </p>
              </div>

              {/* Department Admin */}
              <div className="p-4 bg-[#0F172A] border-l-4 border-emerald-500 border-y border-r border-slate-800 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400 text-sm">4. Department Administrator</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase">
                    Single Department Scope
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Bound strictly to their assigned Department. Can manage voting exercises and units specifically for their department and view departmental personnel.
                </p>
                <p className="text-slate-400 text-[11px]">
                  <strong className="text-rose-400">Strict Restrictions:</strong> Cannot access higher-level organisation settings, other departments, user accounts, system configuration, or church-wide voting exercises.
                </p>
              </div>
            </div>

            {/* Quick Access Matrix */}
            <div className="border border-slate-800 rounded-2xl overflow-hidden text-xs">
              <div className="bg-slate-800/80 px-4 py-2 font-bold text-slate-200">
                Summary Permissions Matrix
              </div>
              <div className="divide-y divide-slate-800 bg-[#0F172A]/70 text-[11px]">
                <div className="grid grid-cols-5 p-2 text-slate-400 font-semibold">
                  <span>Feature</span>
                  <span className="text-center text-[#FF8A00]">Super</span>
                  <span className="text-center text-blue-400">Church</span>
                  <span className="text-center text-purple-400">Org</span>
                  <span className="text-center text-emerald-400">Dept</span>
                </div>
                <div className="grid grid-cols-5 p-2 text-slate-300">
                  <span>User Accounts & RBAC</span>
                  <span className="text-center text-emerald-400 font-bold">✓</span>
                  <span className="text-center text-rose-500">✗</span>
                  <span className="text-center text-rose-500">✗</span>
                  <span className="text-center text-rose-500">✗</span>
                </div>
                <div className="grid grid-cols-5 p-2 text-slate-300">
                  <span>Church Settings</span>
                  <span className="text-center text-emerald-400 font-bold">✓</span>
                  <span className="text-center text-rose-500">✗</span>
                  <span className="text-center text-rose-500">✗</span>
                  <span className="text-center text-rose-500">✗</span>
                </div>
                <div className="grid grid-cols-5 p-2 text-slate-300">
                  <span>Audit Logs</span>
                  <span className="text-center text-emerald-400 font-bold">✓</span>
                  <span className="text-center text-rose-500">✗</span>
                  <span className="text-center text-rose-500">✗</span>
                  <span className="text-center text-rose-500">✗</span>
                </div>
                <div className="grid grid-cols-5 p-2 text-slate-300">
                  <span>Organisations List</span>
                  <span className="text-center text-emerald-400 font-bold">✓</span>
                  <span className="text-center text-emerald-400 font-bold">✓</span>
                  <span className="text-center text-rose-500">✗</span>
                  <span className="text-center text-rose-500">✗</span>
                </div>
                <div className="grid grid-cols-5 p-2 text-slate-300">
                  <span>Departments Manager</span>
                  <span className="text-center text-emerald-400 font-bold">✓</span>
                  <span className="text-center text-emerald-400 font-bold">✓</span>
                  <span className="text-center text-emerald-400 font-bold">✓ (Own)</span>
                  <span className="text-center text-rose-500">✗</span>
                </div>
                <div className="grid grid-cols-5 p-2 text-slate-300">
                  <span>Church-Wide Voting</span>
                  <span className="text-center text-emerald-400 font-bold">✓</span>
                  <span className="text-center text-emerald-400 font-bold">✓</span>
                  <span className="text-center text-rose-500">✗</span>
                  <span className="text-center text-rose-500">✗</span>
                </div>
                <div className="grid grid-cols-5 p-2 text-slate-300">
                  <span>Scoped Voting</span>
                  <span className="text-center text-emerald-400 font-bold">✓</span>
                  <span className="text-center text-emerald-400 font-bold">✓</span>
                  <span className="text-center text-emerald-400 font-bold">✓ (Org)</span>
                  <span className="text-center text-emerald-400 font-bold">✓ (Dept)</span>
                </div>
                <div className="grid grid-cols-5 p-2 text-slate-300">
                  <span>Permanently Delete Cycle</span>
                  <span className="text-center text-emerald-400 font-bold">✓</span>
                  <span className="text-center text-rose-500">✗</span>
                  <span className="text-center text-rose-500">✗</span>
                  <span className="text-center text-rose-500">✗</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowRoleGuideModal(false)}
                className="px-5 py-2.5 bg-gradient-to-r from-[#FF8A00] to-[#E85B00] text-slate-950 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
