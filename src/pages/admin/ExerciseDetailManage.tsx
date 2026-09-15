import React, { useState, useEffect } from 'react';
import {
  VotingExercise,
  Criterion,
  Nominee,
  Eligibility,
  Person,
  VotingResult,
  ExerciseStatus
} from '../../types';
import {
  getVotingExerciseById,
  updateVotingExercise,
  deleteVotingExercise,
  setVotingExerciseStatus,
  toggleResultsPublished,
  getCriteria,
  addCriterion,
  updateCriterion,
  deleteCriterion,
  reorderCriteria,
  getNominees,
  addNominee,
  updateNominee,
  deleteNominee,
  reorderNominees,
  getEligibleVotersForExercise,
  assignEligibilityBatch,
  removeEligibility,
  getPeople,
  getVotingResults
} from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useActionModal } from '../../context/ActionModalContext';
import { exportVotingResultsCSV, exportVotingResultsPDF } from '../../utils/exportResults';
import { downloadChartAsImage, captureDOMChartImage } from '../../utils/chartExport';
import { ExtendVotingModal } from '../../components/admin/ExtendVotingModal';
import {
  Award,
  CheckCircle2,
  Users,
  BarChart3,
  Settings,
  Plus,
  Trash2,
  Edit2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ArrowLeft,
  Crown,
  AlertCircle,
  Clock,
  Layers,
  Building2,
  FolderTree,
  Check,
  X,
  ArrowUp,
  ArrowDown,
  ShieldAlert,
  ShieldCheck,
  Download,
  ImageDown,
  Loader2,
  FileSpreadsheet,
  FileText,
  Calendar,
  Sparkles,
  PieChart as PieChartIcon
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';

interface ExerciseDetailManageProps {
  exerciseId: string;
  onBack: () => void;
}

const PALETTE = ['#FF8A00', '#251464', '#10B981', '#38BDF8', '#818CF8', '#F59E0B', '#EC4899', '#A855F7'];

export const ExerciseDetailManage: React.FC<ExerciseDetailManageProps> = ({
  exerciseId,
  onBack
}) => {
  const { userProfile, adminUser, isSuperAdmin } = useAuth();
  const { notifyAction, confirmAction } = useActionModal();

  const [activeTab, setActiveTab] = useState<'overview' | 'criteria' | 'nominees' | 'eligibility' | 'results'>('overview');

  const [exercise, setExercise] = useState<VotingExercise | null>(null);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [nominees, setNominees] = useState<Nominee[]>([]);
  const [eligibilityList, setEligibilityList] = useState<Eligibility[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [results, setResults] = useState<VotingResult | null>(null);
  const [loading, setLoading] = useState(true);

  // Criteria Modals
  const [isAddCritOpen, setIsAddCritOpen] = useState(false);
  const [editingCrit, setEditingCrit] = useState<Criterion | null>(null);
  const [critTitle, setCritTitle] = useState('');
  const [critDesc, setCritDesc] = useState('');

  // Exercise Edit Modal
  const [isEditExOpen, setIsEditExOpen] = useState(false);
  const [exEditTitle, setExEditTitle] = useState('');
  const [exEditDesc, setExEditDesc] = useState('');
  const [exEditStart, setExEditStart] = useState('');
  const [exEditEnd, setExEditEnd] = useState('');
  const [exEditSelfVote, setExEditSelfVote] = useState(false);

  // Nominee Modals
  const [isAddNomOpen, setIsAddNomOpen] = useState(false);
  const [editingNom, setEditingNom] = useState<Nominee | null>(null);
  const [nomDisplayName, setNomDisplayName] = useState('');
  const [nomRole, setNomRole] = useState('');
  const [nomPhoto, setNomPhoto] = useState('');
  const [nomBio, setNomBio] = useState('');
  const [nomPersonId, setNomPersonId] = useState('');

  // Eligibility Assign Modal
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assignMode, setAssignMode] = useState<'all' | 'dept' | 'unit' | 'person'>('all');
  const [selectedPersonForElig, setSelectedPersonForElig] = useState('');

  // Chart and PDF Export State
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isDownloadingChart, setIsDownloadingChart] = useState<'bar' | 'pie' | 'all' | null>(null);
  const [chartSuccessMsg, setChartSuccessMsg] = useState<string | null>(null);

  // Extend Voting Cycle Modal
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);

  const actor = {
    id: adminUser?.id || userProfile?.uid || 'superadmin',
    name: adminUser?.fullName || userProfile?.displayName || 'Super Admin',
    email: adminUser?.email || userProfile?.email || 'superadmin@trhministries.org',
    role: adminUser?.role || (isSuperAdmin ? 'super_admin' : 'admin')
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [ex, crits, noms, eligs, peeps, res] = await Promise.all([
        getVotingExerciseById(exerciseId),
        getCriteria(exerciseId, false),
        getNominees(exerciseId, false),
        getEligibleVotersForExercise(exerciseId),
        getPeople(false),
        getVotingResults(exerciseId)
      ]);

      setExercise(ex);
      setCriteria(crits);
      setNominees(noms);
      setEligibilityList(eligs);
      setPeople(peeps);
      setResults(res);
    } catch (e) {
      console.error('Error loading exercise details:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [exerciseId]);

  // Export Handlers
  const handleExportCSV = () => {
    if (!exercise || !results) return;
    exportVotingResultsCSV(exercise, results);
    notifyAction({
      type: 'read',
      title: 'Exported Voting Results (CSV)',
      details: `Generated CSV vote tallies spreadsheet for "${exercise.title}".`,
      resourceName: exercise.title,
      actorName: actor.name,
      actorRole: actor.role
    });
  };

  const handleExportPDF = async () => {
    if (!exercise || !results) return;
    setIsExportingPDF(true);
    try {
      // Capture live DOM charts if rendered on screen (Results tab)
      const barImg = await captureDOMChartImage('results-bar-chart-card');
      const pieImg = await captureDOMChartImage('results-pie-chart-card');

      await exportVotingResultsPDF(
        exercise,
        results,
        'TRH Ministries Global',
        eligibilityList.length,
        {
          barChartImage: barImg || undefined,
          pieChartImage: pieImg || undefined
        }
      );

      notifyAction({
        type: 'read',
        title: 'Exported Official Church Results Record (PDF)',
        details: `Generated and downloaded formatted PDF official voting document with visual analytics charts for "${exercise.title}".`,
        resourceName: exercise.title,
        actorName: actor.name,
        actorRole: actor.role
      });
    } catch (err: any) {
      console.error('Failed to export PDF:', err);
      alert('Error exporting PDF: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleDownloadChartImage = async (type: 'bar' | 'pie' | 'all') => {
    if (!exercise || !results) return;
    setIsDownloadingChart(type);
    try {
      const outcome = await downloadChartAsImage(
        type === 'all' ? 'both' : type,
        exercise,
        results,
        {
          bar: 'results-bar-chart-card',
          pie: 'results-pie-chart-card'
        }
      );

      if (outcome.success) {
        const label =
          type === 'all'
            ? `Downloaded ${outcome.filenames.length} chart images successfully!`
            : `Downloaded ${type === 'bar' ? 'Vote Distribution' : 'Percentage Breakdown'} chart as PNG!`;
        setChartSuccessMsg(label);
        setTimeout(() => setChartSuccessMsg(null), 4500);

        notifyAction({
          type: 'read',
          title: `Downloaded Chart Image (${type.toUpperCase()})`,
          details: `Exported chart image file(s) [${outcome.filenames.join(', ')}] for "${exercise.title}".`,
          resourceName: exercise.title,
          actorName: actor.name,
          actorRole: actor.role
        });
      }
    } catch (err: any) {
      console.error('Failed to download chart image:', err);
      alert('Error downloading chart image: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsDownloadingChart(null);
    }
  };

  // Status Handlers
  const handleStatusChange = async (newStatus: ExerciseStatus) => {
    if (!exercise) return;
    await setVotingExerciseStatus(exercise.id, newStatus, actor);
    notifyAction({
      type: 'update',
      title: `Exercise Status Updated to ${newStatus.toUpperCase()}`,
      details: `Changed status of voting exercise "${exercise.title}" from ${exercise.status} to ${newStatus}.`,
      resourceName: exercise.title,
      actorName: actor.name,
      actorRole: actor.role
    });
    loadData();
  };

  const handleTogglePublish = async () => {
    if (!exercise) return;
    const next = !exercise.resultsPublished;
    await toggleResultsPublished(exercise.id, next, actor);
    notifyAction({
      type: 'update',
      title: next ? 'Results Published to Public Portal' : 'Results Made Private / Unshared',
      details: next
        ? `Official winners and results for "${exercise.title}" are now visible on the Church Public Voter Portal.`
        : `Results for "${exercise.title}" are now hidden from public view.`,
      resourceName: exercise.title,
      actorName: actor.name,
      actorRole: actor.role
    });
    loadData();
  };

  // Open Exercise Edit Modal
  const handleOpenExerciseEdit = () => {
    if (!exercise) return;
    setExEditTitle(exercise.title);
    setExEditDesc(exercise.description || '');
    setExEditStart(exercise.startTime ? new Date(exercise.startTime).toISOString().slice(0, 16) : '');
    setExEditEnd(exercise.endTime ? new Date(exercise.endTime).toISOString().slice(0, 16) : '');
    setExEditSelfVote(!!exercise.allowSelfVote);
    setIsEditExOpen(true);
  };

  const handleSaveExerciseEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exercise || !exEditTitle.trim()) return;

    await updateVotingExercise(
      exercise.id,
      {
        title: exEditTitle.trim(),
        description: exEditDesc.trim(),
        startTime: exEditStart ? new Date(exEditStart).toISOString() : exercise.startTime,
        endTime: exEditEnd ? new Date(exEditEnd).toISOString() : exercise.endTime,
        allowSelfVote: exEditSelfVote
      },
      actor
    );

    notifyAction({
      type: 'update',
      title: 'Exercise Configuration Updated',
      details: `Updated parameters, schedule, and rules for "${exEditTitle.trim()}".`,
      resourceName: exEditTitle.trim(),
      actorName: actor.name,
      actorRole: actor.role
    });

    setIsEditExOpen(false);
    loadData();
  };

  // Criteria Handlers
  const handleOpenAddCriterion = () => {
    setEditingCrit(null);
    setCritTitle('');
    setCritDesc('');
    setIsAddCritOpen(true);
  };

  const handleOpenEditCriterion = (crit: Criterion) => {
    setEditingCrit(crit);
    setCritTitle(crit.title);
    setCritDesc(crit.description || '');
    setIsAddCritOpen(true);
  };

  const handleSaveCriterion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!critTitle.trim() || !exercise) return;

    if (editingCrit) {
      await updateCriterion(
        exercise.id,
        editingCrit.id,
        {
          title: critTitle.trim(),
          description: critDesc.trim()
        },
        actor
      );
      notifyAction({
        type: 'update',
        title: 'Evaluation Criterion Updated',
        details: `Updated voting criterion "${critTitle.trim()}" for exercise "${exercise.title}".`,
        resourceName: critTitle.trim(),
        actorName: actor.name,
        actorRole: actor.role
      });
    } else {
      await addCriterion(
        exercise.id,
        {
          title: critTitle.trim(),
          description: critDesc.trim()
        },
        actor
      );
      notifyAction({
        type: 'create',
        title: 'New Criterion Added',
        details: `Added custom evaluation criterion "${critTitle.trim()}" to "${exercise.title}".`,
        resourceName: critTitle.trim(),
        actorName: actor.name,
        actorRole: actor.role
      });
    }

    setIsAddCritOpen(false);
    setEditingCrit(null);
    setCritTitle('');
    setCritDesc('');
    loadData();
  };

  const handleToggleCriterionActive = async (crit: Criterion) => {
    if (!exercise) return;
    const nextState = !crit.active;
    await updateCriterion(exercise.id, crit.id, { active: nextState }, actor);
    notifyAction({
      type: 'update',
      title: nextState ? 'Criterion Activated' : 'Criterion Deactivated',
      details: `${nextState ? 'Activated' : 'Deactivated'} evaluation criterion "${crit.title}".`,
      resourceName: crit.title,
      actorName: actor.name,
      actorRole: actor.role
    });
    loadData();
  };

  const handleMoveCriterion = async (currentIndex: number, direction: 'up' | 'down') => {
    if (!exercise) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= criteria.length) return;

    const newOrderList = [...criteria];
    const temp = newOrderList[currentIndex];
    newOrderList[currentIndex] = newOrderList[targetIndex];
    newOrderList[targetIndex] = temp;

    const orderedIds = newOrderList.map((c) => c.id);
    await reorderCriteria(exercise.id, orderedIds, actor);
    loadData();
  };

  const handleDeleteCriterion = (critId: string) => {
    if (!exercise) return;
    if (!isSuperAdmin) {
      alert('Unauthorized: Only the Super Administrator can permanently delete voting criteria.');
      return;
    }
    const targetCrit = criteria.find((c) => c.id === critId);
    confirmAction({
      type: 'delete',
      title: 'Confirm Criterion Removal',
      message: `Are you sure you want to permanently remove criterion "${targetCrit?.title || critId}"? Voters will no longer rate nominees against this standard.`,
      confirmLabel: 'Delete Criterion',
      isDanger: true,
      onConfirm: async () => {
        await deleteCriterion(exercise.id, critId, actor);
        notifyAction({
          type: 'delete',
          title: 'Criterion Removed',
          details: `Deleted evaluation standard "${targetCrit?.title || critId}" from "${exercise.title}".`,
          resourceName: targetCrit?.title || critId,
          actorName: actor.name,
          actorRole: actor.role
        });
        loadData();
      }
    });
  };

  // Nominee Handlers
  const handleOpenAddNominee = () => {
    setEditingNom(null);
    setNomDisplayName('');
    setNomRole('');
    setNomPhoto('');
    setNomBio('');
    setNomPersonId('');
    setIsAddNomOpen(true);
  };

  const handleOpenEditNominee = (nom: Nominee) => {
    setEditingNom(nom);
    setNomDisplayName(nom.displayName);
    setNomRole(nom.roleOrTitle || nom.department || '');
    setNomPhoto(nom.photoUrl || '');
    setNomBio(nom.bio || '');
    setNomPersonId(nom.personId || '');
    setIsAddNomOpen(true);
  };

  const handleSaveNominee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomDisplayName.trim() || !exercise) return;

    if (editingNom) {
      await updateNominee(
        exercise.id,
        editingNom.id,
        {
          displayName: nomDisplayName.trim(),
          roleOrTitle: nomRole.trim(),
          photoUrl: nomPhoto.trim(),
          bio: nomBio.trim(),
          personId: nomPersonId || undefined
        },
        actor
      );
      notifyAction({
        type: 'update',
        title: 'Nominee Profile Updated',
        details: `Updated candidate profile for "${nomDisplayName.trim()}" in exercise "${exercise.title}".`,
        resourceName: nomDisplayName.trim(),
        actorName: actor.name,
        actorRole: actor.role
      });
    } else {
      await addNominee(
        exercise.id,
        {
          displayName: nomDisplayName.trim(),
          roleOrTitle: nomRole.trim(),
          photoUrl: nomPhoto.trim(),
          bio: nomBio.trim(),
          personId: nomPersonId || undefined
        },
        actor
      );
      notifyAction({
        type: 'create',
        title: 'Nominee Added to Ballot',
        details: `Registered candidate "${nomDisplayName.trim()}" for election in "${exercise.title}".`,
        resourceName: nomDisplayName.trim(),
        actorName: actor.name,
        actorRole: actor.role
      });
    }

    setIsAddNomOpen(false);
    setEditingNom(null);
    setNomDisplayName('');
    setNomRole('');
    setNomPhoto('');
    setNomBio('');
    setNomPersonId('');
    loadData();
  };

  const handleMoveNominee = async (currentIndex: number, direction: 'up' | 'down') => {
    if (!exercise) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= nominees.length) return;

    const newOrderList = [...nominees];
    const temp = newOrderList[currentIndex];
    newOrderList[currentIndex] = newOrderList[targetIndex];
    newOrderList[targetIndex] = temp;

    const orderedIds = newOrderList.map((n) => n.id);
    await reorderNominees(exercise.id, orderedIds, actor);
    loadData();
  };

  const handleDeleteNominee = (nomId: string) => {
    if (!exercise) return;
    if (!isSuperAdmin) {
      alert('Unauthorized: Only the Super Administrator can permanently delete candidates/nominees.');
      return;
    }
    const targetNom = nominees.find((n) => n.id === nomId);
    confirmAction({
      type: 'delete',
      title: 'Confirm Nominee Removal',
      message: `Are you sure you want to remove nominee "${targetNom?.displayName || nomId}" from this ballot?`,
      confirmLabel: 'Remove Nominee',
      isDanger: true,
      onConfirm: async () => {
        await deleteNominee(exercise.id, nomId, actor);
        notifyAction({
          type: 'delete',
          title: 'Nominee Removed from Ballot',
          details: `Removed candidate "${targetNom?.displayName || nomId}" from "${exercise.title}".`,
          resourceName: targetNom?.displayName || nomId,
          actorName: actor.name,
          actorRole: actor.role
        });
        loadData();
      }
    });
  };

  const handleToggleNomineeActive = async (nom: Nominee) => {
    if (!exercise) return;
    const nextState = !nom.active;
    await updateNominee(exercise.id, nom.id, { active: nextState }, actor);
    notifyAction({
      type: 'update',
      title: nextState ? 'Nominee Reactivated' : 'Nominee Suspended',
      details: `${nextState ? 'Activated' : 'Deactivated'} candidate status for "${nom.displayName}".`,
      resourceName: nom.displayName,
      actorName: actor.name,
      actorRole: actor.role
    });
    loadData();
  };

    // Eligibility Handlers
  const handleBatchAssign = async () => {
    if (!exercise) return;
    let targetList: Person[] = [];
    if (assignMode === 'all') {
      targetList = people;
    } else if (assignMode === 'dept') {
      targetList = people.filter((p) => {
        if (exercise.departmentId) {
          return p.departmentId === exercise.departmentId || p.memberships?.some((m) => m.departmentId === exercise.departmentId);
        }
        return p.organisationId === exercise.organisationId || p.memberships?.some((m) => m.organisationId === exercise.organisationId);
      });
    } else if (assignMode === 'unit') {
      targetList = people.filter((p) => {
        if (exercise.unitId) {
          return p.unitId === exercise.unitId || p.memberships?.some((m) => m.unitId === exercise.unitId);
        }
        if (exercise.departmentId) {
          return p.departmentId === exercise.departmentId || p.memberships?.some((m) => m.departmentId === exercise.departmentId);
        }
        return true;
      });
    } else if (assignMode === 'person') {
      const p = people.find((item) => item.id === selectedPersonForElig);
      if (p) targetList = [p];
    }

    await assignEligibilityBatch(exercise.id, targetList, actor);
    notifyAction({
      type: 'create',
      title: 'Voter Pool Assigned',
      details: `Enrolled ${targetList.length} verified church members into the official voter eligibility registry for "${exercise.title}".`,
      resourceName: exercise.title,
      actorName: actor.name,
      actorRole: actor.role
    });

    setIsAssignOpen(false);
    loadData();
  };

  const handleRemoveElig = (personId: string) => {
    if (!exercise) return;
    if (!isSuperAdmin) {
      alert('Unauthorized: Only the Super Administrator can revoke voter eligibility.');
      return;
    }
    const targetElig = eligibilityList.find((e) => e.personId === personId);
    confirmAction({
      type: 'delete',
      title: 'Revoke Voter Eligibility',
      message: `Are you sure you want to remove voter "${targetElig?.voterName || 'Member'}" from this exercise? They will no longer be able to cast a ballot.`,
      confirmLabel: 'Revoke Access',
      isDanger: true,
      onConfirm: async () => {
        await removeEligibility(exercise.id, personId, actor);
        notifyAction({
          type: 'delete',
          title: 'Voter Eligibility Revoked',
          details: `Removed voting rights for "${targetElig?.voterName || 'Member'}" in exercise "${exercise.title}".`,
          resourceName: targetElig?.voterName || 'Voter',
          actorName: actor.name,
          actorRole: actor.role
        });
        loadData();
      }
    });
  };

  const handleDeleteExercise = () => {
    if (!exercise) return;
    if (!isSuperAdmin) {
      alert('Unauthorized: Only the Super Administrator can permanently delete a voting cycle.');
      return;
    }

    const isDuring = exercise.status === 'open' || (exercise.totalVotes || 0) > 0;
    const warningMsg = isDuring
      ? `CRITICAL WARNING: This voting cycle ("${exercise.title}") is currently ACTIVE or has live votes cast (${exercise.totalVotes || 0} votes recorded). Deleting it will immediately terminate voting, purge all active ballots, erase nominees, criteria, eligibility records, and delete all results across the database. This action CANNOT be undone. Are you absolutely certain you want to delete this voting cycle?`
      : `WARNING: Deleting "${exercise.title}" will permanently remove this voting cycle, its evaluation criteria, nominees, voter eligibility lists, and all certified reports from the system. This action CANNOT be undone. Proceed with permanent deletion?`;

    confirmAction({
      type: 'delete',
      title: isDuring ? 'Delete Active Voting Cycle' : 'Permanently Delete Voting Cycle',
      message: warningMsg,
      confirmLabel: 'Permanently Delete Cycle',
      isDanger: true,
      onConfirm: async () => {
        try {
          await deleteVotingExercise(exercise.id, actor);
          notifyAction({
            type: 'delete',
            title: 'Voting Cycle Deleted',
            details: `Voting cycle "${exercise.title}" and all associated data have been permanently deleted by the Super Administrator.`,
            resourceName: exercise.title,
            actorName: actor.name,
            actorRole: actor.role
          });
          onBack();
        } catch (err: any) {
          alert(err?.message || 'Failed to delete voting cycle.');
        }
      }
    });
  };

  if (loading || !exercise) {
    return (
      <div className="py-16 text-center text-[#94A3B8] text-xs">
        Loading exercise configuration...
      </div>
    );
  }

  const isLiveOrVoted = exercise.status === 'open' || (exercise.totalVotes || 0) > 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Breadcrumb & Status Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Export Result Buttons */}
          <button
            onClick={handleExportCSV}
            title="Export CSV"
            className="px-3 py-1.5 bg-[#1E293B] hover:bg-[#334155] text-[#F8FAFC] border border-slate-700/80 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={handleExportPDF}
            disabled={isExportingPDF}
            title="Export PDF Official Record with Charts"
            className="px-3 py-1.5 bg-[#1E293B] hover:bg-[#334155] text-[#F8FAFC] border border-slate-700/80 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isExportingPDF ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FF8A00]" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-[#FF8A00]" />
            )}
            <span className="hidden sm:inline">{isExportingPDF ? 'Exporting...' : 'Export PDF'}</span>
          </button>

          {/* Status Controls */}
          {exercise.status === 'draft' && (
            <button
              onClick={() => handleStatusChange('open')}
              className="px-3.5 py-1.5 bg-gradient-to-r from-[#FF8A00] to-[#E85B00] hover:from-[#E85B00] hover:to-[#FF8A00] text-slate-950 rounded-xl text-xs font-bold shadow-md shadow-[#FF8A00]/25 transition-all cursor-pointer"
            >
              Open Voting Now
            </button>
          )}

          {exercise.status === 'open' && (
            <button
              onClick={() => handleStatusChange('closed')}
              className="px-3.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Close Voting</span>
            </button>
          )}

          {exercise.status === 'closed' && (
            <button
              onClick={() => handleStatusChange('open')}
              className="px-3.5 py-1.5 bg-[#334155] hover:bg-[#475569] text-[#F8FAFC] border border-slate-700 rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1 cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Re-Open Voting</span>
            </button>
          )}

          {/* Extend Voting Period Button */}
          <button
            onClick={() => setIsExtendModalOpen(true)}
            title="Extend Voting Cycle Deadline"
            className="px-3 py-1.5 bg-[#251464] hover:bg-[#251464]/80 text-[#FF8A00] border border-[#FF8A00]/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <Clock className="w-3.5 h-3.5 text-[#FF8A00]" />
            <span>Extend Period</span>
          </button>

          {/* Results Publication Toggle */}
          <button
            onClick={handleTogglePublish}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              exercise.resultsPublished
                ? 'bg-[#FF8A00]/20 text-[#FF8A00] border border-[#FF8A00]/40 hover:bg-[#FF8A00]/30'
                : 'bg-[#334155] text-[#94A3B8] hover:text-[#F8FAFC] border border-slate-700'
            }`}
          >
            {exercise.resultsPublished ? <Eye className="w-3.5 h-3.5 text-[#FF8A00]" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{exercise.resultsPublished ? 'Results: PUBLIC' : 'Results: PRIVATE'}</span>
          </button>

          {/* Delete Voting Cycle (Super Admin Only - During or After Cycle) */}
          {isSuperAdmin && (
            <button
              onClick={handleDeleteExercise}
              title="Permanently Delete Voting Cycle (Super Admin Only)"
              className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Delete Cycle</span>
            </button>
          )}
        </div>
      </div>

      {/* Hero Header Card */}
      <div className="bg-[#1E293B] rounded-3xl border border-slate-800 p-6 sm:p-7 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {exercise.scopeType && (
            <span className={`px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider border ${
              exercise.scopeType === 'church'
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                : exercise.scopeType === 'workforce'
                ? 'bg-amber-500/20 text-[#FF8A00] border-amber-500/30'
                : exercise.scopeType === 'department'
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                : exercise.scopeType === 'unit'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                : exercise.scopeType === 'custom'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-slate-700 text-slate-300 border-slate-600'
            }`}>
              Scope: {exercise.scopeType}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#334155] text-[#F8FAFC] font-semibold rounded-lg border border-slate-700">
            <Building2 className="w-3.5 h-3.5 text-[#94A3B8]" />
            {exercise.organisationName || 'Church Wide'}
          </span>
          {exercise.departmentName && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#251464] text-[#FF8A00] font-semibold rounded-lg border border-[#FF8A00]/30">
              <Layers className="w-3.5 h-3.5 text-[#FF8A00]" />
              {exercise.departmentName}
            </span>
          )}
          {exercise.unitName && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#0e3b43] text-cyan-300 font-semibold rounded-lg border border-cyan-500/30">
              <FolderTree className="w-3.5 h-3.5 text-cyan-400" />
              {exercise.unitName}
            </span>
          )}
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#251464] text-[#FF8A00] font-semibold rounded-lg border border-[#FF8A00]/30">
            <Award className="w-3.5 h-3.5 text-[#FF8A00]" />
            {exercise.categoryName || 'Recognition'}
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#334155] text-[#F8FAFC] border border-slate-700">
            {exercise.status}
          </span>
        </div>

        <div>
          <h1 className="text-2xl font-bold font-display text-[#F8FAFC] tracking-tight">{exercise.title}</h1>
          {exercise.description && (
            <p className="text-xs text-[#94A3B8] mt-1 max-w-3xl leading-relaxed">{exercise.description}</p>
          )}
        </div>

        <div className="pt-4 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="bg-[#0F172A]/50 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[#94A3B8]">Total Ballots Cast</span>
            <div className="text-xl font-bold text-[#FF8A00] font-display mt-0.5">{exercise.totalVotes || 0}</div>
          </div>
          <div className="bg-[#0F172A]/50 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[#94A3B8]">Eligible Voter Pool</span>
            <div className="text-xl font-bold text-[#F8FAFC] font-display mt-0.5">{eligibilityList.length}</div>
          </div>
          <div className="bg-[#0F172A]/50 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[#94A3B8]">Evaluation Criteria</span>
            <div className="text-xl font-bold text-[#F8FAFC] font-display mt-0.5">{criteria.length}</div>
          </div>
          <div className="bg-[#0F172A]/50 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[#94A3B8]">Nominees Listed</span>
            <div className="text-xl font-bold text-[#F8FAFC] font-display mt-0.5">{nominees.length}</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-[#1E293B] rounded-2xl border border-slate-800 p-1.5 flex items-center gap-2 overflow-x-auto text-xs font-semibold">
        {[
          { key: 'overview', label: 'Overview & Rules', icon: Settings },
          { key: 'criteria', label: `Criteria (${criteria.length})`, icon: CheckCircle2 },
          { key: 'nominees', label: `Nominees (${nominees.length})`, icon: Award },
          { key: 'eligibility', label: `Voter Registry (${eligibilityList.length})`, icon: Users },
          { key: 'results', label: 'Results & Official Export', icon: BarChart3 }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 py-2.5 px-4 rounded-xl transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-[#FF8A00] to-[#E85B00] text-slate-950 font-bold shadow-md shadow-[#FF8A00]/25'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#334155]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {isLiveOrVoted && (
            <div className="p-4 bg-[#251464]/60 border border-[#FF8A00]/30 rounded-2xl flex items-start gap-3 text-xs text-[#F8FAFC]">
              <ShieldAlert className="w-5 h-5 text-[#FF8A00] shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-[#FF8A00]">Election Integrity Safeguard Active</h4>
                <p className="text-[#94A3B8] mt-0.5">
                  This voting exercise is currently <strong>{exercise.status.toUpperCase()}</strong> with <strong>{exercise.totalVotes || 0} ballots cast</strong>. Core structural parameters are guarded to maintain election fairness.
                </p>
              </div>
            </div>
          )}

          <div className="bg-[#1E293B] rounded-3xl border border-slate-800 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-display text-[#F8FAFC]">Exercise Details & Lifecycle</h3>
              <button
                onClick={handleOpenExerciseEdit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#334155] hover:bg-[#475569] text-[#F8FAFC] rounded-xl text-xs font-bold transition-all border border-slate-700 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-[#FF8A00]" />
                <span>Edit Settings</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-3">
                <div>
                  <label className="text-[#94A3B8] block mb-1">Title</label>
                  <div className="p-2.5 bg-[#334155] rounded-xl border border-slate-700 font-semibold text-[#F8FAFC]">
                    {exercise.title}
                  </div>
                </div>

                <div>
                  <label className="text-[#94A3B8] block mb-1">Voting Scope</label>
                  <div className="p-2.5 bg-[#334155] rounded-xl border border-slate-700 font-semibold text-[#FF8A00] uppercase text-[11px] tracking-wider">
                    {exercise.scopeType || 'organisation'}
                  </div>
                </div>

                <div>
                  <label className="text-[#94A3B8] block mb-1">Organisation</label>
                  <div className="p-2.5 bg-[#334155] rounded-xl border border-slate-700 text-[#F8FAFC]">
                    {exercise.organisationName || 'Church Wide'}
                  </div>
                </div>

                <div>
                  <label className="text-[#94A3B8] block mb-1">Department</label>
                  <div className="p-2.5 bg-[#334155] rounded-xl border border-slate-700 text-[#F8FAFC]">
                    {exercise.departmentName || 'Organisation-Wide / None'}
                  </div>
                </div>

                <div>
                  <label className="text-[#94A3B8] block mb-1">Unit</label>
                  <div className="p-2.5 bg-[#334155] rounded-xl border border-slate-700 text-[#F8FAFC]">
                    {exercise.unitName || 'Department-Wide / None'}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[#94A3B8] block mb-1">Voting Start Window</label>
                  <div className="p-2.5 bg-[#334155] rounded-xl border border-slate-700 font-mono text-[#F8FAFC]">
                    {new Date(exercise.startTime).toLocaleString()}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[#94A3B8] block">Voting End Window (Deadline)</label>
                    <button
                      type="button"
                      onClick={() => setIsExtendModalOpen(true)}
                      className="text-[11px] font-bold text-[#FF8A00] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Clock className="w-3 h-3" />
                      Extend Deadline
                    </button>
                  </div>
                  <div className="p-2.5 bg-[#334155] rounded-xl border border-slate-700 font-mono text-[#F8FAFC] flex items-center justify-between">
                    <span>{new Date(exercise.endTime).toLocaleString()}</span>
                    <button
                      type="button"
                      onClick={() => setIsExtendModalOpen(true)}
                      className="px-2 py-0.5 rounded bg-[#251464] text-[#FF8A00] hover:bg-[#251464]/80 text-[10px] font-bold border border-[#FF8A00]/30 transition-colors cursor-pointer"
                    >
                      Extend
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[#94A3B8] block mb-1">Self-Voting Permitted?</label>
                  <div className="p-2.5 bg-[#334155] rounded-xl border border-slate-700 text-[#F8FAFC] font-medium">
                    {exercise.allowSelfVote ? 'Yes, nominees may vote for themselves' : 'No, self-voting is restricted'}
                  </div>
                </div>
              </div>
            </div>

            {/* Super Admin Danger Zone */}
            {isSuperAdmin && (
              <div className="mt-6 bg-red-950/20 border border-red-500/25 rounded-2xl p-5 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-red-400 flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-red-400" />
                      Permanently Delete Voting Cycle
                    </h4>
                    <p className="text-xs text-[#94A3B8] max-w-xl leading-relaxed">
                      {exercise.status === 'open' || (exercise.totalVotes || 0) > 0
                        ? `This voting cycle is currently ACTIVE with ${exercise.totalVotes || 0} votes recorded. Deleting it will terminate the voting session and permanently erase all votes, nominees, criteria, and audit logs.`
                        : 'Permanently remove this voting cycle, including all criteria, candidate profiles, voter eligibility records, and tally reports from the database.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteExercise}
                    className="px-4 py-2 bg-red-500/15 hover:bg-red-500/25 text-red-300 hover:text-red-200 border border-red-500/35 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer shadow-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete This Cycle</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CRITERIA */}
      {activeTab === 'criteria' && (
        <div className="space-y-6">
          <div className="bg-[#1E293B] rounded-3xl border border-slate-800 p-6 space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold font-display text-[#F8FAFC]">Custom Evaluation Criteria</h3>
                <p className="text-xs text-[#94A3B8]">Configure what voters consider when reviewing nominees.</p>
              </div>
              <button
                onClick={handleOpenAddCriterion}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#FF8A00] to-[#E85B00] text-slate-950 rounded-xl text-xs font-bold shadow-md shadow-[#FF8A00]/25 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Criterion</span>
              </button>
            </div>

            {criteria.length === 0 ? (
              <div className="py-10 text-center text-[#94A3B8] text-xs border border-dashed border-slate-800 rounded-2xl">
                No criteria added yet. Add custom criteria to guide your voters.
              </div>
            ) : (
              <div className="space-y-3">
                {criteria.map((crit, idx) => (
                  <div
                    key={crit.id}
                    className={`p-4 rounded-2xl border flex items-start justify-between gap-4 text-xs transition-all ${
                      crit.active !== false
                        ? 'bg-[#334155]/60 border-slate-700'
                        : 'bg-[#334155]/30 border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-[#251464] text-[#FF8A00] font-bold flex items-center justify-center shrink-0 mt-0.5 border border-[#FF8A00]/30">
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-[#F8FAFC] text-sm">{crit.title}</h4>
                          <button
                            onClick={() => handleToggleCriterionActive(crit)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer ${
                              crit.active !== false
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-slate-700 text-slate-400'
                            }`}
                          >
                            {crit.active !== false ? 'Active' : 'Inactive'}
                          </button>
                        </div>
                        {crit.description && <p className="text-[#94A3B8] mt-1 leading-relaxed">{crit.description}</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleMoveCriterion(idx, 'up')}
                        disabled={idx === 0}
                        title="Move Up"
                        className="p-1.5 text-[#94A3B8] hover:text-[#F8FAFC] disabled:opacity-30 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleMoveCriterion(idx, 'down')}
                        disabled={idx === criteria.length - 1}
                        title="Move Down"
                        className="p-1.5 text-[#94A3B8] hover:text-[#F8FAFC] disabled:opacity-30 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEditCriterion(crit)}
                        title="Edit Criterion"
                        className="p-1.5 text-[#94A3B8] hover:text-[#FF8A00] rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {isSuperAdmin && (
                        <button
                          onClick={() => handleDeleteCriterion(crit.id)}
                          title="Delete Criterion (Super Admin Only)"
                          className="p-1.5 text-[#94A3B8] hover:text-red-400 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: NOMINEES */}
      {activeTab === 'nominees' && (
        <div className="space-y-6">
          <div className="bg-[#1E293B] rounded-3xl border border-slate-800 p-6 space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold font-display text-[#F8FAFC]">Registered Nominees ({nominees.length})</h3>
                <p className="text-xs text-[#94A3B8]">
                  Official candidates on the ballot. Linked to the church directory for verified identification.
                </p>
              </div>
              <button
                onClick={handleOpenAddNominee}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#FF8A00] to-[#E85B00] text-slate-950 rounded-xl text-xs font-bold shadow-md shadow-[#FF8A00]/25 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Nominee</span>
              </button>
            </div>

            {nominees.length === 0 ? (
              <div className="py-12 text-center text-[#94A3B8] text-xs border border-dashed border-slate-800 rounded-2xl">
                No nominees registered yet. Add official candidates or link from the Church Member Directory.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {nominees.map((nom, idx) => (
                  <div
                    key={nom.id}
                    className={`p-4 rounded-2xl border flex items-start justify-between gap-4 text-xs transition-all ${
                      nom.active !== false
                        ? 'bg-[#334155]/60 border-slate-700'
                        : 'bg-[#334155]/30 border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#251464] to-[#0F172A] border border-[#FF8A00]/30 overflow-hidden shrink-0 flex items-center justify-center font-bold text-[#FF8A00]">
                        {nom.photoUrl ? (
                          <img
                            src={nom.photoUrl}
                            alt={nom.displayName}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          nom.displayName.charAt(0)
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-[#F8FAFC] text-sm truncate">{nom.displayName}</h4>
                          <span className="text-[10px] font-mono text-[#94A3B8] font-semibold">#{idx + 1}</span>
                        </div>
                        <p className="text-[#FF8A00] font-medium text-xs truncate">
                          {nom.roleOrTitle || nom.department || 'Nominee'}
                        </p>
                        {nom.personId && (
                          <div className="mt-1 flex items-center gap-1 text-[11px] text-[#94A3B8]">
                            <Users className="w-3 h-3 text-[#FF8A00]" />
                            <span className="truncate">Linked to Church Member Registry</span>
                          </div>
                        )}
                        {nom.bio && <p className="text-[#94A3B8] mt-1 line-clamp-2 text-[11px] leading-relaxed">{nom.bio}</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleMoveNominee(idx, 'up')}
                        disabled={idx === 0}
                        title="Move Up"
                        className="p-1.5 text-[#94A3B8] hover:text-[#F8FAFC] disabled:opacity-30 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleMoveNominee(idx, 'down')}
                        disabled={idx === nominees.length - 1}
                        title="Move Down"
                        className="p-1.5 text-[#94A3B8] hover:text-[#F8FAFC] disabled:opacity-30 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleNomineeActive(nom)}
                        title={nom.active !== false ? 'Deactivate candidate' : 'Activate candidate'}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                          nom.active !== false
                            ? 'text-emerald-300 bg-emerald-500/20 border border-emerald-500/30'
                            : 'text-slate-400 bg-slate-700'
                        }`}
                      >
                        {nom.active !== false ? 'Active' : 'Inactive'}
                      </button>
                      <button
                        onClick={() => handleOpenEditNominee(nom)}
                        title="Edit Candidate"
                        className="p-1.5 text-[#94A3B8] hover:text-[#FF8A00] rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {isSuperAdmin && (
                        <button
                          onClick={() => handleDeleteNominee(nom.id)}
                          title="Delete Candidate (Super Admin Only)"
                          className="p-1.5 text-[#94A3B8] hover:text-red-400 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: VOTER ELIGIBILITY */}
      {activeTab === 'eligibility' && (
        <div className="bg-[#1E293B] rounded-3xl border border-slate-800 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold font-display text-[#F8FAFC]">
                Voter Eligibility Registry ({eligibilityList.length})
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Only verified members on this list are permitted to cast ballots for this exercise.
              </p>
            </div>

            <button
              onClick={() => setIsAssignOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#FF8A00] to-[#E85B00] text-slate-950 rounded-xl text-xs font-bold shadow-md shadow-[#FF8A00]/25 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Assign Voters Pool</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0F172A] border-b border-slate-800 text-[#94A3B8] uppercase tracking-wider text-[11px] font-semibold">
                <tr>
                  <th className="px-4 py-3">Member Name</th>
                  <th className="px-4 py-3">Voter Code</th>
                  <th className="px-4 py-3">Eligibility</th>
                  <th className="px-4 py-3">Ballot Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {eligibilityList.map((elig) => (
                  <tr key={elig.id} className="hover:bg-[#334155]/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-[#F8FAFC]">{elig.voterName || 'Member'}</td>
                    <td className="px-4 py-3 font-mono text-[#94A3B8]">{elig.voterCode || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full font-bold text-[11px]">
                        Eligible
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {elig.hasVoted ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                          <Check className="w-3.5 h-3.5" /> Voted ({new Date(elig.votedAt || '').toLocaleDateString()})
                        </span>
                      ) : (
                        <span className="text-[#94A3B8] italic">Not yet voted</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isSuperAdmin && (
                        <button
                          onClick={() => handleRemoveElig(elig.personId)}
                          title="Remove eligibility (Super Admin Only)"
                          className="p-1 text-[#94A3B8] hover:text-red-400 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: RESULTS & ANALYTICS */}
      {activeTab === 'results' && results && (
        <div className="space-y-6">
          {/* Header Action Row for Results */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#1E293B] border border-slate-800 rounded-3xl p-5 shadow-xs">
            <div>
              <h3 className="text-base font-bold font-display text-[#F8FAFC] flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#FF8A00]" />
                Exercise Results & Official Church Record
              </h3>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Export comprehensive election outcomes with charts or publish results to the member portal.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2 bg-[#334155] hover:bg-[#475569] text-[#F8FAFC] rounded-xl text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Export CSV</span>
              </button>

              {results.totalVotes > 0 && (
                <button
                  onClick={() => handleDownloadChartImage('all')}
                  disabled={isDownloadingChart !== null}
                  title="Download both charts as separate PNG image files"
                  className="px-3.5 py-2 bg-[#334155] hover:bg-[#475569] text-[#F8FAFC] rounded-xl text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isDownloadingChart === 'all' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#FF8A00]" />
                  ) : (
                    <ImageDown className="w-4 h-4 text-[#FF8A00]" />
                  )}
                  <span>{isDownloadingChart === 'all' ? 'Saving Charts...' : 'Download Charts (PNG)'}</span>
                </button>
              )}

              <button
                onClick={handleExportPDF}
                disabled={isExportingPDF}
                title="Export official PDF document including visual analytics charts"
                className="px-3.5 py-2 bg-gradient-to-r from-[#FF8A00] to-[#E85B00] hover:from-[#E85B00] hover:to-[#FF8A00] text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md shadow-[#FF8A00]/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isExportingPDF ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                <span>{isExportingPDF ? 'Generating PDF with Charts...' : 'Export Official PDF'}</span>
              </button>
            </div>
          </div>

          {/* Download Feedback Banner */}
          {chartSuccessMsg && (
            <div className="bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 shadow-lg shadow-emerald-950/30 animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{chartSuccessMsg}</span>
              </div>
              <button
                onClick={() => setChartSuccessMsg(null)}
                className="text-emerald-400 hover:text-emerald-200 p-1 rounded-lg"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Winner Banner or Tie Alert */}
          {results.totalVotes === 0 ? (
            <div className="bg-[#1E293B] rounded-3xl border border-slate-800 p-8 text-center text-[#94A3B8] text-xs">
              No votes recorded yet for this exercise.
            </div>
          ) : results.isTie ? (
            <div className="bg-[#251464] border border-[#FF8A00]/40 rounded-3xl p-6 flex items-center gap-4 text-[#F8FAFC]">
              <Crown className="w-8 h-8 text-[#FF8A00] shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-[#FF8A00]">Joint Tie for First Place</h4>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Top candidates: {results.winners.map((w) => `${w.displayName} (${w.voteCount} votes)`).join(', ')}
                </p>
              </div>
            </div>
          ) : results.winners.length > 0 ? (
            <div className="bg-gradient-to-r from-[#251464] to-[#1E293B] border border-[#FF8A00]/40 text-[#F8FAFC] rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-[#FF8A00]/5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#FF8A00] text-slate-950 flex items-center justify-center shadow-lg font-bold text-xl shrink-0">
                  <Crown className="w-8 h-8 fill-slate-950 text-slate-950" />
                </div>
                <div>
                  <div className="text-xs uppercase font-bold text-[#FF8A00] tracking-wider">Current Leader / Winner</div>
                  <div className="text-xl font-bold font-display">{results.winners[0].displayName}</div>
                  <div className="text-xs text-[#94A3B8]">
                    {results.winners[0].voteCount} votes ({results.winners[0].percentage}% of total cast)
                  </div>
                </div>
              </div>

              <button
                onClick={handleTogglePublish}
                className="px-4 py-2 bg-[#F8FAFC] text-slate-950 rounded-xl text-xs font-bold hover:bg-[#FF8A00] transition-colors shadow-sm cursor-pointer"
              >
                {exercise.resultsPublished ? 'Unpublish Results' : 'Publish Official Results'}
              </button>
            </div>
          ) : null}

          {/* Charts Row */}
          {results.totalVotes > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bar Chart Card */}
              <div
                id="results-bar-chart-card"
                className="bg-[#1E293B] rounded-3xl border border-slate-800 p-6 space-y-4 shadow-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold uppercase text-[#94A3B8] tracking-wider flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-[#FF8A00]" />
                    <span>Vote Distribution by Nominee</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => handleDownloadChartImage('bar')}
                    disabled={isDownloadingChart !== null}
                    className="chart-ignore-capture px-2.5 py-1.5 bg-[#334155] hover:bg-[#475569] text-[#F8FAFC] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-700 cursor-pointer disabled:opacity-50 shadow-xs"
                    title="Download Bar Chart as Image (PNG)"
                  >
                    {isDownloadingChart === 'bar' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FF8A00]" />
                    ) : (
                      <Download className="w-3.5 h-3.5 text-[#FF8A00]" />
                    )}
                    <span>{isDownloadingChart === 'bar' ? 'Saving...' : 'Download Image'}</span>
                  </button>
                </div>

                <div className="h-64 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={results.nomineeResults}>
                      <XAxis dataKey="displayName" tick={{ fill: '#94A3B8', fontSize: 10 }} interval={0} />
                      <YAxis allowDecimals={false} tick={{ fill: '#94A3B8', fontSize: 10 }} />
                      <Tooltip
                        formatter={(val: any) => [`${val} votes`, 'Count']}
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderColor: '#334155',
                          borderRadius: '12px',
                          fontSize: '12px',
                          color: '#F8FAFC'
                        }}
                      />
                      <Bar dataKey="voteCount" radius={[6, 6, 0, 0]}>
                        {results.nomineeResults.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Pie Chart Card */}
              <div
                id="results-pie-chart-card"
                className="bg-[#1E293B] rounded-3xl border border-slate-800 p-6 space-y-4 shadow-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold uppercase text-[#94A3B8] tracking-wider flex items-center gap-1.5">
                    <PieChartIcon className="w-4 h-4 text-emerald-400" />
                    <span>Percentage Breakdown</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => handleDownloadChartImage('pie')}
                    disabled={isDownloadingChart !== null}
                    className="chart-ignore-capture px-2.5 py-1.5 bg-[#334155] hover:bg-[#475569] text-[#F8FAFC] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-700 cursor-pointer disabled:opacity-50 shadow-xs"
                    title="Download Pie Chart as Image (PNG)"
                  >
                    {isDownloadingChart === 'pie' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    ) : (
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span>{isDownloadingChart === 'pie' ? 'Saving...' : 'Download Image'}</span>
                  </button>
                </div>

                <div className="h-64 w-full flex items-center justify-center pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={results.nomineeResults}
                        dataKey="voteCount"
                        nameKey="displayName"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={(entry: any) => `${entry.displayName || entry.name}: ${entry.percentage ?? Math.round((entry.percent || 0) * 100)}%`}
                      >
                        {results.nomineeResults.map((entry, index) => (
                          <Cell key={`pie-cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderColor: '#334155',
                          borderRadius: '12px',
                          fontSize: '12px',
                          color: '#F8FAFC'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Criterion Modal */}
      {isAddCritOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#1E293B] rounded-2xl sm:rounded-3xl max-w-md w-full p-5 sm:p-8 shadow-2xl border border-slate-800 space-y-4 my-auto max-h-[calc(100dvh-2rem)] overflow-y-auto animate-scaleUp">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-display text-[#F8FAFC]">
                {editingCrit ? 'Edit Voting Criterion' : 'Add Voting Criterion'}
              </h3>
              <button
                onClick={() => {
                  setIsAddCritOpen(false);
                  setEditingCrit(null);
                }}
                className="text-[#94A3B8] hover:text-[#F8FAFC] text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveCriterion} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#F8FAFC] mb-1">Criterion Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Attendance & Punctuality, Vocal Mastery, Leadership"
                  value={critTitle}
                  onChange={(e) => setCritTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#FF8A00]"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#F8FAFC] mb-1">Guideline / Description</label>
                <textarea
                  rows={3}
                  placeholder="Explain to the voter what qualifies high performance..."
                  value={critDesc}
                  onChange={(e) => setCritDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#FF8A00] resize-none"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddCritOpen(false);
                    setEditingCrit(null);
                  }}
                  className="px-4 py-2 bg-[#334155] text-[#F8FAFC] rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-[#FF8A00] to-[#E85B00] text-slate-950 rounded-xl font-bold shadow-md shadow-[#FF8A00]/25 cursor-pointer"
                >
                  {editingCrit ? 'Update Criterion' : 'Save Criterion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Exercise Modal */}
      {isEditExOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#1E293B] rounded-2xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-8 shadow-2xl border border-slate-800 space-y-4 my-auto max-h-[calc(100dvh-2rem)] overflow-y-auto animate-scaleUp">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-display text-[#F8FAFC]">Edit Exercise Settings</h3>
              <button
                onClick={() => setIsEditExOpen(false)}
                className="text-[#94A3B8] hover:text-[#F8FAFC] text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveExerciseEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#F8FAFC] mb-1">Exercise Title *</label>
                <input
                  type="text"
                  required
                  value={exEditTitle}
                  onChange={(e) => setExEditTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00] font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#F8FAFC] mb-1">Description</label>
                <textarea
                  rows={3}
                  value={exEditDesc}
                  onChange={(e) => setExEditDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00] resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#F8FAFC] mb-1">Voting Start Window</label>
                  <input
                    type="datetime-local"
                    value={exEditStart}
                    onChange={(e) => setExEditStart(e.target.value)}
                    className="w-full px-3 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00] font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#F8FAFC] mb-1">Voting End Window</label>
                  <input
                    type="datetime-local"
                    value={exEditEnd}
                    onChange={(e) => setExEditEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00] font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="selfVoteCheckbox"
                  checked={exEditSelfVote}
                  onChange={(e) => setExEditSelfVote(e.target.checked)}
                  className="rounded text-[#FF8A00] focus:ring-[#FF8A00] w-4 h-4 cursor-pointer"
                />
                <label htmlFor="selfVoteCheckbox" className="font-semibold text-[#F8FAFC] cursor-pointer">
                  Allow Nominees to Vote for Themselves
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditExOpen(false)}
                  className="px-4 py-2 bg-[#334155] text-[#F8FAFC] rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-[#FF8A00] to-[#E85B00] text-slate-950 rounded-xl font-bold shadow-md shadow-[#FF8A00]/25 cursor-pointer"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Nominee Modal */}
      {isAddNomOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#1E293B] rounded-2xl sm:rounded-3xl max-w-md w-full p-5 sm:p-8 shadow-2xl border border-slate-800 space-y-4 my-auto max-h-[calc(100dvh-2rem)] overflow-y-auto animate-scaleUp">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-display text-[#F8FAFC]">
                {editingNom ? 'Edit Nominee Profile' : 'Add Official Nominee'}
              </h3>
              <button
                onClick={() => {
                  setIsAddNomOpen(false);
                  setEditingNom(null);
                }}
                className="text-[#94A3B8] hover:text-[#F8FAFC] text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveNominee} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#F8FAFC] mb-1">Associate with Church Member</label>
                <select
                  value={nomPersonId}
                  onChange={(e) => {
                    const pid = e.target.value;
                    setNomPersonId(pid);
                    const p = people.find((item) => item.id === pid);
                    if (p) {
                      setNomDisplayName(p.fullName);
                      setNomRole(p.roleTitle || p.departmentName || '');
                      if (p.photoUrl || p.avatarUrl) {
                        setNomPhoto(p.photoUrl || p.avatarUrl || '');
                      }
                    }
                  }}
                  className="w-full px-3 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
                >
                  <option value="">
                    {exercise.scopeType === 'department' && exercise.departmentName
                      ? `-- Select ${exercise.departmentName} Member --`
                      : '-- Manual Entry or Select Member --'}
                  </option>
                  {people
                    .filter((p) => {
                      if (exercise.scopeType === 'department' && exercise.departmentId) {
                        return (
                          p.departmentId === exercise.departmentId ||
                          p.memberships?.some((m) => m.departmentId === exercise.departmentId)
                        );
                      }
                      if (exercise.scopeType === 'unit' && exercise.unitId) {
                        return (
                          p.unitId === exercise.unitId ||
                          p.memberships?.some((m) => m.unitId === exercise.unitId)
                        );
                      }
                      if (exercise.scopeType === 'organisation' && exercise.organisationId) {
                        return (
                          p.organisationId === exercise.organisationId ||
                          p.memberships?.some((m) => m.organisationId === exercise.organisationId)
                        );
                      }
                      return true;
                    })
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.fullName} {p.departmentName ? `(${p.departmentName})` : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#F8FAFC] mb-1">Display Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sister Mary Johnson"
                  value={nomDisplayName}
                  onChange={(e) => setNomDisplayName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#FF8A00]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#F8FAFC] mb-1">Role / Ministry Title</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Steward, Choir Lead"
                  value={nomRole}
                  onChange={(e) => setNomRole(e.target.value)}
                  className="w-full px-3 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#FF8A00]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#F8FAFC] mb-1">Photo URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={nomPhoto}
                  onChange={(e) => setNomPhoto(e.target.value)}
                  className="w-full px-3 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#FF8A00]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#F8FAFC] mb-1">Short Bio / Highlights</label>
                <textarea
                  rows={2}
                  placeholder="Candidate profile, contributions, and spiritual milestones..."
                  value={nomBio}
                  onChange={(e) => setNomBio(e.target.value)}
                  className="w-full px-3 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] placeholder:text-[#94A3B8] resize-none focus:outline-none focus:border-[#FF8A00]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddNomOpen(false);
                    setEditingNom(null);
                  }}
                  className="px-4 py-2 bg-[#334155] text-[#F8FAFC] rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-[#FF8A00] to-[#E85B00] text-slate-950 rounded-xl font-bold shadow-md shadow-[#FF8A00]/25 cursor-pointer"
                >
                  {editingNom ? 'Update Nominee' : 'Save Nominee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Voter Modal */}
      {isAssignOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#1E293B] rounded-2xl sm:rounded-3xl max-w-md w-full p-5 sm:p-8 shadow-2xl border border-slate-800 space-y-4 my-auto max-h-[calc(100dvh-2rem)] overflow-y-auto animate-scaleUp">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-display text-[#F8FAFC]">Assign Eligible Voters</h3>
              <button
                onClick={() => setIsAssignOpen(false)}
                className="text-[#94A3B8] hover:text-[#F8FAFC] text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#F8FAFC] mb-1">Batch Assignment Mode</label>
                <select
                  value={assignMode}
                  onChange={(e) => setAssignMode(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
                >
                  <option value="all">Assign Entire Church Membership Directory</option>
                  <option value="dept">Assign All Members in this Exercise's Department/Org</option>
                  {exercise.unitId && (
                    <option value="unit">Assign All Members in this Exercise's Unit ({exercise.unitName})</option>
                  )}
                  <option value="person">Assign Individual Church Member</option>
                </select>
              </div>

              {assignMode === 'person' && (
                <div>
                  <label className="block font-semibold text-[#F8FAFC] mb-1">Choose Member</label>
                  <select
                    value={selectedPersonForElig}
                    onChange={(e) => setSelectedPersonForElig(e.target.value)}
                    className="w-full px-3 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
                  >
                    <option value="">-- Choose Member --</option>
                    {people.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.fullName} ({p.voterCode})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAssignOpen(false)}
                  className="px-4 py-2 bg-[#334155] text-[#F8FAFC] rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBatchAssign}
                  className="px-5 py-2 bg-gradient-to-r from-[#FF8A00] to-[#E85B00] text-slate-950 rounded-xl font-bold shadow-md shadow-[#FF8A00]/25 cursor-pointer"
                >
                  Confirm Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Extend Voting Period Modal */}
      <ExtendVotingModal
        exercise={exercise}
        isOpen={isExtendModalOpen}
        onClose={() => setIsExtendModalOpen(false)}
        onSuccess={(updated) => {
          setExercise(updated);
          loadData();
        }}
      />
    </div>
  );
};
