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
  ShieldAlert,
  ShieldCheck,
  CheckSquare,
  Square,
  Zap,
  Loader2,
  X
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

  // Selected Nominee (for single_choice mode)
  const [selectedNomineeId, setSelectedNomineeId] = useState<string>('');

  // Rating Scale Scores (for rating_scale mode: nomineeId -> score 5 to 10)
  const [nomineeScores, setNomineeScores] = useState<Record<string, number>>({});

  // Category selections & filter tracking for multi-category and single-category exercises
  const [categorySelections, setCategorySelections] = useState<Record<string, string>>({});
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');

  // Voter Code Verification Input (if not already verified)
  const [inputVoterCode, setInputVoterCode] = useState<string>('');
  const [codeError, setCodeError] = useState<string>('');
  const [verifyingCode, setVerifyingCode] = useState<boolean>(false);
  const [showVoterCodePromptModal, setShowVoterCodePromptModal] = useState<boolean>(false);

  const { success: toastSuccess, error: toastError } = useToast();

  // Robust effective voter resolution
  const effectiveVoter = useMemo(() => {
    if (voterSession) return voterSession;
    try {
      const stored = localStorage.getItem('church_voter_session');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      // ignore
    }
    return null;
  }, [voterSession]);

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
      if (effectiveVoter && ex) {
        const el = await checkVoterEligibility(ex.id, effectiveVoter.id);
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
  }, [exerciseId, effectiveVoter?.id]);

  // Check URL parameters for voterCode auto-filling & verification
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const codeParam = params.get('code') || params.get('voterCode') || params.get('v');
      if (codeParam && !effectiveVoter) {
        const clean = codeParam.trim().toUpperCase();
        setInputVoterCode(clean);
        (async () => {
          setVerifyingCode(true);
          const res = await authenticateWithVoterCode(clean);
          setVerifyingCode(false);
          if (res.success && res.person && exercise) {
            const el = await checkVoterEligibility(exercise.id, res.person.id, true);
            setEligibilityStatus(el);
          }
        })();
      }
    } catch (e) {
      // ignore
    }
  }, [exercise?.id, effectiveVoter]);

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
    const rawCode = inputVoterCode.trim().toUpperCase();
    if (!rawCode) {
      setCodeError('Please enter your unique voter code.');
      return;
    }
    setCodeError('');

    // If single-choice mode and a nominee is already selected, proceed to vote ASAP in one action!
    if (!isRatingScale && selectedNominee) {
      await handleInstantVote(selectedNominee);
      return;
    }

    setVerifyingCode(true);
    const res = await authenticateWithVoterCode(rawCode);
    setVerifyingCode(false);

    if (!res.success || !res.person) {
      setCodeError(res.message || 'Invalid voter code.');
      toastError('Verification Failed', res.message || 'Invalid voter code.');
    } else if (res.person && exercise) {
      const el = await checkVoterEligibility(exercise.id, res.person.id, true);
      setEligibilityStatus(el);
      if (!el.eligible) {
        setCodeError('This member code is not registered as eligible for this exercise.');
        toastError('Not Eligible', 'This member code is not registered as eligible for this exercise.');
      } else if (el.hasVoted) {
        setCodeError('This member code has already submitted a ballot for this exercise.');
        toastError('Already Voted', 'This member code has already submitted a ballot for this exercise.');
      } else {
        if (isRatingScale) {
          toastSuccess('Code Verified!', `Welcome ${res.person.fullName}. Your voter identity is verified.`);
          if (isAllScoresCompleted) {
            setHasReviewedSelection(false);
            setShowConfirmModal(true);
          }
        } else {
          toastSuccess('Code Verified!', 'Your code is confirmed. Tap your preferred nominee below to cast your vote ASAP.');
        }
      }
    }
  };

  // Handle actual vote submission
  const handleConfirmVote = async () => {
    if (!exercise || !selectedNomineeId || !voterSession) return;

    const chosenNominee = nominees.find((n) => n.id === selectedNomineeId);
    if (chosenNominee?.excludedVoterIds?.includes(voterSession.id)) {
      toastError('Voting Restricted', `Under governance recusal rules, you are restricted from voting for "${chosenNominee.displayName}".`);
      return;
    }

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
      if (targetNominee.excludedVoterIds && targetNominee.excludedVoterIds.includes(voterSession.id)) {
        toastError('Voting Restricted', `Under governance recusal rules, you are restricted from voting for "${targetNominee.displayName}".`);
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
      if (targetNominee.excludedVoterIds && targetNominee.excludedVoterIds.includes(authRes.person.id)) {
        toastError('Voting Restricted', `Under governance recusal rules, you are restricted from voting for "${targetNominee.displayName}".`);
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
  const categoriesList = useMemo<string[]>(() => {
    if (!exercise) return [];

    // 1. If exercise explicitly has categories defined
    if (Array.isArray((exercise as any).categories) && (exercise as any).categories.length > 0) {
      return (exercise as any).categories
        .map((c: any) => (typeof c === 'string' ? c.trim() : c.name || c.title))
        .filter(Boolean) as string[];
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
    return categoriesList.filter((c: string) => !!categorySelections[c]).length;
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
    const isSelf = effectiveVoter && nominee.personId === effectiveVoter.id;
    const selfVoteForbidden = isSelf && !exercise?.allowSelfVote;
    if (selfVoteForbidden || eligibilityStatus?.hasVoted || exercise?.status !== 'open') return;

    if (effectiveVoter && nominee.excludedVoterIds && nominee.excludedVoterIds.includes(effectiveVoter.id)) {
      toastError('Voting Restricted', `Under governance recusal rules, you are restricted from voting for "${nominee.displayName}".`);
      return;
    }

    const cat = getNomineeCategory(nominee);
    setSelectedNomineeId(nominee.id);
    setCategorySelections((prev) => ({
      ...prev,
      [cat]: nominee.id
    }));
  };

  // --- RATING SCALE LOGIC (e.g. 5 to 10 points per nominee, self-vote barred) ---
  const isRatingScale = exercise?.votingMode === 'rating_scale';
  const minScore = exercise?.minScore ?? 5;
  const maxScore = exercise?.maxScore ?? 10;

  // Detect if current authenticated voter is one of the nominees
  const currentVoterNominee = useMemo(() => {
    if (!effectiveVoter) return null;
    return nominees.find(
      (n) => n.personId === effectiveVoter.id ||
        (n.displayName && effectiveVoter.fullName && n.displayName.trim().toLowerCase() === effectiveVoter.fullName.trim().toLowerCase())
    );
  }, [effectiveVoter, nominees]);

  // Check nominees for which this voter is explicitly restricted / recused
  const restrictedNomineesForVoter = useMemo(() => {
    if (!effectiveVoter) return [];
    return nominees.filter((n) => n.excludedVoterIds && n.excludedVoterIds.includes(effectiveVoter.id));
  }, [effectiveVoter, nominees]);

  // Evaluatable nominees (excludes the voter's own nomination AND any nominees for which this voter is restricted/recused)
  const evaluatableNominees = useMemo(() => {
    return nominees.filter((n) => {
      // 1. Self-nomination restriction
      if (currentVoterNominee && n.id === currentVoterNominee.id) return false;
      // 2. Specific voter exclusion / recusal rule
      if (effectiveVoter && n.excludedVoterIds && n.excludedVoterIds.includes(effectiveVoter.id)) {
        return false;
      }
      return true;
    });
  }, [nominees, currentVoterNominee, effectiveVoter]);

  // How many eligible candidates have received valid scores
  const scoredCandidatesCount = useMemo(() => {
    return evaluatableNominees.filter((n) => {
      const sc = nomineeScores[n.id];
      return typeof sc === 'number' && sc >= minScore && sc <= maxScore;
    }).length;
  }, [evaluatableNominees, nomineeScores, minScore, maxScore]);

  const isAllScoresCompleted = evaluatableNominees.length > 0 && scoredCandidatesCount === evaluatableNominees.length;

  const averageScoreGiven = useMemo(() => {
    const scoresArr = Object.values(nomineeScores).filter((s) => typeof s === 'number' && s >= minScore && s <= maxScore);
    if (scoresArr.length === 0) return 0;
    const sum = scoresArr.reduce((a, b) => a + b, 0);
    return Number((sum / scoresArr.length).toFixed(1));
  }, [nomineeScores, minScore, maxScore]);

  // Handler to set score for a nominee
  const handleSetNomineeScore = (nomineeId: string, score: number) => {
    if (eligibilityStatus?.hasVoted || exercise?.status !== 'open') return;
    if (currentVoterNominee && nomineeId === currentVoterNominee.id) return;
    if (effectiveVoter) {
      const targetNom = nominees.find((n) => n.id === nomineeId);
      if (targetNom?.excludedVoterIds?.includes(effectiveVoter.id)) {
        toastError('Voting Restricted', `You are restricted from evaluating "${targetNom.displayName}".`);
        return;
      }
    }
    setNomineeScores((prev) => ({
      ...prev,
      [nomineeId]: score
    }));
  };

  // Dedicated handler to initiate score ballot review & submission for rating scale exercises
  const handleInitiateScoreSubmission = async () => {
    if (!exercise) return;
    if (exercise.status !== 'open') {
      toastError('Voting Closed', 'This voting exercise is currently closed.');
      return;
    }
    if (eligibilityStatus?.hasVoted) {
      toastError('Already Voted', 'You have already submitted a ballot for this exercise.');
      return;
    }

    if (!isAllScoresCompleted) {
      toastError(
        'Incomplete Rating Ballot',
        `Please rate all ${evaluatableNominees.length} eligible candidates before submitting (${scoredCandidatesCount}/${evaluatableNominees.length} scored).`
      );
      return;
    }

    // Path 1: Voter is already authenticated
    if (effectiveVoter) {
      setHasReviewedSelection(false);
      setShowConfirmModal(true);
      return;
    }

    // Path 2: Voter has typed code in inputVoterCode but hasn't verified
    const rawCode = inputVoterCode.trim().toUpperCase();
    if (rawCode) {
      setVerifyingCode(true);
      setCodeError('');
      try {
        const authRes = await authenticateWithVoterCode(rawCode);
        if (!authRes.success || !authRes.person) {
          const err = authRes.message || 'Invalid voter authorization code. Please verify your code.';
          setCodeError(err);
          toastError('Verification Failed', err);
          const el = document.getElementById('input-voter-unique-code');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.focus();
          }
          return;
        }

        const el = await checkVoterEligibility(exercise.id, authRes.person.id, true);
        setEligibilityStatus(el);

        if (!el.eligible) {
          const msg = 'This member code is not registered as an eligible voter for this exercise.';
          setCodeError(msg);
          toastError('Not Eligible', msg);
          return;
        }

        if (el.hasVoted) {
          const msg = 'This member code has already submitted a ballot for this exercise.';
          setCodeError(msg);
          toastError('Already Voted', msg);
          return;
        }

        toastSuccess('Identity Verified!', `Welcome ${authRes.person.fullName}. Opening your rating ballot review.`);
        setHasReviewedSelection(false);
        setShowConfirmModal(true);
      } catch (err: any) {
        setCodeError(err.message || 'Error verifying voter code.');
        toastError('Verification Error', err.message || 'Error verifying voter code.');
      } finally {
        setVerifyingCode(false);
      }
      return;
    }

    // Path 3: No code entered yet -> Open the prompt modal to enter voter code smoothly
    setCodeError('');
    setShowVoterCodePromptModal(true);
  };

  // Handler for score ballot submission
  const handleConfirmScoreBallot = async () => {
    const voter = effectiveVoter;
    if (!exercise || !voter) return;

    const unScored = evaluatableNominees.filter((n) => {
      const sc = nomineeScores[n.id];
      return typeof sc !== 'number' || sc < minScore || sc > maxScore;
    });

    if (unScored.length > 0) {
      toastError(
        'Incomplete Rating Ballot',
        `Please assign a score (between ${minScore} and ${maxScore}) to all ${evaluatableNominees.length} eligible candidates.`
      );
      return;
    }

    // Filter scores strictly to evaluatable nominees (excludes self-nominee and recused candidates)
    const validScores: Record<string, number> = {};
    evaluatableNominees.forEach((n) => {
      if (typeof nomineeScores[n.id] === 'number') {
        validScores[n.id] = nomineeScores[n.id];
      }
    });

    setIsSubmitting(true);
    try {
      const res = await submitVote(
        exercise.id,
        validScores,
        {
          personId: voter.id,
          voterName: voter.fullName,
          voterCode: voter.voterCode,
          voterEmail: voter.email
        },
        { scores: validScores }
      );

      setSubmissionResult(res);
      setShowConfirmModal(false);

      if (res.success) {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
        setEligibilityStatus({ eligible: true, hasVoted: true });
        toastSuccess(
          'Evaluation Ballot Recorded!',
          `Your rating evaluation for ${evaluatableNominees.length} candidates in "${exercise.title}" has been securely recorded. (Receipt: ${res.receiptHash || voter.voterCode})`,
          8000
        );
      } else {
        toastError('Submission Failed', res.message || 'We were unable to record your evaluation ballot.');
      }
    } catch (err: any) {
      toastError('Submission Error', err.message || 'A network error occurred while submitting your scores.');
      setSubmissionResult({
        success: false,
        code: 'ERROR',
        message: err.message || 'Submission failed.'
      });
    } finally {
      setIsSubmitting(false);
    }
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
          {categoriesList.map((cat: string, idx: number) => {
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
            {criteria.map((crit: Criterion, idx: number) => (
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
              {isRatingScale && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Rating Scale ({minScore}–{maxScore} pts)
                </span>
              )}
              {categoriesList.length > 1 && (
                <span className="text-xs font-normal text-[#94A3B8]">
                  ({activeCategoryFilter === 'all' ? 'All Categories' : activeCategoryFilter})
                </span>
              )}
            </h2>
            <p className="text-xs sm:text-sm text-[#94A3B8] mt-0.5">
              {isRatingScale
                ? `Evaluate each candidate with ${minScore} (lowest) to ${maxScore} (highest). Nominees cannot rate themselves.`
                : 'Enter your voting code, select your preferred nominee, and cast your ballot in an instant.'}
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
                    {effectiveVoter
                      ? `Verified as ${effectiveVoter.fullName}`
                      : 'Enter your voting code to cast in an instant'}
                  </p>
                </div>
              </div>

              {/* Status / Code Form */}
              {effectiveVoter ? (
                <div className="p-3.5 bg-[#0F172A] rounded-xl border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verified Member</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-[#FF8A00] bg-[#251464] px-2 py-0.5 rounded border border-[#FF8A00]/30">
                      {effectiveVoter.voterCode}
                    </span>
                  </div>

                  <div className="text-xs text-[#F8FAFC] font-medium break-words">
                    {effectiveVoter.fullName}
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
                    <div className="flex gap-2">
                      <input
                        type="text"
                        id="input-voter-unique-code"
                        placeholder="e.g. VOTE-XXXXXX"
                        value={inputVoterCode}
                        onChange={(e) => {
                          setInputVoterCode(e.target.value.toUpperCase());
                          setCodeError('');
                        }}
                        className="flex-1 min-w-0 px-3.5 py-2.5 bg-[#0F172A] border border-[#475569] rounded-xl text-xs font-mono uppercase text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#FF8A00] transition-colors tracking-wider"
                      />
                      <button
                        type="submit"
                        id="btn-verify-voter-code"
                        disabled={verifyingCode || !inputVoterCode.trim()}
                        className="px-3.5 py-2.5 bg-gradient-to-r from-[#FF8A00] to-amber-500 hover:from-[#E85B00] hover:to-amber-600 text-slate-950 font-black text-xs rounded-xl transition-all shadow disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                        title="Verify your unique voter code"
                      >
                        {verifyingCode ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span>{verifyingCode ? 'Verifying...' : 'Verify'}</span>
                      </button>
                    </div>
                  </form>

                  <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                    {isRatingScale
                      ? `Enter your code, evaluate the candidates with a score between ${minScore} and ${maxScore}, and submit your ballot.`
                      : 'Enter your code, select a nominee, and click Cast Vote in an Instant below.'}
                  </p>
                </div>
              )}

              {codeError && (
                <div className="text-xs text-rose-400 flex items-center gap-1.5 p-2.5 bg-rose-950/40 rounded-xl border border-rose-800/60">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{codeError}</span>
                </div>
              )}

              {/* RATING SCALE BALLOT SUBMISSION PANEL */}
              {isRatingScale ? (
                !eligibilityStatus?.hasVoted && isOpen && (
                  <div className="pt-3 border-t border-slate-700/80 space-y-3">
                    <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Workforce Evaluation Ballot</span>
                    </div>

                    <div className="p-3.5 bg-[#0F172A] rounded-xl border border-amber-500/40 space-y-3">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">Evaluation Progress:</span>
                          <span className="font-bold text-white">
                            {scoredCandidatesCount} of {evaluatableNominees.length} Scored
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-[#FF8A00] to-amber-400 h-full transition-all duration-300"
                            style={{
                              width: `${Math.round((scoredCandidatesCount / Math.max(evaluatableNominees.length, 1)) * 100)}%`
                            }}
                          />
                        </div>
                      </div>

                      {scoredCandidatesCount > 0 && (
                        <div className="flex justify-between items-center text-xs text-slate-300 pt-1 border-t border-slate-800">
                          <span className="text-slate-400">Average Rating Given:</span>
                          <span className="font-bold text-amber-300 font-mono">
                            {averageScoreGiven} / {maxScore} pts
                          </span>
                        </div>
                      )}

                      {currentVoterNominee && (
                        <div className="text-[11px] text-amber-300 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 leading-relaxed">
                          ✓ <strong>Self-Vote Excluded:</strong> As a candidate in this cycle, your own rating is barred per integrity rules. You evaluate your fellow nominees.
                        </div>
                      )}

                      {restrictedNomineesForVoter.length > 0 && (
                        <div className="text-[11px] text-rose-300 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20 leading-relaxed flex items-center gap-2">
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span><strong>Recusal Notice:</strong> You are restricted from voting for {restrictedNomineesForVoter.length} candidate(s) under governance policy. Only the remaining {evaluatableNominees.length} eligible candidates are required on your ballot.</span>
                        </div>
                      )}

                      <button
                        type="button"
                        id="btn-submit-score-ballot"
                        disabled={isSubmitting || verifyingCode || !isAllScoresCompleted}
                        onClick={handleInitiateScoreSubmission}
                        className="w-full py-3 px-4 bg-gradient-to-r from-[#FF8A00] to-amber-500 hover:from-[#E85B00] hover:to-amber-600 text-slate-950 font-black text-sm rounded-xl transition-all shadow-lg hover:shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Sparkles className="w-4 h-4 fill-slate-950" />
                        <span>
                          {isSubmitting
                            ? 'Submitting Ballot...'
                            : verifyingCode
                            ? 'Verifying Code...'
                            : !isAllScoresCompleted
                            ? `Score All Candidates (${scoredCandidatesCount}/${evaluatableNominees.length})`
                            : 'Review & Submit Ballot'}
                        </span>
                      </button>
                    </div>
                  </div>
                )
              ) : (
                /* INSTANT CAST VOTE ACTION PANEL FOR SINGLE CHOICE */
                !eligibilityStatus?.hasVoted && isOpen && (
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
                )
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
                {categoriesList.map((cat: string) => {
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
                  const isSelf = effectiveVoter && (
                    nominee.personId === effectiveVoter.id ||
                    (nominee.displayName && effectiveVoter.fullName && nominee.displayName.trim().toLowerCase() === effectiveVoter.fullName.trim().toLowerCase())
                  );
                  const isVoterRestrictedForNominee = Boolean(
                    effectiveVoter && nominee.excludedVoterIds && nominee.excludedVoterIds.includes(effectiveVoter.id)
                  );
                  const selfVoteForbidden = (isSelf && (!exercise.allowSelfVote || isRatingScale)) || isVoterRestrictedForNominee;

                  if (isRatingScale) {
                    // --- RATING SCALE CARD RENDERING (Scale 5 to 10 points) ---
                    const currentScore = nomineeScores[nominee.id];
                    const isVoterHimself = isSelf;

                    return (
                      <div
                        key={nominee.id}
                        id={`nominee-card-${nominee.id}`}
                        className={`relative p-4 sm:p-5 rounded-2xl border transition-all bg-[#1E293B] flex flex-col justify-between ${
                          currentScore
                            ? 'border-amber-500/80 ring-2 ring-amber-500/20 shadow-md bg-gradient-to-b from-amber-500/5 to-[#1E293B]'
                            : 'border-[#334155] hover:border-amber-500/40'
                        } ${isVoterHimself || isVoterRestrictedForNominee ? 'border-amber-500/30 bg-[#1E293B]/70' : ''}`}
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

                              {isVoterHimself ? (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold shrink-0">
                                  You
                                </span>
                              ) : isVoterRestrictedForNominee ? (
                                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold shrink-0 flex items-center gap-1">
                                  <ShieldAlert className="w-3 h-3 text-rose-400" />
                                  Restricted
                                </span>
                              ) : currentScore ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 text-xs font-mono shrink-0">
                                  <Sparkles className="w-3 h-3 text-amber-400" />
                                  {currentScore} / {maxScore} pts
                                </span>
                              ) : null}
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
                              <p className="text-xs text-[#94A3B8] mt-2 line-clamp-2 leading-relaxed">
                                {nominee.bio}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Interactive Score Selector Buttons (5 to 10) OR Block Banners */}
                        {isVoterHimself ? (
                          <div className="mt-3 p-3 bg-amber-950/40 rounded-xl border border-amber-500/30 text-amber-300 text-xs space-y-1">
                            <div className="flex items-center gap-1.5 font-bold">
                              <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                              <span>Self-Nomination (Voting Excluded)</span>
                            </div>
                            <p className="text-[11px] text-slate-300 leading-relaxed">
                              Under workforce voting rules, members nominated in this cycle cannot vote for themselves. Your score is automatically excluded from your ballot, but you can evaluate all other candidates below.
                            </p>
                          </div>
                        ) : isVoterRestrictedForNominee ? (
                          <div className="mt-3 p-3 bg-rose-950/40 rounded-xl border border-rose-500/30 text-rose-300 text-xs space-y-1">
                            <div className="flex items-center gap-1.5 font-bold">
                              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                              <span>Governance Recusal / Restricted Vote</span>
                            </div>
                            <p className="text-[11px] text-slate-300 leading-relaxed">
                              {nominee.exclusionReason || 'Under church governance and recusal policy, you are restricted from evaluating this particular candidate. You are free to evaluate the other candidates on this ballot.'}
                            </p>
                          </div>
                        ) : (
                          <div className="mt-3 pt-3 border-t border-slate-700/80 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                Rate Candidate ({minScore} lowest – {maxScore} highest):
                              </span>
                              {currentScore ? (
                                <span className="text-amber-300 font-bold text-xs">
                                  {currentScore === minScore
                                    ? 'Fair (Lowest)'
                                    : currentScore === maxScore
                                    ? 'Exceptional (Highest)'
                                    : 'Commended'}
                                </span>
                              ) : (
                                <span className="text-amber-400/80 text-[11px] font-medium italic">
                                  Select a score
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-6 gap-1.5">
                              {Array.from({ length: maxScore - minScore + 1 }, (_, i) => minScore + i).map((scoreVal) => {
                                const isSelectedScore = currentScore === scoreVal;
                                return (
                                  <button
                                    key={scoreVal}
                                    type="button"
                                    id={`btn-score-${nominee.id}-${scoreVal}`}
                                    disabled={eligibilityStatus?.hasVoted || !isOpen}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSetNomineeScore(nominee.id, scoreVal);
                                    }}
                                    className={`py-2 px-1 rounded-xl text-xs font-bold transition-all text-center flex flex-col items-center justify-center cursor-pointer disabled:cursor-not-allowed ${
                                      isSelectedScore
                                        ? 'bg-gradient-to-b from-amber-400 to-[#FF8A00] text-slate-950 ring-2 ring-amber-400 shadow-md shadow-amber-500/30 scale-105 font-black'
                                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:border-amber-500/50'
                                    }`}
                                  >
                                    <span className="text-sm font-black">{scoreVal}</span>
                                    <span className="text-[9px] opacity-75 font-normal">
                                      {scoreVal === minScore ? 'Low' : scoreVal === maxScore ? 'Top' : 'pts'}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }

                  // --- SINGLE-CHOICE CARD RENDERING ---
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

                          {isVoterRestrictedForNominee && (
                            <div className="mt-2.5 p-2 bg-rose-950/40 rounded-lg border border-rose-500/30 text-rose-300 text-[11px] flex items-center gap-2">
                              <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              <span>{nominee.exclusionReason || 'Restricted from voting for this candidate per governance recusal policy.'}</span>
                            </div>
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
              <span className={`font-bold ${isRatingScale ? (isAllScoresCompleted ? 'text-emerald-400' : 'text-amber-400') : (isAllCategoriesCompleted ? 'text-emerald-400' : 'text-[#FF8A00]')}`}>
                {isRatingScale
                  ? `${Math.round((scoredCandidatesCount / Math.max(evaluatableNominees.length, 1)) * 100)}% Evaluated`
                  : `${progressPercentage}% Completed`}
              </span>
              <span>•</span>
              <span>
                {isRatingScale
                  ? `${scoredCandidatesCount} of ${evaluatableNominees.length} candidates scored`
                  : `${completedCategoriesCount} of ${totalCategories} ${totalCategories === 1 ? 'category' : 'categories'} selected`}
              </span>
            </div>
            <div>
              {isRatingScale ? (
                <span className="text-slate-300">
                  {isAllScoresCompleted ? (
                    <strong className="text-emerald-400 font-semibold">
                      ✓ All {evaluatableNominees.length} candidates scored (Average: {averageScoreGiven} / {maxScore} pts)
                    </strong>
                  ) : (
                    <span>
                      Please assign a rating score ({minScore} to {maxScore}) to each candidate ({evaluatableNominees.length - scoredCandidatesCount} remaining)
                    </span>
                  )}
                </span>
              ) : selectedNominee ? (
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
            {isRatingScale ? (
              <button
                id="btn-submit-rating-ballot"
                disabled={!isOpen || !isAllScoresCompleted || isSubmitting || verifyingCode}
                onClick={handleInitiateScoreSubmission}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-[#FF8A00] to-amber-500 hover:from-[#E85B00] hover:to-amber-600 text-slate-950 rounded-xl text-sm font-black tracking-wide transition-all shadow-lg hover:shadow-amber-500/25 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 fill-slate-950" />
                <span>
                  {isSubmitting
                    ? 'Recording Ballot...'
                    : verifyingCode
                    ? 'Verifying Code...'
                    : 'Review & Submit Ballot'}
                </span>
              </button>
            ) : (
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
            )}
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL WITH SELECTION REVIEW */}
      {showConfirmModal && (effectiveVoter || voterSession) && (isRatingScale ? true : selectedNominee) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
          <div className="bg-[#1E293B] rounded-2xl max-w-lg w-full shadow-2xl border border-[#334155] animate-scaleUp text-[#F8FAFC] my-auto flex flex-col max-h-[90dvh] sm:max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-700/80 p-3.5 sm:p-5 pb-3 sm:pb-4 shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-[#251464] text-[#FF8A00] border border-[#FF8A00]/40 flex items-center justify-center shrink-0 shadow-inner">
                  <ShieldCheck className="w-4 h-4 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-lg font-bold text-[#F8FAFC] font-display">
                    {isRatingScale ? 'Review Your Rating Score' : 'Review & Confirm Your Vote'}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-[#94A3B8] mt-0.5">
                    {isRatingScale
                      ? `Confirm the evaluation scores assigned to all ${evaluatableNominees.length} candidates.`
                      : 'Please review your selection before submitting. This vote cannot be modified once cast.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="text-[#94A3B8] hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Body */}
            <div
              className="p-3.5 sm:p-5 overflow-y-auto overscroll-contain flex-1 min-h-0 space-y-3.5 sm:space-y-4 touch-pan-y"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {/* Candidate Review Body */}
              {isRatingScale ? (
                <div className="space-y-2.5">
                  <div className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Candidate Scores Breakdown ({evaluatableNominees.length})
                    </span>
                    <span className="text-amber-300 font-mono text-xs">
                      Avg: {averageScoreGiven} / {maxScore} pts
                    </span>
                  </div>

                  <div className="p-3 bg-[#0F172A] rounded-xl border border-slate-800 space-y-2">
                    {evaluatableNominees.map((nom) => {
                      const sc = nomineeScores[nom.id];
                      return (
                        <div key={nom.id} className="flex justify-between items-center py-2 border-b border-slate-800/60 last:border-0 text-xs">
                          <div className="min-w-0 flex-1 pr-3">
                            <span className="font-semibold text-white truncate block">{nom.displayName}</span>
                            <span className="text-[11px] text-slate-400 truncate block">
                              {[nom.roleOrTitle, nom.department].filter(Boolean).join(' • ')}
                            </span>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 shrink-0 font-mono text-xs">
                            {sc ?? '—'} / {maxScore} pts
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {currentVoterNominee && (
                    <p className="text-[11px] text-amber-400/90 italic">
                      * Per church integrity rules, your own nomination is excluded from receiving a score.
                    </p>
                  )}
                </div>
              ) : selectedNominee ? (
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
              ) : null}

              {/* Multi-Category Breakdown (if applicable) */}
              {!isRatingScale && categoriesList.length > 1 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#FF8A00]" />
                    <span>All Category Choices ({categoriesList.length})</span>
                  </div>
                  <div className="p-3 bg-[#0F172A] rounded-xl border border-slate-800 space-y-1.5 max-h-36 overflow-y-auto">
                    {categoriesList.map((cat: string) => {
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
                  <span className="font-semibold text-[#F8FAFC]">{(effectiveVoter || voterSession)?.fullName}</span>
                </div>
                <div className="flex justify-between text-[#94A3B8] font-mono">
                  <span>Voter Authorization Code:</span>
                  <span className="font-bold text-[#FF8A00]">{(effectiveVoter || voterSession)?.voterCode}</span>
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
                    {isRatingScale
                      ? 'I have reviewed my scores above and confirm this is my final official rating ballot.'
                      : 'I have reviewed my selection above and confirm this is my final official vote.'}
                  </span>
                  <p className="text-[11px] text-[#94A3B8]">
                    I acknowledge that once submitted, this ballot will be written permanently to Firestore and cannot be amended.
                  </p>
                </div>
              </label>
            </div>

            {/* Action Buttons Footer - Sticky at bottom */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 sm:gap-3 p-3.5 sm:p-4 sm:px-6 border-t border-slate-800 bg-[#162032] shrink-0">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowConfirmModal(false)}
                className="w-full sm:w-auto px-4 py-2.5 text-[#94A3B8] hover:text-[#F8FAFC] text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors text-center cursor-pointer"
              >
                Cancel & Edit
              </button>

              <button
                id="btn-confirm-final-vote"
                type="button"
                disabled={isSubmitting || !hasReviewedSelection}
                onClick={isRatingScale ? handleConfirmScoreBallot : handleConfirmVote}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-[#FF8A00] to-amber-500 hover:from-[#E85B00] hover:to-amber-600 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                title={!hasReviewedSelection ? 'Please check the review confirmation box first' : undefined}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Recording Ballot...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isRatingScale ? 'Confirm & Submit Rating Ballot' : 'Confirm & Submit Vote'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VOTER CODE PROMPT MODAL FOR RATING BALLOT */}
      {showVoterCodePromptModal && !effectiveVoter && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#1E293B] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#334155] space-y-5 animate-scaleUp text-[#F8FAFC] my-8">
            <div className="flex items-start justify-between gap-3 border-b border-slate-700/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#251464] text-[#FF8A00] border border-[#FF8A00]/40 flex items-center justify-center shrink-0 shadow-inner">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#F8FAFC]">
                    Enter Voter Authorization Code
                  </h3>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    Verify your identity to submit your rating evaluation
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowVoterCodePromptModal(false)}
                className="text-[#94A3B8] hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/30 text-xs text-amber-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                All <strong>{evaluatableNominees.length}</strong> candidates have been evaluated. Enter your voter authorization code to verify eligibility and review your ballot.
              </span>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const raw = inputVoterCode.trim().toUpperCase();
                if (!raw) {
                  setCodeError('Please enter your unique voter code.');
                  return;
                }
                setVerifyingCode(true);
                setCodeError('');
                try {
                  const authRes = await authenticateWithVoterCode(raw);
                  if (!authRes.success || !authRes.person) {
                    setCodeError(authRes.message || 'Invalid voter authorization code.');
                    return;
                  }
                  if (exercise) {
                    const el = await checkVoterEligibility(exercise.id, authRes.person.id, true);
                    setEligibilityStatus(el);
                    if (!el.eligible) {
                      setCodeError('This member code is not registered as eligible for this exercise.');
                      return;
                    }
                    if (el.hasVoted) {
                      setCodeError('This member code has already submitted a ballot for this exercise.');
                      return;
                    }
                  }
                  setShowVoterCodePromptModal(false);
                  setHasReviewedSelection(false);
                  setShowConfirmModal(true);
                  toastSuccess('Identity Verified!', `Welcome ${authRes.person.fullName}. Review your ballot below.`);
                } catch (err: any) {
                  setCodeError(err.message || 'Failed to verify voter code.');
                } finally {
                  setVerifyingCode(false);
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#94A3B8]">
                  Your Unique Voter Code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="modal-input-voter-code"
                    autoFocus
                    placeholder="e.g. VOTE-XXXXXX"
                    value={inputVoterCode}
                    onChange={(e) => {
                      setInputVoterCode(e.target.value.toUpperCase());
                      setCodeError('');
                    }}
                    className="w-full px-3.5 py-2.5 bg-[#0F172A] border border-[#475569] rounded-xl text-sm font-mono uppercase text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#FF8A00] tracking-wider"
                  />
                </div>
                {codeError && (
                  <div className="text-xs text-rose-400 flex items-center gap-1.5 p-2.5 bg-rose-950/40 rounded-lg border border-rose-800/60 mt-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{codeError}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVoterCodePromptModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#94A3B8] hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-modal-verify-and-review"
                  disabled={verifyingCode || !inputVoterCode.trim()}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#FF8A00] to-amber-500 hover:from-[#E85B00] hover:to-amber-600 text-slate-950 font-black text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {verifyingCode ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Verify & Review Ballot</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
