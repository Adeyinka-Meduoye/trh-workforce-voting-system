import React, { useState, useEffect, useMemo } from 'react';
import { VotingExercise, Criterion, Nominee } from '../../types';
import {
  getVotingExerciseById,
  getCriteria,
  getNominees,
  checkVoterEligibility,
  submitVote,
  VoteSubmissionResult
} from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useSystemConfig } from '../../context/SystemConfigContext';
import { useToast } from '../../context/ToastContext';
import { VotingCountdownTimer } from '../../components/voter/VotingCountdownTimer';
import confetti from 'canvas-confetti';
import {
  Vote,
  CheckCircle2,
  AlertCircle,
  Clock,
  Building2,
  Award,
  UserCheck,
  Shield,
  HelpCircle,
  ArrowLeft,
  Sparkles,
  Lock,
  ChevronRight,
  Info,
  Calendar,
  Layers,
  FolderTree,
  KeyRound,
  User,
  ShieldCheck,
  CheckSquare,
  Square,
  Zap
} from 'lucide-react';

interface DynamicVotingPageProps {
  exerciseId: string;
  onBack: () => void;
  onViewResults: (exerciseId: string) => void;
}

export const DynamicVotingPage: React.FC<DynamicVotingPageProps> = ({
  exerciseId,
  onBack,
  onViewResults
}) => {
  const { config } = useSystemConfig();
  const { voterSession, authenticateWithVoterCode, clearVoterSession } = useAuth();

  const [exercise, setExercise] = useState<VotingExercise | null>(null);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [nominees, setNominees] = useState<Nominee[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected Nominee
  const [selectedNomineeId, setSelectedNomineeId] = useState<string>('');

  // Category selections & filter tracking for multi-category and single-category exercises
  const [categorySelections, setCategorySelections] = useState<Record<string, string>>({});
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');

  // Voter Code Verification Input (if not already verified)
  const [inputVoterCode, setInputVoterCode] = useState<string>('');
  const [codeError, setCodeError] = useState<string>('');
  const [verifyingCode, setVerifyingCode] = useState<boolean>(false);

  const { success: toastSuccess, error: toastError } = useToast();

  // Voting Status & Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<VoteSubmissionResult | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [hasReviewedSelection, setHasReviewedSelection] = useState(false);
  const [eligibilityStatus, setEligibilityStatus] = useState<{ eligible: boolean; hasVoted: boolean } | null>(null);

  // Time calculations
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [ex, crits, noms] = await Promise.all([
        getVotingExerciseById(exerciseId),
        getCriteria(exerciseId, true),
        getNominees(exerciseId, true)
      ]);

      setExercise(ex);
      setCriteria(crits);
      setNominees(noms);

      // Check current voter eligibility if session exists
      if (voterSession && ex) {
        const el = await checkVoterEligibility(ex.id, voterSession.id);
        setEligibilityStatus(el);
      }
    } catch (e) {
      console.error('Error loading dynamic exercise:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [exerciseId, voterSession?.id]);

  // Countdown timer calculation
  useEffect(() => {
    if (!exercise?.endTime) return;
    const calculateTime = () => {
      const end = new Date(exercise.endTime).getTime();
      const now = Date.now();
      const diff = end - now;

      if (diff <= 0) {
        setTimeRemaining('Voting Closed');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h ${minutes}m remaining`);
      } else {
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s remaining`);
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [exercise?.endTime]);

  // Handle voter code submission / instant vote
  const handleVerifyVoterCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputVoterCode.trim()) {
      setCodeError('Please enter your unique voter code.');
      return;
    }
    setCodeError('');

    // If a nominee is already selected, proceed to vote ASAP in one action!
    if (selectedNominee) {
      await handleInstantVote(selectedNominee);
      return;
    }

    setVerifyingCode(true);
    const res = await authenticateWithVoterCode(inputVoterCode.trim());
    setVerifyingCode(false);

    if (!res.success) {
      setCodeError(res.message || 'Invalid voter code.');
    } else if (res.person && exercise) {
      const el = await checkVoterEligibility(exercise.id, res.person.id);
      setEligibilityStatus(el);
      if (el.eligible && !el.hasVoted) {
        toastSuccess('Code Verified!', 'Your code is confirmed. Tap your preferred nominee below to cast your vote ASAP.');
      }
    }
  };

  // Handle actual vote submission
  const handleConfirmVote = async () => {
    if (!exercise || !selectedNomineeId || !voterSession) return;

    setIsSubmitting(true);
    try {
      const res = await submitVote(exercise.id, selectedNomineeId, {
        personId: voterSession.id,
        voterName: voterSession.fullName,
        voterCode: voterSession.voterCode,
        voterEmail: voterSession.email
      });

      setSubmissionResult(res);
      setShowConfirmModal(false);

      if (res.success) {
        // Trigger celebratory confetti
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        setEligibilityStatus({ eligible: true, hasVoted: true });

        // Trigger toast notification feedback confirming vote was recorded
        const candidateName = selectedNominee?.displayName || 'your chosen candidate';
        toastSuccess(
          'Vote Recorded Successfully!',
          `Your vote for "${candidateName}" in "${exercise.title}" has been securely recorded and verified in the audit trail. (Receipt: ${res.receiptHash || voterSession.voterCode})`,
          7500
        );
      } else {
        toastError(
          'Vote Submission Failed',
          res.message || 'We were unable to record your vote. Please try again.'
        );
      }
    } catch (err: any) {
      toastError(
        'Vote Submission Error',
        err.message || 'A network error occurred while recording your vote.'
      );
      setSubmissionResult({
        success: false,
        code: 'ERROR',
        message: err.message || 'Submission failed.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Instant vote handler: allows submitting in an instant from nominee card or adjacent panel
  const handleInstantVote = async (nomineeToVote?: Nominee) => {
    const targetNominee = nomineeToVote || selectedNominee;
    if (!targetNominee) {
      toastError('Nominee Required', 'Please select a nominee from the ballot.');
      return;
    }

    if (!exercise) return;

    if (exercise.status !== 'open') {
      toastError('Voting Closed', 'This voting exercise is currently not open for votes.');
      return;
    }

    if (eligibilityStatus?.hasVoted) {
      toastError('Already Voted', 'You have already submitted a vote for this exercise.');
      return;
    }

    // Ensure state reflects chosen nominee
    if (targetNominee.id !== selectedNomineeId) {
      setSelectedNomineeId(targetNominee.id);
      const cat = getNomineeCategory(targetNominee);
      setCategorySelections((prev) => ({
        ...prev,
        [cat]: targetNominee.id
      }));
    }

    // Case 1: Voter is already authenticated
    if (voterSession) {
      const isSelf = targetNominee.personId === voterSession.id;
      if (isSelf && !exercise.allowSelfVote) {
        toastError('Self-Voting Disabled', 'Self-voting is not permitted in this exercise.');
        return;
      }

      setIsSubmitting(true);
      try {
        const res = await submitVote(exercise.id, targetNominee.id, {
          personId: voterSession.id,
          voterName: voterSession.fullName,
          voterCode: voterSession.voterCode,
          voterEmail: voterSession.email
        });

        setSubmissionResult(res);
        setShowConfirmModal(false);

        if (res.success) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
          setEligibilityStatus({ eligible: true, hasVoted: true });
          toastSuccess(
            'Vote Cast in an Instant!',
            `Your vote for "${targetNominee.displayName}" has been officially recorded. (Receipt: ${res.receiptHash || voterSession.voterCode})`,
            7500
          );
        } else {
          toastError(
            'Vote Submission Failed',
            res.message || 'We were unable to record your vote. Please try again.'
          );
        }
      } catch (err: any) {
        toastError(
          'Vote Submission Error',
          err.message || 'A network error occurred while recording your vote.'
        );
        setSubmissionResult({
          success: false,
          code: 'ERROR',
          message: err.message || 'Submission failed.'
        });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Case 2: Voter has typed in a code but hasn't pressed "Unlock"
    if (inputVoterCode.trim()) {
      setVerifyingCode(true);
      setCodeError('');
      const authRes = await authenticateWithVoterCode(inputVoterCode.trim());
      setVerifyingCode(false);

      if (!authRes.success || !authRes.person) {
        setCodeError(authRes.message || 'Invalid voter code.');
        toastError('Invalid Voter Code', authRes.message || 'Please check your voter code.');
        return;
      }

      // Check eligibility
      const el = await checkVoterEligibility(exercise.id, authRes.person.id);
      setEligibilityStatus(el);
      if (!el.eligible) {
        toastError('Not Eligible', 'This member code is not registered as eligible for this exercise.');
        return;
      }
      if (el.hasVoted) {
        toastError('Already Voted', 'This member code has already submitted a ballot for this exercise.');
        return;
      }

      const isSelf = targetNominee.personId === authRes.person.id;
      if (isSelf && !exercise.allowSelfVote) {
        toastError('Self-Voting Disabled', 'Self-voting is not permitted in this exercise.');
        return;
      }

      // Proceed to instant submit
      setIsSubmitting(true);
      try {
        const res = await submitVote(exercise.id, targetNominee.id, {
          personId: authRes.person.id,
          voterName: authRes.person.fullName,
          voterCode: authRes.person.voterCode,
          voterEmail: authRes.person.email
        });

        setSubmissionResult(res);
        setShowConfirmModal(false);

        if (res.success) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
          setEligibilityStatus({ eligible: true, hasVoted: true });
          toastSuccess(
            'Vote Cast in an Instant!',
            `Your vote for "${targetNominee.displayName}" has been officially recorded. (Receipt: ${res.receiptHash || authRes.person.voterCode})`,
            7500
          );
        } else {
          toastError(
            'Vote Submission Failed',
            res.message || 'We were unable to record your vote. Please try again.'
          );
        }
      } catch (err: any) {
        toastError(
          'Vote Submission Error',
          err.message || 'A network error occurred while recording your vote.'
        );
        setSubmissionResult({
          success: false,
          code: 'ERROR',
          message: err.message || 'Submission failed.'
        });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Case 3: No code entered and no session
    setCodeError('Please enter your voting code to cast your vote.');
    toastError(
      'Voting Code Required',
      'Please enter your unique church voting code in the verification box to cast your vote in an instant.'
    );
    const el = document.getElementById('voter-verification-panel');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Derived categories in this exercise
  const categoriesList = useMemo(() => {
    if (!exercise) return [];

    // 1. If exercise explicitly has categories defined
    if (Array.isArray((exercise as any).categories) && (exercise as any).categories.length > 0) {
      return (exercise as any).categories
        .map((c: any) => typeof c === 'string' ? c.trim() : c.name || c.title)
        .filter(Boolean);
    }

    // 2. Distinct categories/departments across nominees
    const catSet = new Set<string>();
    nominees.forEach((n) => {
      const cat = (n as any).category || (n as any).categoryName || n.department || n.unit;
      if (cat && typeof cat === 'string' && cat.trim()) {
        catSet.add(cat.trim());
      }
    });

    if (catSet.size > 1) {
      return Array.from(catSet);
    }

    // 3. Fallback to exercise categoryName or general category
    if (exercise.categoryName && exercise.categoryName.trim()) {
      return [exercise.categoryName.trim()];
    }

    return ['General Recognition Category'];
  }, [exercise, nominees]);

  // Helper to determine the category of a nominee
  const getNomineeCategory = (n: Nominee): string => {
    if (categoriesList.length <= 1) return categoriesList[0] || 'General Recognition Category';
    const cat = (n as any).category || (n as any).categoryName || n.department || n.unit;
    if (cat && typeof cat === 'string' && categoriesList.includes(cat.trim())) {
      return cat.trim();
    }
    return categoriesList[0] || 'General Recognition Category';
  };

  // Check if a category is completed
  const isCategoryCompleted = (cat: string): boolean => {
    if (eligibilityStatus?.hasVoted) return true;
    if (categoriesList.length <= 1) {
      return !!selectedNomineeId;
    }
    return !!categorySelections[cat];
  };

  // Track how many categories in the current voting exercise have been completed
  const completedCategoriesCount = useMemo(() => {
    if (eligibilityStatus?.hasVoted) return categoriesList.length;
    if (categoriesList.length <= 1) {
      return selectedNomineeId ? 1 : 0;
    }
    return categoriesList.filter((c) => !!categorySelections[c]).length;
  }, [categoriesList, categorySelections, selectedNomineeId, eligibilityStatus?.hasVoted]);

  const totalCategories = Math.max(categoriesList.length, 1);
  const progressPercentage = Math.round((completedCategoriesCount / totalCategories) * 100);
  const isAllCategoriesCompleted = completedCategoriesCount === totalCategories && totalCategories > 0;

  // Filtered nominees according to active category filter
  const displayedNominees = useMemo(() => {
    if (activeCategoryFilter === 'all' || categoriesList.length <= 1) {
      return nominees;
    }
    return nominees.filter((n) => getNomineeCategory(n) === activeCategoryFilter);
  }, [nominees, activeCategoryFilter, categoriesList]);

  // Handler to select nominee and record category selection
  const handleSelectNominee = (nominee: Nominee) => {
    const isSelf = voterSession && nominee.personId === voterSession.id;
    const selfVoteForbidden = isSelf && !exercise?.allowSelfVote;
    if (selfVoteForbidden || eligibilityStatus?.hasVoted || exercise?.status !== 'open') return;

    const cat = getNomineeCategory(nominee);
    setSelectedNomineeId(nominee.id);
    setCategorySelections((prev) => ({
      ...prev,
      [cat]: nominee.id
    }));
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <div className="w-12 h-12 border-4 border-[#FF8A00] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-[#94A3B8] font-medium">Loading dynamic voting configuration from Firestore...</p>
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center bg-[#1E293B] rounded-2xl border border-[#334155] shadow-lg p-8 mt-8">
        <AlertCircle className="w-12 h-12 text-[#FF8A00] mx-auto mb-4" />
        <h2 className="text-xl font-bold text-[#F8FAFC] mb-2">Voting Exercise Not Found</h2>
        <p className="text-[#94A3B8] mb-6">The requested voting exercise does not exist or has been archived.</p>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF8A00] text-slate-950 font-bold rounded-xl text-sm hover:bg-[#E85B00] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Directory
        </button>
      </div>
    );
  }

  const isOpen = exercise.status === 'open';
  const selectedNominee = nominees.find((n) => n.id === selectedNomineeId);

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 space-y-8 animate-fadeIn">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex items-center justify-between">
        <button
          id="btn-back-to-directory"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to All Exercises
        </button>

        {exercise.resultsPublished && (
          <button
            id="btn-view-published-results"
            onClick={() => onViewResults(exercise.id)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#251464] text-[#FF8A00] border border-[#FF8A00]/40 rounded-xl text-xs font-bold hover:bg-[#251464]/80 transition-all"
          >
            <Award className="w-3.5 h-3.5" /> View Published Results
          </button>
        )}
      </div>

      {/* Dynamic Header Hero Card */}
      <div className="bg-[#1E293B] rounded-2xl border border-[#334155] shadow-xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF8A00]/10 rounded-full blur-3xl -z-0 pointer-events-none"></div>

        <div className="relative z-10 space-y-4">
          {/* Metadata badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {exercise.scopeType && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 font-bold rounded-md border uppercase text-[11px] ${
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
                Scope: {exercise.scopeType === 'church' ? 'Entire Church' : exercise.scopeType === 'workforce' ? 'Entire Workforce' : exercise.scopeType === 'department' ? 'Department' : exercise.scopeType === 'unit' ? 'Unit Scope' : exercise.scopeType === 'custom' ? 'Custom' : 'Organisation'}
              </span>
            )}

            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#334155] text-[#F8FAFC] font-semibold rounded-md border border-[#475569]">
              <Building2 className="w-3.5 h-3.5 text-[#FF8A00]" />
              {exercise.organisationName || 'Church Wide'}
            </span>

            {exercise.departmentName && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#251464] text-[#FF8A00] font-semibold rounded-md border border-[#FF8A00]/30">
                <Layers className="w-3.5 h-3.5 text-[#FF8A00]" />
                {exercise.departmentName}
              </span>
            )}

            {exercise.unitName && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#0e3b43] text-cyan-300 font-semibold rounded-md border border-cyan-500/30">
                <FolderTree className="w-3.5 h-3.5 text-cyan-400" />
                {exercise.unitName}
              </span>
            )}

            <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#334155] text-[#F8FAFC] font-semibold rounded-md border border-[#475569]">
              <Award className="w-3.5 h-3.5 text-[#FF8A00]" />
              {exercise.categoryName || 'Recognition'}
            </span>

            {/* Status Pill */}
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                isOpen
                  ? 'bg-[#FF8A00] text-slate-950'
                  : exercise.status === 'scheduled'
                  ? 'bg-[#251464] text-[#F8FAFC] border border-[#FF8A00]/30'
                  : 'bg-[#334155] text-[#94A3B8]'
              }`}
            >
              {exercise.status}
            </span>
          </div>

          {/* Exercise Title & Description */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-black text-[#F8FAFC] tracking-tight leading-snug">
              {exercise.title}
            </h1>
            {exercise.description && (
              <p className="mt-2 text-sm sm:text-base text-[#94A3B8] leading-relaxed max-w-3xl">
                {exercise.description}
              </p>
            )}
          </div>

          {/* Timing & Rules Summary Bar */}
          <div className="pt-4 border-t border-[#334155] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-[#94A3B8]">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#FF8A00]" />
              <span className="font-medium text-[#F8FAFC]">{timeRemaining || 'Active window'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#FF8A00]" />
              <span>1 Vote Per Verified Church Member</span>
            </div>
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-[#94A3B8]" />
              <span>{exercise.allowSelfVote ? 'Self-voting allowed' : 'Self-voting disabled'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* DEDICATED EXERCISE COUNTDOWN TIMER */}
      <VotingCountdownTimer
        endTime={exercise.endTime}
        startTime={exercise.startTime}
        status={exercise.status}
        onExpire={() => {
          loadData();
        }}
      />

      {/* VISUAL CATEGORY PROGRESS BAR */}
      <div
        id="voting-progress-card"
        className="bg-[#1E293B] rounded-2xl border border-[#334155] shadow-xl p-5 sm:p-6 space-y-4 relative overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                isAllCategoriesCompleted
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-sm shadow-emerald-500/20'
                  : 'bg-[#251464] border-[#FF8A00]/30 text-[#FF8A00]'
              }`}
            >
              {isAllCategoriesCompleted ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : (
                <Layers className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#F8FAFC] font-display">
                  Category Voting Progress
                </h3>
                {isAllCategoriesCompleted && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    All Categories Completed
                  </span>
                )}
              </div>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                {isAllCategoriesCompleted
                  ? 'All categories in this voting exercise have been completed. Your ballot is ready to cast.'
                  : `Tracks completion across all ${totalCategories} ${totalCategories === 1 ? 'category' : 'categories'} in this exercise.`}
              </p>
            </div>
          </div>

          {/* Large Percentage & Count Display */}
          <div className="flex items-baseline sm:items-end sm:flex-col justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800 shrink-0">
            <div className="flex items-baseline gap-2">
              <span
                id="progress-percentage-display"
                className={`text-3xl sm:text-4xl font-black font-display tracking-tight transition-colors ${
                  isAllCategoriesCompleted ? 'text-emerald-400' : 'text-[#FF8A00]'
                }`}
              >
                {progressPercentage}%
              </span>
              <span className="text-xs font-semibold text-[#94A3B8]">Completed</span>
            </div>
            <div className="text-xs text-[#94A3B8] font-medium">
              <span className="text-[#F8FAFC] font-bold">{completedCategoriesCount}</span> of{' '}
              <span className="text-[#F8FAFC] font-bold">{totalCategories}</span>{' '}
              {totalCategories === 1 ? 'Category' : 'Categories'}
            </div>
          </div>
        </div>

        {/* Animated Visual Progress Bar Track */}
        <div className="space-y-1.5">
          <div className="w-full bg-[#0F172A] rounded-full h-4 p-0.5 border border-[#334155] shadow-inner overflow-hidden relative">
            <div
              id="voting-progress-bar-fill"
              className={`h-full rounded-full transition-all duration-500 ease-out shadow-md ${
                isAllCategoriesCompleted
                  ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400'
                  : 'bg-gradient-to-r from-[#FF8A00] via-[#FFA439] to-[#E85B00]'
              }`}
              style={{ width: `${Math.max(progressPercentage, progressPercentage > 0 ? 5 : 0)}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-[#94A3B8] px-1 font-mono">
            <span>0% (Start)</span>
            <span>50%</span>
            <span>100% (Complete)</span>
          </div>
        </div>

        {/* Category Status Chips */}
        <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-[#94A3B8] mr-1">Categories:</span>
          {categoriesList.map((cat, idx) => {
            const isCompleted = isCategoryCompleted(cat);
            const isFiltered = activeCategoryFilter === cat;
            const selectedInCatId = categoriesList.length > 1 ? categorySelections[cat] : selectedNomineeId;
            const selectedNomInCat = nominees.find((n) => n.id === selectedInCatId);

            return (
              <button
                key={cat}
                type="button"
                id={`btn-category-chip-${idx}`}
                onClick={() => {
                  if (categoriesList.length > 1) {
                    setActiveCategoryFilter(activeCategoryFilter === cat ? 'all' : cat);
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                  isCompleted
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                    : 'bg-[#0F172A] border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-slate-600'
                } ${isFiltered ? 'ring-2 ring-[#FF8A00] border-[#FF8A00]' : ''}`}
                title={categoriesList.length > 1 ? `Filter nominees in ${cat}` : undefined}
              >
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                    isCompleted ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {isCompleted ? '✓' : idx + 1}
                </div>
                <span className="font-semibold truncate max-w-[170px]">{cat}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    isCompleted ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isCompleted ? (selectedNomInCat ? selectedNomInCat.displayName.split(' ')[0] : 'Done') : 'Pending'}
                </span>
              </button>
            );
          })}

          {categoriesList.length > 1 && activeCategoryFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setActiveCategoryFilter('all')}
              className="text-[11px] text-[#FF8A00] hover:underline ml-1 font-semibold cursor-pointer"
            >
              Show all categories
            </button>
          )}
        </div>
      </div>

      {/* VOTING CRITERIA SECTION */}
      {criteria.length > 0 && (
        <div className="bg-[#1E293B] rounded-2xl border border-[#334155] shadow-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#FF8A00]" />
              <h2 className="text-base font-bold text-[#F8FAFC] font-display">
                Evaluation Criteria ({criteria.length})
              </h2>
            </div>
            <span className="text-xs text-[#94A3B8]">Configured by Church Administration</span>
          </div>

          <p className="text-xs text-[#94A3B8]">
            Please evaluate nominees according to the standard criteria established for this exercise:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {criteria.map((crit, idx) => (
              <div
                key={crit.id}
                className="p-3.5 bg-[#0F172A] border border-[#334155] rounded-xl flex items-start gap-3"
              >
                <div className="w-6 h-6 rounded-full bg-[#251464] text-[#FF8A00] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#F8FAFC]">{crit.title}</h4>
                  {crit.description && (
                    <p className="text-xs text-[#94A3B8] mt-0.5 leading-relaxed">{crit.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BALLOT WORKSPACE: OFFICIAL NOMINEES & VOTER VERIFICATION */}
      <div id="ballot-workspace" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#F8FAFC] font-display flex items-center gap-2">
              Official Nominees
              {categoriesList.length > 1 && (
                <span className="text-xs font-normal text-[#94A3B8]">
                  ({activeCategoryFilter === 'all' ? 'All Categories' : activeCategoryFilter})
                </span>
              )}
            </h2>
            <p className="text-xs sm:text-sm text-[#94A3B8] mt-0.5">
              Enter your voting code, select your preferred nominee, and cast your ballot in an instant.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#F8FAFC] bg-[#334155] px-3 py-1 rounded-lg">
              {displayedNominees.length} {displayedNominees.length === 1 ? 'Nominee' : 'Nominees'}
            </span>
          </div>
        </div>

        {/* Responsive Grid: Nominees List & Voter Verification Panel side-by-side */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* VOTER IDENTITY VERIFICATION & INSTANT BALLOT PANEL (Next to Nominees) */}
          <div className="order-1 lg:order-2 lg:col-span-5 xl:col-span-4 lg:sticky lg:top-4 space-y-4">
            <div
              id="voter-verification-panel"
              className="bg-[#1E293B] text-[#F8FAFC] rounded-2xl p-5 sm:p-6 shadow-xl border border-[#334155] space-y-4 relative overflow-hidden"
            >
              {/* Top Accent Gradient Line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF8A00] via-[#FFA439] to-[#E85B00]" />

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#251464] border border-[#FF8A00]/40 flex items-center justify-center text-[#FF8A00] shrink-0 mt-0.5 shadow-sm">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-[#F8FAFC]">Voter Identity Verification</h3>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    {voterSession
                      ? `Verified as ${voterSession.fullName}`
                      : 'Enter your voting code to cast in an instant'}
                  </p>
                </div>
              </div>

              {/* Status / Code Form */}
              {voterSession ? (
                <div className="p-3.5 bg-[#0F172A] rounded-xl border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verified Member</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-[#FF8A00] bg-[#251464] px-2 py-0.5 rounded border border-[#FF8A00]/30">
                      {voterSession.voterCode}
                    </span>
                  </div>

                  <div className="text-xs text-[#F8FAFC] font-medium break-words">
                    {voterSession.fullName}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#94A3B8] pt-1 border-t border-slate-800">
                    <span>
                      {eligibilityStatus?.hasVoted ? (
                        <span className="text-amber-400 font-semibold">Ballot Already Cast</span>
                      ) : (
                        <span className="text-emerald-400 font-semibold">Eligible to Cast Vote</span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={clearVoterSession}
                      className="text-xs text-[#94A3B8] hover:text-[#F8FAFC] underline underline-offset-2 cursor-pointer"
                    >
                      Change Code
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <form onSubmit={handleVerifyVoterCode} className="space-y-2">
                    <label className="block text-xs font-semibold text-[#94A3B8]">
                      Your Unique Voter Code
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="input-voter-unique-code"
                        placeholder="e.g. VOTE-XXXXXX"
                        value={inputVoterCode}
                        onChange={(e) => {
                          setInputVoterCode(e.target.value.toUpperCase());
                          setCodeError('');
                        }}
                        className="w-full px-3.5 py-2.5 bg-[#0F172A] border border-[#475569] rounded-xl text-xs font-mono uppercase text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#FF8A00] transition-colors tracking-wider"
                      />
                    </div>
                  </form>

                  <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                    Enter your code, select a nominee, and click <strong className="text-[#FF8A00]">Cast Vote in an Instant</strong> below.
                  </p>
                </div>
              )}

              {codeError && (
                <div className="text-xs text-rose-400 flex items-center gap-1.5 p-2.5 bg-rose-950/40 rounded-xl border border-rose-800/60">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{codeError}</span>
                </div>
              )}

              {/* INSTANT CAST VOTE ACTION PANEL */}
              {!eligibilityStatus?.hasVoted && isOpen && (
                <div className="pt-3 border-t border-slate-700/80 space-y-3">
                  <div className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
                    <Vote className="w-3.5 h-3.5 text-[#FF8A00]" />
                    <span>Instant Ballot Submission</span>
                  </div>

                  {selectedNominee ? (
                    <div className="p-3.5 bg-[#0F172A] rounded-xl border border-[#FF8A00]/40 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-[#251464] border border-[#FF8A00]/40 overflow-hidden shrink-0">
                          {selectedNominee.photoUrl ? (
                            <img
                              src={selectedNominee.photoUrl}
                              alt={selectedNominee.displayName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-[#FF8A00] text-base">
                              {selectedNominee.displayName.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] text-[#FF8A00] font-semibold">Selected Nominee:</div>
                          <div className="text-sm font-bold text-[#F8FAFC] break-words whitespace-normal leading-snug">
                            {selectedNominee.displayName}
                          </div>
                          <div className="text-[10px] text-[#94A3B8] mt-0.5">
                            {getNomineeCategory(selectedNominee)}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        id="btn-instant-vote-side"
                        disabled={isSubmitting || verifyingCode}
                        onClick={() => handleInstantVote(selectedNominee)}
                        className="w-full py-3 px-4 bg-gradient-to-r from-[#FF8A00] to-[#E85B00] hover:from-[#E85B00] hover:to-[#FF8A00] text-white font-black text-sm rounded-xl transition-all shadow-lg hover:shadow-[#FF8A00]/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <Zap className="w-4 h-4 fill-current text-white" />
                        <span>
                          {isSubmitting
                            ? 'Casting Vote...'
                            : voterSession
                            ? 'Cast Vote in an Instant'
                            : 'Enter Code & Cast Vote'}
                        </span>
                      </button>

                      <div className="text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setHasReviewedSelection(false);
                            setShowConfirmModal(true);
                          }}
                          className="text-[11px] text-[#94A3B8] hover:text-[#F8FAFC] underline cursor-pointer"
                        >
                          Review details before voting
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-[#0F172A] rounded-xl border border-dashed border-[#334155] text-center space-y-1">
                      <p className="text-xs font-medium text-[#F8FAFC]">No nominee selected yet</p>
                      <p className="text-[11px] text-[#94A3B8]">
                        Tap any candidate card on the ballot to select them and cast your vote in an instant.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* OFFICIAL NOMINEES LIST (Beside Verification on desktop, below on mobile) */}
          <div className="order-2 lg:order-1 lg:col-span-7 xl:col-span-8 space-y-4">
            {/* Category Filter Tabs (if multi-category) */}
            {categoriesList.length > 1 && (
              <div className="flex flex-wrap items-center gap-2 pb-1 border-b border-slate-800">
                <button
                  type="button"
                  id="btn-filter-all-categories"
                  onClick={() => setActiveCategoryFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeCategoryFilter === 'all'
                      ? 'bg-[#FF8A00] text-slate-950 shadow-md shadow-[#FF8A00]/20'
                      : 'bg-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#334155]'
                  }`}
                >
                  All Categories ({nominees.length})
                </button>
                {categoriesList.map((cat) => {
                  const isCatDone = isCategoryCompleted(cat);
                  const isAct = activeCategoryFilter === cat;
                  const countInCat = nominees.filter((n) => getNomineeCategory(n) === cat).length;

                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategoryFilter(cat)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                        isAct
                          ? 'bg-[#251464] text-[#FF8A00] border border-[#FF8A00]'
                          : 'bg-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#334155]'
                      }`}
                    >
                      <span className="truncate max-w-[140px]">{cat}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 font-mono">
                        {countInCat}
                      </span>
                      {isCatDone && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {displayedNominees.length === 0 ? (
              <div className="bg-[#1E293B] rounded-2xl border border-dashed border-[#334155] p-8 text-center text-[#94A3B8] text-sm">
                No active nominees found for the selected category filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {displayedNominees.map((nominee) => {
                  const nomineeCat = getNomineeCategory(nominee);
                  const isSelected = categoriesList.length > 1
                    ? categorySelections[nomineeCat] === nominee.id
                    : selectedNomineeId === nominee.id;
                  const isSelf = voterSession && nominee.personId === voterSession.id;
                  const selfVoteForbidden = isSelf && !exercise.allowSelfVote;

                  return (
                    <div
                      key={nominee.id}
                      id={`nominee-card-${nominee.id}`}
                      onClick={() => {
                        if (selfVoteForbidden || eligibilityStatus?.hasVoted || !isOpen) return;
                        handleSelectNominee(nominee);
                      }}
                      className={`relative p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer select-none bg-[#1E293B] flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#FF8A00] ring-2 ring-[#FF8A00]/30 shadow-lg bg-[#251464]/20'
                          : 'border-[#334155] hover:border-[#FF8A00]/50 hover:shadow-sm'
                      } ${
                        selfVoteForbidden || eligibilityStatus?.hasVoted || !isOpen
                          ? 'opacity-60 cursor-not-allowed'
                          : ''
                      }`}
                    >
                      <div className="flex items-start gap-3 sm:gap-4">
                        {/* Nominee Photo or Avatar */}
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#334155] border border-[#475569] overflow-hidden shrink-0">
                          {nominee.photoUrl ? (
                            <img
                              src={nominee.photoUrl}
                              alt={nominee.displayName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-display font-bold text-[#FF8A00] text-xl bg-[#251464]">
                              {nominee.displayName.charAt(0)}
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm sm:text-base font-bold text-[#F8FAFC] break-words whitespace-normal leading-snug">
                              {nominee.displayName}
                            </h3>

                            {/* Custom Radio Button */}
                            <div
                              className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors shrink-0 mt-0.5 ${
                                isSelected
                                  ? 'border-[#FF8A00] bg-[#FF8A00] text-slate-950 font-bold'
                                  : 'border-[#475569] bg-[#334155]'
                              }`}
                            >
                              {isSelected && <CheckCircle2 className="w-4 h-4 stroke-[3]" />}
                            </div>
                          </div>

                          {/* Category and Department Badges */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#251464] text-[#FF8A00] border border-[#FF8A00]/30 text-[10px] font-bold">
                              {nomineeCat}
                            </span>
                            {(nominee.roleOrTitle || nominee.department) && (
                              <span className="text-xs text-[#94A3B8] break-words whitespace-normal">
                                {[nominee.roleOrTitle, nominee.department].filter(Boolean).join(' • ')}
                              </span>
                            )}
                          </div>

                          {nominee.bio && (
                            <p className="text-xs text-[#94A3B8] mt-2 line-clamp-3 leading-relaxed">
                              {nominee.bio}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Instant Vote Action inside Candidate Card when Selected */}
                      {isSelected && !eligibilityStatus?.hasVoted && isOpen && (
                        <div className="mt-3 pt-3 border-t border-[#FF8A00]/30 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[#FF8A00] flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Selected
                          </span>
                          <button
                            type="button"
                            id={`btn-instant-vote-card-${nominee.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInstantVote(nominee);
                            }}
                            disabled={isSubmitting || verifyingCode}
                            className="px-3.5 py-1.5 bg-gradient-to-r from-[#FF8A00] to-[#E85B00] hover:from-[#E85B00] hover:to-[#FF8A00] text-white font-black rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Zap className="w-3.5 h-3.5 fill-current text-white" />
                            {isSubmitting ? 'Casting...' : 'Vote in an Instant'}
                          </button>
                        </div>
                      )}

                      {/* Badges and Warnings */}
                      {selfVoteForbidden && (
                        <div className="mt-3 pt-2 border-t border-[#334155] text-[11px] text-amber-400 flex items-center gap-1 font-medium">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Self-voting is disabled for this exercise
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SUBMISSION & FEEDBACK BANNER */}
      {submissionResult && (
        <div
          className={`p-6 rounded-2xl border ${
            submissionResult.success
              ? 'bg-[#251464]/60 border-[#FF8A00] text-[#F8FAFC]'
              : 'bg-rose-950/60 border-rose-600 text-rose-200'
          } animate-fadeIn space-y-2`}
        >
          <div className="flex items-center gap-2 font-bold text-base">
            {submissionResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-[#FF8A00]" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400" />
            )}
            <span>{submissionResult.message}</span>
          </div>

          {submissionResult.receiptHash && (
            <div className="mt-3 p-3 bg-[#0F172A] rounded-xl border border-[#334155] text-xs font-mono flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <span className="text-[#94A3B8] font-sans">Official Verification Receipt: </span>
                <span className="font-bold text-[#FF8A00]">{submissionResult.receiptHash}</span>
              </div>
              <div className="text-[#94A3B8] text-[11px]">
                {new Date(submissionResult.timestamp || '').toLocaleString()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ALREADY VOTED STATE */}
      {eligibilityStatus?.hasVoted && !submissionResult && (
        <div className="bg-[#251464]/50 border border-[#FF8A00]/40 rounded-2xl p-6 text-[#F8FAFC] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-[#FF8A00] shrink-0" />
            <div>
              <h4 className="text-sm font-bold">You have already submitted your vote for this exercise</h4>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Thank you for participating. In accordance with church policy, votes cannot be changed.
              </p>
            </div>
          </div>

          {exercise.resultsPublished && (
            <button
              onClick={() => onViewResults(exercise.id)}
              className="px-4 py-2 bg-gradient-to-r from-[#FF8A00] to-[#E85B00] hover:from-[#E85B00] hover:to-[#FF8A00] text-white font-bold rounded-xl text-xs transition-colors shrink-0"
            >
              View Results
            </button>
          )}
        </div>
      )}

      {/* FINAL VOTE ACTION BAR */}
      {!eligibilityStatus?.hasVoted && (
        <div className="sticky bottom-4 z-40 bg-[#1E293B]/95 backdrop-blur-md p-4 rounded-2xl border border-[#334155] shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-[#94A3B8] space-y-1">
            <div className="flex items-center gap-2">
              <span className={`font-bold ${isAllCategoriesCompleted ? 'text-emerald-400' : 'text-[#FF8A00]'}`}>
                {progressPercentage}% Completed
              </span>
              <span>•</span>
              <span>
                {completedCategoriesCount} of {totalCategories} {totalCategories === 1 ? 'category' : 'categories'} selected
              </span>
            </div>
            <div>
              {selectedNominee ? (
                <span>
                  Active Selection:{' '}
                  <strong className="text-[#F8FAFC] font-bold">{selectedNominee.displayName}</strong>
                </span>
              ) : (
                <span className="text-[#94A3B8]">Please select your candidate from the ballot above</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              id="btn-submit-vote"
              data-testid="btn-open-submit-modal"
              disabled={!isOpen || !selectedNomineeId || isSubmitting || (categoriesList.length > 1 && !isAllCategoriesCompleted)}
              onClick={() => handleInstantVote()}
              className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-[#FF8A00] to-[#E85B00] hover:from-[#E85B00] hover:to-[#FF8A00] text-white rounded-xl text-sm font-black tracking-wide transition-all shadow-lg hover:shadow-[#FF8A00]/25 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-current text-white" />
              <span>{isSubmitting ? 'Casting Vote...' : 'Cast Vote in an Instant'}</span>
            </button>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL WITH SELECTION REVIEW */}
      {showConfirmModal && selectedNominee && voterSession && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#1E293B] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#334155] space-y-5 animate-scaleUp text-[#F8FAFC] my-8">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-700/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#251464] text-[#FF8A00] border border-[#FF8A00]/40 flex items-center justify-center shrink-0 shadow-inner">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#F8FAFC] font-display">Review & Confirm Your Vote</h3>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    Please review your selection before submitting. This vote cannot be modified once cast.
                  </p>
                </div>
              </div>
            </div>

            {/* Candidate Review Card */}
            <div className="space-y-3">
              <div className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#FF8A00]" />
                <span>Selected Candidate Review</span>
              </div>

              <div className="p-4 bg-[#0F172A] rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-[#0F172A] to-[#0F172A] space-y-3">
                <div className="flex items-center gap-3.5">
                  {selectedNominee.photoUrl ? (
                    <img
                      src={selectedNominee.photoUrl}
                      alt={selectedNominee.displayName}
                      className="w-14 h-14 rounded-xl object-cover border-2 border-[#FF8A00]/50 shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#251464] to-[#3a1d94] border-2 border-[#FF8A00]/40 text-[#FF8A00] font-black text-xl flex items-center justify-center shrink-0">
                      {selectedNominee.displayName.charAt(0)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-black text-[#F8FAFC] break-words whitespace-normal leading-tight">
                        {selectedNominee.displayName}
                      </h4>
                      <span className="px-2 py-0.5 rounded-md bg-[#251464] text-[#FF8A00] border border-[#FF8A00]/30 text-[10px] font-bold">
                        {getNomineeCategory(selectedNominee)}
                      </span>
                    </div>

                    {(selectedNominee.roleOrTitle || selectedNominee.department || selectedNominee.unit) && (
                      <p className="text-xs text-[#94A3B8] mt-0.5 break-words whitespace-normal">
                        {[selectedNominee.roleOrTitle, selectedNominee.department, selectedNominee.unit]
                          .filter(Boolean)
                          .join(' • ')}
                      </p>
                    )}
                  </div>
                </div>

                {selectedNominee.bio && (
                  <p className="text-xs text-slate-300/90 italic bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 line-clamp-2">
                    "{selectedNominee.bio}"
                  </p>
                )}
              </div>
            </div>

            {/* Multi-Category Breakdown (if applicable) */}
            {categoriesList.length > 1 && (
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#FF8A00]" />
                  <span>All Category Choices ({categoriesList.length})</span>
                </div>
                <div className="p-3 bg-[#0F172A] rounded-xl border border-slate-800 space-y-1.5 max-h-36 overflow-y-auto">
                  {categoriesList.map((cat) => {
                    const selId = categorySelections[cat];
                    const selNom = nominees.find((n) => n.id === selId);
                    return (
                      <div key={cat} className="flex justify-between items-center py-1 border-b border-slate-800/60 text-xs last:border-0">
                        <span className="text-[#94A3B8] truncate max-w-[180px] font-medium">{cat}:</span>
                        <span className="font-bold text-[#FF8A00] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          {selNom ? selNom.displayName : '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Exercise & Voter Audit Details */}
            <div className="p-3.5 bg-[#0F172A] rounded-xl border border-[#334155] space-y-2 text-xs">
              <div className="flex justify-between text-[#94A3B8]">
                <span>Voting Exercise:</span>
                <span className="font-semibold text-[#F8FAFC] truncate max-w-[240px]">{exercise.title}</span>
              </div>
              <div className="flex justify-between text-[#94A3B8]">
                <span>Verified Church Member:</span>
                <span className="font-semibold text-[#F8FAFC]">{voterSession.fullName}</span>
              </div>
              <div className="flex justify-between text-[#94A3B8] font-mono">
                <span>Voter Authorization Code:</span>
                <span className="font-bold text-[#FF8A00]">{voterSession.voterCode}</span>
              </div>
            </div>

            {/* Mandatory Review & Confirmation Checkbox */}
            <label
              htmlFor="checkbox-confirm-review"
              className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                hasReviewedSelection
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-slate-100'
                  : 'bg-[#0F172A] border-slate-700 hover:border-slate-600 text-slate-300'
              }`}
            >
              <input
                type="checkbox"
                id="checkbox-confirm-review"
                checked={hasReviewedSelection}
                onChange={(e) => setHasReviewedSelection(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-[#FF8A00] focus:ring-[#FF8A00] border-slate-600 bg-slate-800 cursor-pointer"
              />
              <div className="text-xs space-y-0.5">
                <span className="font-bold text-[#F8FAFC]">
                  I have reviewed my selection above and confirm this is my final official vote.
                </span>
                <p className="text-[11px] text-[#94A3B8]">
                  I acknowledge that once submitted, this vote will be written permanently to Firestore and cannot be amended.
                </p>
              </div>
            </label>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowConfirmModal(false)}
                className="w-full sm:w-auto px-4 py-2.5 text-[#94A3B8] hover:text-[#F8FAFC] text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors text-center"
              >
                Cancel & Edit Selection
              </button>

              <button
                id="btn-confirm-final-vote"
                type="button"
                disabled={isSubmitting || !hasReviewedSelection}
                onClick={handleConfirmVote}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-[#FF8A00] to-[#E85B00] hover:from-[#E85B00] hover:to-[#FF8A00] text-white rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                title={!hasReviewedSelection ? 'Please check the review confirmation box first' : undefined}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Recording Vote...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Submit Vote</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
