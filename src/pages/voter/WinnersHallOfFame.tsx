import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WinnerRecord, Organisation, Department } from '../../types';
import { getAllPreviousWinners, getOrganisations, getDepartments } from '../../services/db';
import {
  Trophy,
  Crown,
  Award,
  Sparkles,
  Search,
  Building2,
  Layers,
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Heart,
  Flame,
  Users,
  ShieldCheck,
  Quote,
  X,
  Printer,
  Copy,
  Check,
  Share2,
  Filter,
  Medal,
  Star,
  ExternalLink,
  History,
  Vote,
  Download,
  Image as ImageIcon,
  Loader2,
  Globe
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  downloadCertificateFile, 
  downloadCertificateAsImage,
  downloadAwardFile,
  downloadAwardAsImage,
  getCertificateHallOfFameTitle,
  getAwardHallOfFameTitle,
  TRH_LOGO_URL,
  OSCAR_STATUETTE_SVG
} from '../../utils/printCertificate';
import { ShareWinnerModal } from '../../components/voter/ShareWinnerModal';

interface WinnersHallOfFameProps {
  onBack: () => void;
  onViewResults: (exerciseId: string) => void;
  onNavigateToVote?: (exerciseId?: string) => void;
}

export const WinnersHallOfFame: React.FC<WinnersHallOfFameProps> = ({
  onBack,
  onViewResults,
  onNavigateToVote
}) => {
  const [winners, setWinners] = useState<WinnerRecord[]>([]);
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Certificate / Citation Modal
  const [selectedCitationWinner, setSelectedCitationWinner] = useState<WinnerRecord | null>(null);
  const [copiedCitation, setCopiedCitation] = useState(false);
  const [shareWinner, setShareWinner] = useState<WinnerRecord | null>(null);

  // Handle device back button when any modal is open
  useEffect(() => {
    const isModalOpen = Boolean(selectedCitationWinner || shareWinner);
    if (!isModalOpen) return;

    window.history.pushState({ modal: true }, '', window.location.href);

    const onPopState = () => {
      setSelectedCitationWinner(null);
      setShareWinner(null);
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, [Boolean(selectedCitationWinner || shareWinner)]);

  const closeCitationModal = () => {
    if (window.history.state?.modal) {
      window.history.back();
    } else {
      setSelectedCitationWinner(null);
    }
  };

  const closeShareModal = () => {
    if (window.history.state?.modal) {
      window.history.back();
    } else {
      setShareWinner(null);
    }
  };

  // Filters & Tabs
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'all' | 'archive' | 'election'>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedOrg, setSelectedOrg] = useState('all');
  const [selectedDept, setSelectedDept] = useState('all');

  useEffect(() => {
    const loadData = async (force = false) => {
      setLoading(true);
      try {
        const [wList, orgs, depts] = await Promise.all([
          getAllPreviousWinners(force),
          getOrganisations(false, force),
          getDepartments(undefined, false, force)
        ]);
        setWinners(wList);
        setOrganisations(orgs);
        setDepartments(depts);

        if (wList.length > 0 && !force) {
          // Celebrate on arrival with subtle confetti shower
          setTimeout(() => {
            confetti({
              particleCount: 50,
              spread: 80,
              origin: { y: 0.25 },
              colors: ['#FF8A00', '#E85B00', '#251464', '#F8FAFC', '#FBBF24']
            });
          }, 350);
        }
      } catch (err) {
        console.error('Error loading previous winners:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData(false);

    const handleSync = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (!detail?.key || detail.key.includes('winner') || detail.key.includes('legacy') || detail.key.includes('org') || detail.key.includes('dept')) {
        loadData(false);
      }
    };

    window.addEventListener('trh_cache_sync', handleSync);
    return () => {
      window.removeEventListener('trh_cache_sync', handleSync);
    };
  }, []);

  // Compute available years from data
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    winners.forEach((w) => {
      if (w.year) {
        yearsSet.add(String(w.year));
      } else if (w.endTime) {
        const parsed = new Date(w.endTime).getFullYear();
        if (!isNaN(parsed)) yearsSet.add(String(parsed));
      }
    });
    return Array.from(yearsSet).sort((a, b) => Number(b) - Number(a));
  }, [winners]);

  // Filtered winners list
  const filteredWinners = useMemo(() => {
    return winners.filter((w) => {
      // Tab filter
      if (selectedTab === 'archive' && !w.isLegacy) return false;
      if (selectedTab === 'election' && w.isLegacy) return false;

      // Year filter
      if (selectedYear !== 'all') {
        const wYear = w.year ? String(w.year) : w.endTime ? String(new Date(w.endTime).getFullYear()) : '';
        if (wYear !== selectedYear) return false;
      }

      // Org filter
      if (selectedOrg !== 'all' && w.organisationId !== selectedOrg) return false;

      // Dept filter (matches primary department, secondary department, or any listed department)
      if (selectedDept !== 'all') {
        const matchesPrimary = w.departmentId === selectedDept;
        const matchesSecondary = w.secondaryDepartmentId === selectedDept;
        const matchesList = Boolean(w.departmentIds && w.departmentIds.includes(selectedDept));
        if (!matchesPrimary && !matchesSecondary && !matchesList) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = w.winner.displayName.toLowerCase().includes(q);
        const matchJoint = (w.jointWinnerName || '').toLowerCase().includes(q) ||
          (w.allWinners || []).some((aw) => aw.displayName.toLowerCase().includes(q));
        const matchTitle = w.exerciseTitle.toLowerCase().includes(q);
        const matchRole = (w.winner.roleOrTitle || '').toLowerCase().includes(q) ||
          (w.jointWinnerRole || '').toLowerCase().includes(q);
        const matchDept = (w.departmentName || '').toLowerCase().includes(q);
        const matchSecDept = (w.secondaryDepartmentName || '').toLowerCase().includes(q) ||
          (w.departmentNames || []).some((dn) => dn.toLowerCase().includes(q));
        const matchOrg = w.organisationName.toLowerCase().includes(q);
        const matchCategory = (w.categoryName || '').toLowerCase().includes(q);
        const matchMonth = (w.month || '').toLowerCase().includes(q);
        const matchYear = String(w.year || '').includes(q);
        const matchCitation = (w.citation || '').toLowerCase().includes(q);

        if (
          !matchName &&
          !matchJoint &&
          !matchTitle &&
          !matchRole &&
          !matchDept &&
          !matchSecDept &&
          !matchOrg &&
          !matchCategory &&
          !matchMonth &&
          !matchYear &&
          !matchCitation
        ) {
          return false;
        }
      }
      return true;
    });
  }, [winners, selectedTab, selectedYear, selectedOrg, selectedDept, searchQuery]);

  const totalHonored = winners.reduce((acc, curr) => acc + (curr.isTie ? curr.allWinners.length : 1), 0);
  const totalVotesCast = winners.reduce((acc, curr) => acc + curr.totalVotes, 0);
  const archiveCount = winners.filter((w) => w.isLegacy).length;
  const electionCount = winners.filter((w) => !w.isLegacy).length;

  const [printNotice, setPrintNotice] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<'certificate' | 'award'>('certificate');
  const [downloadingAwardImage, setDownloadingAwardImage] = useState(false);
  const [downloadingCertImage, setDownloadingCertImage] = useState(false);
  const modalScrollRef = useRef<HTMLDivElement>(null);

  // Lock body scroll and guarantee modal body scrolls to top when opened or switching tabs
  useEffect(() => {
    if (selectedCitationWinner) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      modalScrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [selectedCitationWinner, modalTab]);

  const handleCopyCitation = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCitation(true);
    setTimeout(() => setCopiedCitation(false), 2000);
  };

  const handleDownloadAward = async () => {
    if (!selectedCitationWinner || downloadingAwardImage) return;
    setDownloadingAwardImage(true);
    setPrintNotice('Generating high-resolution Award image...');
    try {
      await downloadAwardAsImage(selectedCitationWinner);
      setPrintNotice('Oscar Statuette Award image downloaded!');
    } catch (err) {
      console.error('Error downloading award image:', err);
      setPrintNotice('Oscar Statuette Award image downloaded!');
    } finally {
      setDownloadingAwardImage(false);
      setTimeout(() => setPrintNotice(null), 4000);
    }
  };

  const handleDownloadCertificateImage = async () => {
    if (!selectedCitationWinner || downloadingCertImage) return;
    setDownloadingCertImage(true);
    setPrintNotice('Generating high-resolution Certificate image with winner portrait...');
    try {
      await downloadCertificateAsImage(selectedCitationWinner);
      setPrintNotice('Official Certificate image downloaded!');
    } catch (err) {
      console.error('Error downloading certificate image, falling back to document:', err);
      await downloadCertificateFile(selectedCitationWinner);
      setPrintNotice('Official Certificate downloaded!');
    } finally {
      setDownloadingCertImage(false);
      setTimeout(() => setPrintNotice(null), 4000);
    }
  };

  const handleDownloadCertificate = async () => {
    if (!selectedCitationWinner) return;
    setPrintNotice('Preparing Certificate with winner portrait...');
    await downloadCertificateFile(selectedCitationWinner);
    setPrintNotice('Official Certificate document downloaded!');
    setTimeout(() => setPrintNotice(null), 3500);
  };

  return (
    <div className="relative min-h-screen text-[#F8FAFC] pb-16 overflow-hidden">
      {/* Dynamic Ambient Background Motion Particles */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.15, 0.28, 0.15],
            x: [0, 40, 0],
            y: [0, -30, 0]
          }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-32 right-1/4 w-[600px] h-[600px] bg-[#FF8A00]/15 rounded-full blur-[140px]"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.35, 0.2],
            x: [0, -50, 0],
            y: [0, 40, 0]
          }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/3 -left-48 w-[650px] h-[650px] bg-[#251464]/40 rounded-full blur-[160px]"
        />
        <motion.div
          animate={{
            opacity: [0.1, 0.22, 0.1],
            scale: [0.9, 1.15, 0.9]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-[#FF8A00]/10 rounded-full blur-[130px]"
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto py-3 sm:py-6 px-3 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
        {/* Top Back Navigation Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <button
            id="btn-back-to-voter-portal"
            onClick={onBack}
            className="min-h-[44px] group inline-flex items-center justify-center sm:justify-start gap-2.5 px-4 py-2.5 bg-[#1E293B]/80 hover:bg-[#334155] border border-slate-800 hover:border-[#FF8A00]/40 rounded-xl text-xs sm:text-sm font-semibold text-[#94A3B8] hover:text-[#FF8A00] transition-all backdrop-blur-md cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Return to Voter Portal</span>
          </button>

          <div className="flex items-center justify-center sm:justify-end gap-2">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#251464]/80 border border-[#FF8A00]/40 rounded-full text-xs font-bold text-[#FF8A00] shadow-sm backdrop-blur-md">
              <ShieldCheck className="w-3.5 h-3.5 text-[#FF8A00]" />
              <span>Certified Royal Archive</span>
            </span>
          </div>
        </div>

        {/* HERO BANNER - CINEMATIC MOTION GRAPHICS STAGE */}
        <motion.section
          id="hall-of-fame-hero"
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-br from-[#1E1145] via-[#111827] to-[#0A0E17] border border-amber-500/20 p-4 sm:p-8 md:p-10 shadow-[0_25px_60px_rgba(0,0,0,0.6)]"
        >
          {/* Subtle Guilloche / Radiant Halo in Background */}
          <div className="absolute right-6 top-1/2 -translate-y-1/2 w-80 h-80 rounded-full border border-amber-500/10 pointer-events-none hidden lg:block animate-ray-rotate opacity-40">
            <div className="w-full h-full rounded-full border-2 border-dashed border-amber-500/20" />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 sm:gap-8">
            <div className="max-w-2xl space-y-3 sm:space-y-4">
              {/* Badge: Ceremonial Induction */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 bg-gradient-to-r from-[#FF8A00]/20 to-amber-600/10 border border-[#FF8A00]/40 text-[#FF8A00] rounded-full text-[11px] sm:text-sm font-bold shadow-md shadow-black/30 backdrop-blur-md"
              >
                <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FF8A00] shrink-0" />
                <span className="tracking-wide uppercase text-[10px] sm:text-[11px] truncate">TRH Ministries Global • Royal Honors</span>
              </motion.div>

              {/* Majestic Headline with Shimmering Gradient Typography */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <h1
                  id="heading-previous-winners"
                  className="text-2xl sm:text-4xl md:text-5xl font-display font-black tracking-tight leading-tight"
                >
                  <span className="block text-[#F8FAFC]">Workforce</span>
                  <span className="block bg-gradient-to-r from-amber-200 via-[#FF8A00] to-orange-400 bg-clip-text text-transparent drop-shadow-sm">
                    Hall of Fame &amp; Archives
                  </span>
                </h1>
              </motion.div>

              {/* Subtitle */}
              <motion.p
                id="paragraph-hall-of-fame-desc"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-xs sm:text-sm md:text-base text-[#94A3B8] leading-relaxed max-w-xl font-normal"
              >
                Commemorating faithful workers, outstanding leaders, and distinguished servants whose kingdom dedication, sacrifice, and character illuminate our church community.
              </motion.p>
            </div>

            {/* Live Key Metrics Panel - Responsive for Mobile & Tablet */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="w-full lg:w-72 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-2.5 sm:gap-3 shrink-0"
            >
              <div className="p-3 sm:p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl backdrop-blur-md flex items-center gap-3 hover:border-[#FF8A00]/40 transition-colors">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#FF8A00] to-orange-600 text-slate-950 flex items-center justify-center font-bold shadow-md shrink-0">
                  <Crown className="w-4 h-4 sm:w-5 sm:h-5 fill-slate-950" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] sm:text-[11px] text-[#94A3B8] uppercase tracking-wider font-semibold truncate">Honored Servants</div>
                  <div className="text-lg sm:text-2xl font-black text-[#F8FAFC] font-display leading-none mt-0.5">{totalHonored}</div>
                </div>
              </div>

              <div className="p-3 sm:p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl backdrop-blur-md flex items-center gap-3 hover:border-[#FF8A00]/40 transition-colors">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#251464] border border-[#FF8A00]/30 text-[#FF8A00] flex items-center justify-center font-bold shadow-md shrink-0">
                  <History className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] sm:text-[11px] text-[#94A3B8] uppercase tracking-wider font-semibold truncate">Historical Eras</div>
                  <div className="text-lg sm:text-2xl font-black text-amber-300 font-display leading-none mt-0.5">{winners.length} Cycles</div>
                </div>
              </div>

              <div className="p-3 sm:p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl backdrop-blur-md flex items-center gap-3 hover:border-[#FF8A00]/40 transition-colors">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold shadow-md shrink-0">
                  <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] sm:text-[11px] text-[#94A3B8] uppercase tracking-wider font-semibold truncate">Verified Ballots</div>
                  <div className="text-lg sm:text-2xl font-black text-[#F8FAFC] font-display leading-none mt-0.5">{totalVotesCast.toLocaleString()}</div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* INTERACTIVE FILTER & SEARCH SYSTEM */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-30px" }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-3.5 sm:space-y-4"
        >
          {/* Segmented Mode Tabs: All Honorees, Archive Records, Active Elections */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="grid grid-cols-3 sm:flex items-center p-1 sm:p-1.5 bg-[#1E293B]/90 border border-slate-800 rounded-2xl backdrop-blur-md w-full sm:w-auto">
              <button
                onClick={() => setSelectedTab('all')}
                className={`min-h-[42px] relative px-2.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 ${
                  selectedTab === 'all'
                    ? 'text-slate-950 bg-gradient-to-r from-[#FF8A00] to-amber-500 shadow-md'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                <span>All</span>
                <span className="hidden sm:inline">Honorees</span>
                <span className="text-[10px] sm:text-xs opacity-80">({winners.length})</span>
              </button>

              <button
                onClick={() => setSelectedTab('archive')}
                className={`min-h-[42px] relative px-2.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 ${
                  selectedTab === 'archive'
                    ? 'text-slate-950 bg-gradient-to-r from-[#FF8A00] to-amber-500 shadow-md'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0 hidden xs:inline" />
                <span>Archive</span>
                <span className="text-[10px] sm:text-xs opacity-80">({archiveCount})</span>
              </button>

              <button
                onClick={() => setSelectedTab('election')}
                className={`min-h-[42px] relative px-2.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 ${
                  selectedTab === 'election'
                    ? 'text-slate-950 bg-gradient-to-r from-[#FF8A00] to-amber-500 shadow-md'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                <Vote className="w-3.5 h-3.5 shrink-0 hidden xs:inline" />
                <span>Elections</span>
                <span className="text-[10px] sm:text-xs opacity-80">({electionCount})</span>
              </button>
            </div>

            {/* Quick action to vote in active elections */}
            {onNavigateToVote && (
              <button
                onClick={() => onNavigateToVote()}
                className="min-h-[42px] w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#251464] hover:bg-[#FF8A00] text-[#FF8A00] hover:text-slate-950 border border-[#FF8A00]/40 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
              >
                <Vote className="w-4 h-4" />
                <span>Cast Active Ballot</span>
              </button>
            )}
          </div>

          {/* Search & Hierarchical Dropdowns Bar - Fully Responsive */}
          <div className="bg-[#1E293B]/90 rounded-2xl border border-slate-800 shadow-xl p-3.5 sm:p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-3.5 backdrop-blur-md">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="input-search-winners"
                type="text"
                placeholder="Search honoree, co-winner, department, citation, or era..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="min-h-[44px] w-full pl-10 pr-9 py-2.5 bg-[#0F172A] border border-slate-700 rounded-xl text-xs sm:text-sm text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#FF8A00] transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-white p-1 rounded-full hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex items-center gap-2.5 w-full lg:w-auto">
              {/* Year Dropdown */}
              {availableYears.length > 0 && (
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="min-h-[44px] w-full lg:w-auto px-3.5 py-2.5 bg-[#0F172A] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00] font-medium cursor-pointer"
                >
                  <option value="all">All Recognition Years</option>
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr} Honor Roll
                    </option>
                  ))}
                </select>
              )}

              {/* Organisation Dropdown */}
              <select
                id="select-org-filter-winners"
                value={selectedOrg}
                onChange={(e) => {
                  setSelectedOrg(e.target.value);
                  setSelectedDept('all');
                }}
                className="min-h-[44px] w-full lg:w-auto px-3.5 py-2.5 bg-[#0F172A] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00] font-medium cursor-pointer"
              >
                <option value="all">All Organisations</option>
                {organisations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>

              {/* Department Dropdown */}
              <select
                id="select-dept-filter-winners"
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="min-h-[44px] w-full lg:w-auto px-3.5 py-2.5 bg-[#0F172A] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00] font-medium cursor-pointer"
              >
                <option value="all">All Departments</option>
                {departments
                  .filter((d) => selectedOrg === 'all' || d.organisationId === selectedOrg)
                  .map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
              </select>

              {(searchQuery || selectedYear !== 'all' || selectedOrg !== 'all' || selectedDept !== 'all' || selectedTab !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedTab('all');
                    setSelectedYear('all');
                    setSelectedOrg('all');
                    setSelectedDept('all');
                  }}
                  className="min-h-[44px] w-full lg:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-400 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* WINNERS GALLERY - PROMINENT WINNER IMAGE SPOTLIGHT */}
        {loading ? (
          <div className="py-24 text-center space-y-4">
            <div className="w-14 h-14 border-4 border-[#FF8A00] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm font-semibold text-[#94A3B8] tracking-wide">
              Retrieving certified honorees and archival records...
            </p>
          </div>
        ) : filteredWinners.length === 0 ? (
          <div className="bg-[#1E293B]/80 backdrop-blur-md rounded-3xl border border-dashed border-slate-800 p-8 sm:p-14 text-center space-y-4">
            <div className="w-16 h-16 bg-[#251464] border border-[#FF8A00]/30 rounded-2xl flex items-center justify-center text-[#FF8A00] mx-auto shadow-xl">
              <Trophy className="w-8 h-8" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-[#F8FAFC] font-display">No Honorees Found</h3>
            <p className="text-xs sm:text-sm text-[#94A3B8] max-w-md mx-auto leading-relaxed">
              {searchQuery || selectedYear !== 'all' || selectedOrg !== 'all' || selectedDept !== 'all' || selectedTab !== 'all'
                ? 'No certified records match your current filter parameters. Try resetting your search filters to explore all honorees.'
                : 'As voting cycles conclude and certified election results are officially released, honorees will automatically appear in this Hall of Fame.'}
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedTab('all');
                  setSelectedYear('all');
                  setSelectedOrg('all');
                  setSelectedDept('all');
                }}
                className="min-h-[44px] px-5 py-2.5 bg-[#334155] hover:bg-slate-700 text-[#F8FAFC] rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
              >
                Show All Records
              </button>
            </div>
          </div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8"
          >
            <AnimatePresence>
              {filteredWinners.map((record, index) => {
                const winner = record.winner;
                const isTie = record.isTie;
                const isJoint = Boolean(
                  record.isJointWinner ||
                  record.secondaryDepartmentName ||
                  record.jointWinnerName ||
                  (record.allWinners && record.allWinners.length > 1)
                );
                const coWinner = record.allWinners && record.allWinners.length > 1 ? record.allWinners[1] : null;
                const coWinnerName = record.jointWinnerName || coWinner?.displayName;
                const coWinnerPhoto = record.jointWinnerPhotoUrl || coWinner?.photoUrl;
                const hasPrimaryPhoto = Boolean(winner.photoUrl && winner.photoUrl.trim());
                const hasCoPhoto = Boolean(coWinnerPhoto && coWinnerPhoto.trim());

                return (
                  <motion.div
                    key={record.exerciseId}
                    layout
                    initial={{ opacity: 0, y: 44, scale: 0.96 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true, margin: "-40px" }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{
                      duration: 0.55,
                      delay: (index % 3) * 0.09,
                      ease: [0.22, 1, 0.36, 1]
                    }}
                    whileHover={{ y: -6, transition: { duration: 0.25 } }}
                    id={`winner-card-${record.exerciseId}`}
                    className="group relative rounded-3xl border border-slate-800/90 bg-gradient-to-b from-[#1A2234] via-[#111827] to-[#0A0E17] shadow-xl hover:shadow-[0_20px_50px_rgba(255,138,0,0.22)] hover:border-[#FF8A00]/70 transition-all duration-500 flex flex-col justify-between overflow-hidden"
                  >
                    {/* TOP PROMINENT WINNER PORTRAIT STAGE (THE CENTER OF ATTENTION) */}
                    <div className="relative w-full h-64 sm:h-72 md:h-80 overflow-hidden bg-gradient-to-b from-[#251464]/60 via-slate-900 to-[#0F172A] flex items-center justify-center">
                      {/* Dual Portraits for Joint Winners if both images exist */}
                      {hasPrimaryPhoto && hasCoPhoto ? (
                        <div className="relative w-full h-full grid grid-cols-2">
                          <div className="relative w-full h-full overflow-hidden border-r border-amber-500/30">
                            <img
                              src={winner.photoUrl}
                              alt={winner.displayName}
                              className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-108 group-hover:brightness-105"
                            />
                            <div className="absolute bottom-2 left-1.5 right-1.5 px-2 py-0.5 rounded bg-black/75 backdrop-blur-xs text-[10px] font-bold text-white truncate text-center z-10">
                              {winner.displayName}
                            </div>
                          </div>
                          <div className="relative w-full h-full overflow-hidden">
                            <img
                              src={coWinnerPhoto}
                              alt={coWinnerName || 'Co-Winner'}
                              className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-108 group-hover:brightness-105"
                            />
                            <div className="absolute bottom-2 left-1.5 right-1.5 px-2 py-0.5 rounded bg-black/75 backdrop-blur-xs text-[10px] font-bold text-amber-300 truncate text-center z-10">
                              {coWinnerName}
                            </div>
                          </div>
                          <div className="absolute inset-0 bg-radial from-transparent via-transparent to-black/60 pointer-events-none group-hover:to-black/40 transition-colors duration-500" />
                        </div>
                      ) : hasPrimaryPhoto || hasCoPhoto ? (
                        /* Single Photo Full Bleed */
                        <div className="relative w-full h-full">
                          <img
                            src={winner.photoUrl || coWinnerPhoto}
                            alt={winner.displayName}
                            className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-108 group-hover:brightness-105"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const parent = e.currentTarget.parentElement;
                              if (parent) {
                                parent.classList.add('flex', 'items-center', 'justify-center');
                              }
                            }}
                          />
                          <div className="absolute inset-0 bg-radial from-transparent via-transparent to-black/60 pointer-events-none group-hover:to-black/40 transition-colors duration-500" />
                        </div>
                      ) : (
                        /* Monogram Medallion Fallback */
                        <div className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center overflow-hidden">
                          <div className="absolute inset-0 bg-radial from-amber-500/10 via-[#251464]/30 to-transparent pointer-events-none" />
                          <div className="w-56 h-56 rounded-full border border-amber-500/20 absolute animate-ray-rotate opacity-30" />

                          <div className="relative z-10 w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1.5 bg-gradient-to-b from-amber-400 via-[#FF8A00] to-orange-700 shadow-2xl flex items-center justify-center animate-gold-pulse">
                            <div className="w-full h-full rounded-full bg-[#0F172A] flex flex-col items-center justify-center border-2 border-amber-300/40">
                              <Crown className="w-5 h-5 text-amber-400 mb-0.5" />
                              <span className="font-display font-black text-2xl sm:text-3xl text-amber-100">
                                {isJoint
                                  ? `${winner.displayName.charAt(0)}${coWinnerName ? `&${coWinnerName.charAt(0)}` : ''}`
                                  : winner.displayName.charAt(0)}
                              </span>
                            </div>
                          </div>

                          <span className="relative z-10 text-[10px] sm:text-[11px] font-bold tracking-widest uppercase text-amber-400/90 mt-2.5 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            <span>{isJoint ? 'Honored Joint Recipients' : 'Sanctified Honoree'}</span>
                          </span>
                        </div>
                      )}

                      {/* Top Gradient for Badge Readability */}
                      <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-black/80 via-black/30 to-transparent pointer-events-none" />

                      {/* Bottom Gradient for Seamless Transition into Card Body */}
                      <div className="absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t from-[#111827] via-[#111827]/80 to-transparent pointer-events-none" />

                      {/* Floating Category & Status Pills over Portrait */}
                      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-1.5 z-10">
                        {/* Award Category Pill */}
                        <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-slate-950/80 border border-[#FF8A00]/40 text-[#FF8A00] text-[11px] sm:text-xs font-bold backdrop-blur-md shadow-lg">
                          <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#FF8A00] shrink-0" />
                          <span className="truncate max-w-[110px] xs:max-w-[140px] sm:max-w-[170px]">
                            {record.categoryName || 'Worker of the Month'}
                          </span>
                        </span>

                        {/* Date, Joint, & Archive Ribbon */}
                        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                          {isJoint && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-md">
                              <Users className="w-3 h-3 shrink-0" />
                              <span>Joint</span>
                            </span>
                          )}

                          {record.isLegacy ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FF8A00] text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-md">
                              <Sparkles className="w-3 h-3 shrink-0" />
                              <span>Archive</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-md">
                              <CheckCircle2 className="w-3 h-3 shrink-0" />
                              <span>Elected</span>
                            </span>
                          )}

                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-950/80 text-amber-200 text-[11px] sm:text-xs font-semibold border border-slate-700 backdrop-blur-md shadow-md">
                            <Calendar className="w-3 h-3 text-[#FF8A00] shrink-0" />
                            <span>
                              {record.month && record.year
                                ? `${record.month} ${record.year}`
                                : new Date(record.endTime).toLocaleDateString(undefined, {
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                            </span>
                          </span>
                        </div>

                        {/* Top-Right Quick Share Floating Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShareWinner(record);
                          }}
                          title="Share honor across WhatsApp, Facebook, Twitter, LinkedIn & Instagram"
                          className="absolute top-3 right-3 sm:right-4 z-20 p-2 sm:p-2.5 rounded-xl bg-slate-950/80 hover:bg-[#FF8A00] text-amber-300 hover:text-slate-950 backdrop-blur-md border border-amber-500/30 hover:border-[#FF8A00] transition-all shadow-lg hover:scale-105 cursor-pointer flex items-center gap-1.5 group/share"
                        >
                          <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 group-hover/share:text-slate-950 transition-colors" />
                          <span className="text-[11px] font-bold hidden sm:inline group-hover/share:text-slate-950">Share</span>
                        </button>
                      </div>

                      {/* 3D Gold Crown Medallion on Bottom-Right of Portrait */}
                      <div className="absolute bottom-3 right-3 sm:right-4 z-10">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#FF8A00] via-amber-500 to-orange-700 text-slate-950 flex items-center justify-center shadow-[0_6px_25px_rgba(255,138,0,0.55)] border-2 border-amber-200/60 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                          <Crown className="w-5 h-5 sm:w-6 sm:h-6 fill-slate-950 text-slate-950" />
                        </div>
                      </div>
                    </div>

                    {/* CARD BODY: WINNER IDENTITY & CITATION */}
                    <div className="p-4 sm:p-5 md:p-6 space-y-3 sm:space-y-4 relative z-10 flex-1 flex flex-col justify-between">
                      <div className="space-y-3">
                        {/* Title / Name */}
                        <div>
                          <div className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest text-[#FF8A00] mb-1">
                            <Medal className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {isJoint
                                ? 'Joint Honorees • Co-Winners'
                                : record.awardCategory === 'innovative' || record.categoryName?.toLowerCase().includes('innovative')
                                ? 'Innovative Worker • Entire Church'
                                : record.awardCategory === 'workforce_wide' ||
                                  record.categoryName?.toLowerCase().includes('workforce') ||
                                  record.categoryName?.toLowerCase().includes('all departments')
                                ? 'Workforce-Wide • All Departments'
                                : record.isLegacy
                                ? 'Departmental Honoree'
                                : isTie
                                ? 'Joint First Place'
                                : 'Champion of Excellence'}
                            </span>
                          </div>

                          <h3 className="text-lg sm:text-xl md:text-2xl font-black font-display text-[#F8FAFC] tracking-tight group-hover:text-[#FF8A00] transition-colors leading-snug">
                            {winner.displayName}
                            {coWinnerName && (
                              <span className="text-amber-400 block sm:inline"> &amp; {coWinnerName}</span>
                            )}
                          </h3>

                          {/* Role(s) */}
                          <div className="text-xs sm:text-sm text-[#94A3B8] font-medium mt-0.5 space-y-0.5">
                            <div className="truncate">
                              {winner.roleOrTitle || (record.departmentName ? `${record.departmentName} Contributor` : 'Honored Recipient')}
                            </div>
                            {record.jointWinnerRole && (
                              <div className="truncate text-amber-300/90 text-xs">
                                • Co-Winner: {record.jointWinnerRole}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Church Organisation & Both Department Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-1 text-xs">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[#F8FAFC]">
                            <Building2 className="w-3.5 h-3.5 text-[#FF8A00] shrink-0" />
                            <strong className="truncate max-w-[130px] sm:max-w-[160px]">{record.organisationName}</strong>
                          </span>

                          {record.departmentName && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/70 border border-indigo-500/30 text-indigo-300">
                              <Layers className="w-3 h-3 text-indigo-400 shrink-0" />
                              <span className="truncate max-w-[120px] sm:max-w-[150px]">{record.departmentName}</span>
                              {record.secondaryDepartmentName && (
                                <span className="text-[9px] text-indigo-400/80 font-bold uppercase">(Dept 1)</span>
                              )}
                            </span>
                          )}

                          {record.secondaryDepartmentName && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/70 border border-amber-500/35 text-amber-300 font-medium">
                              <Layers className="w-3 h-3 text-[#FF8A00] shrink-0" />
                              <span className="truncate max-w-[120px] sm:max-w-[150px]">{record.secondaryDepartmentName}</span>
                              <span className="text-[9px] text-amber-400/80 font-bold uppercase">(Dept 2)</span>
                            </span>
                          )}
                        </div>

                        {/* Citation Callout / Commendation Quote */}
                        {record.citation && (
                          <div
                            onClick={() => setSelectedCitationWinner(record)}
                            className="bg-gradient-to-br from-[#251464]/30 via-slate-900 to-[#0F172A] border border-amber-500/25 rounded-2xl p-3 sm:p-3.5 flex items-start gap-2.5 text-xs text-[#94A3B8] cursor-pointer hover:border-amber-400/50 hover:bg-[#251464]/40 transition-all group/quote shadow-sm"
                          >
                            <Quote className="w-4 h-4 text-[#FF8A00] shrink-0 mt-0.5 group-hover/quote:scale-110 transition-transform" />
                            <div className="min-w-0 flex-1">
                              <p className="italic line-clamp-2 leading-relaxed text-[11px] sm:text-xs text-amber-100/90 font-serif">
                                &ldquo;{record.citation}&rdquo;
                              </p>
                              <span className="text-[10px] text-amber-400/80 font-bold uppercase tracking-wider mt-1 block group-hover/quote:underline">
                                Read Full Commendation Citation &rarr;
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Statistics & Ballots Row */}
                        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                          {record.isLegacy ? (
                            <>
                              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                                <div className="text-[10px] uppercase tracking-wider text-[#94A3B8] font-bold">Historical Record</div>
                                <div className="text-xs font-bold text-[#FF8A00] font-display mt-0.5 truncate">
                                  {record.totalVotes > 0 ? `${record.totalVotes} Ballots Cast` : 'Archived Honoree'}
                                </div>
                              </div>
                              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                                <div className="text-[10px] uppercase tracking-wider text-[#94A3B8] font-bold">Honour Period</div>
                                <div className="text-xs font-bold text-[#F8FAFC] font-display mt-0.5 truncate">
                                  {record.month} {record.year}
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                                <div className="text-[10px] uppercase tracking-wider text-[#94A3B8] font-bold">Winning Ballots</div>
                                <div className="text-xs font-bold text-[#FF8A00] font-display mt-0.5 truncate">
                                  {winner.voteCount} votes ({winner.percentage}%)
                                </div>
                              </div>
                              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                                <div className="text-[10px] uppercase tracking-wider text-[#94A3B8] font-bold">Total Turnout</div>
                                <div className="text-xs font-bold text-[#F8FAFC] font-display mt-0.5 truncate">
                                  {record.totalVotes} ballots cast
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* CARD FOOTER INTERACTIVE BUTTONS */}
                      <div className="pt-3 sm:pt-4 border-t border-slate-800/80 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5">
                        <span className="text-[11px] text-[#94A3B8] flex items-center gap-1.5 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate">Certified &amp; Verified</span>
                        </span>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                          {/* Share Button on Winner Card */}
                          <button
                            onClick={() => setShareWinner(record)}
                            title="Share this Honor with loved ones on social media (WhatsApp, Facebook, Twitter, LinkedIn, Instagram)"
                            className="min-h-[42px] px-3 py-2 bg-slate-800 hover:bg-[#FF8A00] text-[#94A3B8] hover:text-slate-950 rounded-xl transition-all cursor-pointer border border-slate-700 flex items-center justify-center gap-1.5 font-bold text-xs shadow-sm"
                          >
                            <Share2 className="w-4 h-4" />
                            <span className="hidden xs:inline">Share</span>
                          </button>

                          {/* Direct view certificate button */}
                          <button
                            onClick={() => setSelectedCitationWinner(record)}
                            title="Open Commemorative Certificate"
                            className="min-h-[42px] p-2.5 bg-slate-800 hover:bg-slate-700 text-[#94A3B8] hover:text-[#FF8A00] rounded-xl transition-colors cursor-pointer border border-slate-700 flex items-center justify-center"
                          >
                            <Award className="w-4 h-4" />
                          </button>

                          {record.isLegacy ? (
                            <button
                              onClick={() => setSelectedCitationWinner(record)}
                              className="min-h-[42px] flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 bg-gradient-to-r from-[#251464] to-[#3B1F9E] hover:from-[#FF8A00] hover:to-orange-500 text-[#FF8A00] hover:text-slate-950 font-bold rounded-xl text-xs transition-all duration-300 border border-[#FF8A00]/40 shadow-md cursor-pointer"
                            >
                              <span>View Certificate</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => onViewResults(record.exerciseId)}
                              className="min-h-[42px] flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 bg-[#334155] hover:bg-[#FF8A00] text-[#F8FAFC] hover:text-slate-950 font-bold rounded-xl text-xs transition-all duration-300 shadow-md cursor-pointer"
                            >
                              <span>View Standings</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}

        {/* COMMEMORATIVE AWARD & OSCAR STATUETTE MODAL */}
        <AnimatePresence>
          {selectedCitationWinner && (
            <div
              className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/92 backdrop-blur-md overflow-hidden"
              onClick={(e) => {
                if (e.target === e.currentTarget) closeCitationModal();
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-full max-w-2xl max-h-[94vh] sm:max-h-[90vh] bg-gradient-to-b from-[#1A182E] via-[#0F172A] to-[#0A0E17] rounded-2xl sm:rounded-3xl border-2 border-amber-500/50 shadow-[0_25px_80px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden my-auto"
              >
                {(() => {
                  const isJoint = Boolean(
                    selectedCitationWinner.isJointWinner ||
                    selectedCitationWinner.isTie ||
                    selectedCitationWinner.secondaryDepartmentName ||
                    selectedCitationWinner.jointWinnerName ||
                    (selectedCitationWinner.allWinners && selectedCitationWinner.allWinners.length > 1)
                  );

                  const primaryWinner = selectedCitationWinner.winner || selectedCitationWinner.allWinners?.[0];
                  const primaryName = primaryWinner?.displayName || selectedCitationWinner.winner?.displayName || 'Honored Worker';
                  // Single image: graphic carries both winners in the image URL already
                  const primaryPhoto = primaryWinner?.photoUrl || selectedCitationWinner.winner?.photoUrl;
                  const primaryRole = primaryWinner?.roleOrTitle || (selectedCitationWinner as any).roleOrTitle || selectedCitationWinner.departmentName;

                  const coWinner = selectedCitationWinner.allWinners && selectedCitationWinner.allWinners.length > 1
                    ? selectedCitationWinner.allWinners[1]
                    : null;
                  const coWinnerName = selectedCitationWinner.jointWinnerName || coWinner?.displayName || '';
                  const coWinnerRole = selectedCitationWinner.jointWinnerRole || coWinner?.roleOrTitle || selectedCitationWinner.secondaryDepartmentName;

                  return (
                    <>
                      {/* Modal Top Header (Fixed at top of modal card, with TRH Logo, Title, View Switcher & Close) */}
                      <div className="shrink-0 p-3 sm:p-4 bg-gradient-to-r from-[#251464] via-[#1E293B] to-[#251464] border-b border-amber-500/30 flex flex-wrap items-center justify-between gap-2 shadow-md z-30">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={TRH_LOGO_URL}
                            onError={(e) => {
                              e.currentTarget.src = '/logo.png';
                            }}
                            alt="TRH Ministries Global Logo"
                            className="w-8 h-8 sm:w-9 sm:h-9 object-contain rounded-xl bg-white/10 p-0.5 border border-amber-400/40 shrink-0 shadow"
                          />
                          <div className="min-w-0">
                            <h3 className="text-xs sm:text-sm font-black font-display text-white tracking-wide uppercase truncate">
                              TRH MINISTRIES GLOBAL
                            </h3>
                            <p className="text-[10px] sm:text-xs text-amber-300/90 font-medium truncate">
                              {selectedCitationWinner.organisationName || 'The Reinvention House'} • Workforce Honors
                            </p>
                          </div>
                        </div>

                        {/* View Switcher: Certificate vs Oscar Award */}
                        <div className="flex items-center gap-1 p-0.5 bg-slate-900/90 rounded-xl border border-amber-500/30">
                          <button
                            onClick={() => setModalTab('certificate')}
                            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                              modalTab === 'certificate'
                                ? 'bg-gradient-to-r from-amber-500 to-[#FF8A00] text-slate-950 shadow-md'
                                : 'text-slate-300 hover:text-white hover:bg-slate-800'
                            }`}
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>Certificate</span>
                          </button>

                          <button
                            onClick={() => setModalTab('award')}
                            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                              modalTab === 'award'
                                ? 'bg-gradient-to-r from-amber-500 to-[#FF8A00] text-slate-950 shadow-md'
                                : 'text-slate-300 hover:text-white hover:bg-slate-800'
                            }`}
                          >
                            <Trophy className="w-3.5 h-3.5" />
                            <span>Oscar Award</span>
                          </button>
                        </div>

                        <button
                          onClick={closeCitationModal}
                          className="p-1.5 sm:p-2 text-[#94A3B8] hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer shrink-0 ml-1"
                          aria-label="Close modal"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Modal Body: Switch between Certificate and Oscar Award */}
                      <div ref={modalScrollRef} className="flex-1 overflow-y-auto overscroll-contain p-3.5 sm:p-6 md:p-8 space-y-4 sm:space-y-6 text-center">
                        {modalTab === 'certificate' ? (
                          /* OFFICIAL CERTIFICATE VIEW (Museum & Ceremony Grade) */
                          <div id="award-certificate-printable" className="p-4 sm:p-8 rounded-2xl border border-amber-500/30 bg-[#0B0F19]/90 relative overflow-hidden shadow-inner">
                            {/* Corner Flourishes */}
                            <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-amber-400" />
                            <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-amber-400" />
                            <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-amber-400" />
                            <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-amber-400" />

                            {/* Certificate Top with Church Logo, TRH MINISTRIES GLOBAL, and Organisation Name */}
                            <div className="flex flex-col items-center justify-center mb-3">
                              <img
                                src={TRH_LOGO_URL}
                                onError={(e) => {
                                  e.currentTarget.src = '/logo.png';
                                }}
                                alt="TRH Ministries Global Logo"
                                className="w-14 h-14 sm:w-16 sm:h-16 object-contain mb-1.5 drop-shadow-md"
                              />
                              <h3 className="text-sm sm:text-lg font-black font-display text-amber-300 tracking-widest uppercase">
                                TRH MINISTRIES GLOBAL
                              </h3>
                              <p className="text-[10px] sm:text-xs text-slate-300 font-semibold tracking-wider uppercase">
                                {selectedCitationWinner.organisationName || 'The Reinvention House'} • {getCertificateHallOfFameTitle(selectedCitationWinner)}
                              </p>
                            </div>

                            {/* Single Winner / Joint Graphic Portrait */}
                            <div className="relative mx-auto mb-3 sm:mb-4 flex items-center justify-center">
                              <div className="flex flex-col items-center">
                                <div className="relative w-22 h-22 sm:w-28 sm:h-28 rounded-full p-1 bg-gradient-to-b from-amber-300 via-[#FF8A00] to-orange-700 shadow-xl flex items-center justify-center shrink-0">
                                  {primaryPhoto ? (
                                    <img
                                      src={primaryPhoto}
                                      alt={primaryName}
                                      className="w-full h-full object-cover rounded-full"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                  ) : null}
                                  <div
                                    className={`w-full h-full rounded-full bg-[#0F172A] flex items-center justify-center font-display font-black text-2xl sm:text-4xl text-amber-300 ${primaryPhoto ? 'hidden' : 'flex'}`}
                                  >
                                    {primaryName.charAt(0)}
                                  </div>
                                  <div className="absolute -bottom-1 bg-[#FF8A00] text-slate-950 p-1.5 rounded-full shadow-lg border border-amber-200">
                                    <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-slate-950" />
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <span className="text-[10px] sm:text-xs uppercase tracking-widest font-black text-amber-400">
                                Certificate of Honor &amp; Commendation
                              </span>
                              <h2 className="text-xl sm:text-3xl font-black font-display text-white tracking-tight">
                                {primaryName}
                                {isJoint && coWinnerName && (
                                  <span className="text-amber-400 block sm:inline"> &amp; {coWinnerName}</span>
                                )}
                              </h2>
                              {(primaryRole || (isJoint && coWinnerRole)) && (
                                <p className="text-xs sm:text-sm text-[#94A3B8] font-medium">
                                  {primaryRole}
                                  {isJoint && coWinnerRole && coWinnerRole !== primaryRole && ` • ${coWinnerRole}`}
                                </p>
                              )}
                              {isJoint && (
                                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] sm:text-xs font-bold mt-1">
                                  <Users className="w-3 h-3 text-[#FF8A00]" />
                                  <span>Co-Honorees • Joint Recognition</span>
                                </div>
                              )}
                            </div>

                            {/* Award Context */}
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-amber-500/30 text-amber-300 text-xs font-bold my-3 sm:my-4">
                              <Trophy className="w-3.5 h-3.5 text-[#FF8A00]" />
                              <span>{selectedCitationWinner.categoryName || 'Worker of the Month'}</span>
                              <span>•</span>
                              <span>
                                {selectedCitationWinner.month} {selectedCitationWinner.year}
                              </span>
                            </div>

                            {/* Citation Statement */}
                            <div className="bg-[#0F172A] p-4 sm:p-5 rounded-2xl border border-slate-800 text-left space-y-2 mt-2">
                              <div className="flex items-center gap-2 text-xs font-bold text-[#FF8A00] uppercase tracking-wider">
                                <Quote className="w-4 h-4" />
                                <span>Official Commendation Citation:</span>
                              </div>
                              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed italic font-serif">
                                &ldquo;
                                {selectedCitationWinner.citation ||
                                  `Recognized with supreme commendation for extraordinary commitment, exemplary leadership, and faithful kingdom service within the workforce of ${selectedCitationWinner.organisationName || 'The Reinvention House'}.`}
                                &rdquo;
                              </p>
                            </div>

                            {/* Seal and Signatures */}
                            <div className="pt-5 sm:pt-6 mt-5 sm:mt-6 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-left text-xs">
                              <div className="space-y-1">
                                <div className="text-[10px] uppercase font-bold text-[#94A3B8]">Organisation &amp; Department Affiliation</div>
                                <div className="text-xs font-bold text-white mt-0.5">{selectedCitationWinner.organisationName || 'The Reinvention House'}</div>
                                {selectedCitationWinner.departmentName && (
                                  <div className="text-[11px] text-indigo-300">
                                    Primary Department: {selectedCitationWinner.departmentName}
                                  </div>
                                )}
                                {selectedCitationWinner.secondaryDepartmentName && (
                                  <div className="text-[11px] text-amber-300">
                                    Secondary Department: {selectedCitationWinner.secondaryDepartmentName}
                                  </div>
                                )}
                              </div>
                              <div className="sm:text-right">
                                <div className="text-[10px] uppercase font-bold text-[#94A3B8]">Certified Authentication</div>
                                <div className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 mt-0.5">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Officially Recorded</span>
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  ID: {selectedCitationWinner.exerciseId.slice(0, 16)}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* OSCAR STATUETTE AWARD VIEW (Lavish First-Class Oscar Award Design) */
                          <div className="p-4 sm:p-8 rounded-3xl border-2 border-amber-500/60 bg-gradient-to-b from-[#16182c] via-[#0b0e18] to-[#04060b] relative overflow-hidden shadow-2xl">
                            {/* Winner Photo Ambient Background Layer */}
                            {primaryPhoto && (
                              <div
                                className="absolute inset-0 bg-cover bg-center opacity-30 pointer-events-none filter blur-[1px] scale-105"
                                style={{ backgroundImage: `url(${primaryPhoto})` }}
                              />
                            )}
                            {/* Dark Gradient Overlay for optimal contrast */}
                            <div className="absolute inset-0 bg-gradient-to-b from-[#04060b]/90 via-[#0b0e18]/80 to-[#020306]/95 pointer-events-none" />

                            {/* Ambient Stage Volumetric Spotlight Halos */}
                            <div className="absolute -top-20 left-1/4 w-72 h-72 bg-amber-400/25 rounded-full blur-3xl pointer-events-none" />
                            <div className="absolute -top-20 right-1/4 w-72 h-72 bg-amber-400/25 rounded-full blur-3xl pointer-events-none" />

                            <div className="relative z-10 space-y-4">
                              {/* Prestigious Header with Church Logo: TRH MINISTRIES GLOBAL, Heading & Paragraph */}
                              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/50 text-amber-300 text-xs font-bold uppercase tracking-widest shadow-md">
                                <img
                                  src={TRH_LOGO_URL}
                                  alt="TRH Ministries Global Logo"
                                  className="w-4 h-4 object-contain"
                                  onError={(e) => { e.currentTarget.src = '/trh-official-logo.png'; }}
                                />
                                <span>TRH MINISTRIES GLOBAL</span>
                              </div>

                              <div>
                                <h3 className="text-xl sm:text-3xl font-black font-display text-white tracking-widest uppercase">
                                  {selectedCitationWinner.categoryName || selectedCitationWinner.exerciseTitle || 'Worker of the Month'}
                                </h3>
                                <p className="text-xs sm:text-sm text-slate-300 font-medium tracking-wider uppercase mt-1">
                                  {getAwardHallOfFameTitle(selectedCitationWinner)}
                                </p>
                              </div>

                              {/* Prominent 24K Gold Curvy Oscar Statuette Sculpture */}
                              <div className="py-4 flex justify-center items-center">
                                <div
                                  className="relative flex justify-center items-center scale-110 sm:scale-125 transform drop-shadow-[0_20px_40px_rgba(255,138,0,0.5)] transition-transform"
                                  dangerouslySetInnerHTML={{ __html: OSCAR_STATUETTE_SVG }}
                                />
                              </div>

                              {/* Prominent Congratulations Pill */}
                              <div className="inline-block px-5 py-1 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 font-black text-xs sm:text-sm tracking-widest uppercase shadow-lg">
                                ★ CONGRATULATIONS ★
                              </div>

                              {/* Congratulation Card (Picture removed, Congratulations added) */}
                              <div className="inline-block px-6 sm:px-8 py-3 rounded-full bg-gradient-to-r from-[#2a1b54] to-[#0d1527] border-2 border-amber-400 shadow-2xl max-w-lg mx-auto text-center">
                                <div className="text-base sm:text-xl font-black text-white font-display">
                                  Congratulations, {primaryName}
                                  {isJoint && coWinnerName && (
                                    <span className="text-amber-300"> &amp; {coWinnerName}</span>
                                  )}!
                                </div>
                                <div className="text-xs sm:text-sm text-amber-400 font-semibold uppercase tracking-wider mt-0.5">
                                  {primaryRole}
                                  {isJoint && coWinnerRole && coWinnerRole !== primaryRole && ` • ${coWinnerRole}`}
                                </div>
                              </div>

                              {/* Heavy Engraved Solid Brass Pedestal Plaque Card (Citation removed, honors accolade) */}
                              <div className="bg-gradient-to-br from-[#1b2234] to-[#0b101c] border-2 border-amber-500/40 p-4 sm:p-5 rounded-2xl text-left space-y-2 mt-3 shadow-xl">
                                <div className="flex items-center justify-between text-xs font-bold text-amber-300 border-b border-amber-500/30 pb-2">
                                  <span className="uppercase tracking-wider">{selectedCitationWinner.categoryName || 'Worker of the Month'}</span>
                                  <span className="text-slate-300">{selectedCitationWinner.month} {selectedCitationWinner.year}</span>
                                </div>
                                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed italic font-serif pt-1 text-center">
                                  Conferred with highest distinction for peerless dedication, steadfast integrity, and extraordinary service.
                                </p>
                                <div className="flex items-center justify-between text-[10px] text-amber-400/80 pt-2 border-t border-slate-800">
                                  <span className="uppercase tracking-widest font-semibold">Conferred by Decreed Honors</span>
                                  <span className="font-mono text-slate-400">ID: {selectedCitationWinner.exerciseId.slice(0, 14)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Modal Actions Footer */}
                      <div className="shrink-0 p-3 sm:p-4 bg-[#0A0E17] border-t border-slate-800/90 flex flex-wrap items-center justify-between gap-2 sm:gap-3">
                        {printNotice && (
                          <div className="w-full text-center text-xs text-amber-300 font-medium py-1.5 animate-fadeIn bg-amber-500/10 rounded-lg border border-amber-500/20">
                            {printNotice}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2">
                          {selectedCitationWinner.citation && (
                            <button
                              onClick={() => handleCopyCitation(selectedCitationWinner.citation!)}
                              className="min-h-[42px] inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-[#F8FAFC] rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-700 shadow-sm"
                            >
                              {copiedCitation ? (
                                <>
                                  <Check className="w-4 h-4 text-emerald-400" />
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4 text-slate-400" />
                                  <span>Copy Citation</span>
                                </>
                              )}
                            </button>
                          )}

                          {modalTab === 'certificate' ? (
                            <>
                              {/* Download Certificate as high-definition Image (PNG) with winner portrait */}
                              <button
                                onClick={handleDownloadCertificateImage}
                                disabled={downloadingCertImage}
                                title="Download high-resolution Certificate image (PNG) with winner portrait"
                                className="min-h-[42px] inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 via-[#FF8A00] to-orange-500 hover:from-amber-400 hover:to-orange-600 text-slate-950 font-black rounded-xl text-xs transition-all cursor-pointer shadow-md disabled:opacity-60"
                              >
                                {downloadingCertImage ? (
                                  <>
                                    <Loader2 className="w-4 h-4 text-slate-950 animate-spin" />
                                    <span>Rendering Image...</span>
                                  </>
                                ) : (
                                  <>
                                    <ImageIcon className="w-4 h-4 text-slate-950" />
                                    <span>Download Certificate (PNG)</span>
                                  </>
                                )}
                              </button>

                              {/* Download Certificate as printable self-contained HTML document */}
                              <button
                                onClick={handleDownloadCertificate}
                                title="Download official Certificate document (HTML with embedded photo)"
                                className="min-h-[42px] inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-[#F8FAFC] rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-700 shadow-sm"
                              >
                                <Download className="w-4 h-4 text-amber-400" />
                                <span>Download Document (HTML)</span>
                              </button>
                            </>
                          ) : (
                            /* Download Award as Oscar Statuette PNG image */
                            <button
                              onClick={handleDownloadAward}
                              disabled={downloadingAwardImage}
                              title="Download official Oscar Statuette Award image (PNG)"
                              className="min-h-[42px] inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 via-[#FF8A00] to-orange-500 hover:from-amber-400 hover:to-orange-600 text-slate-950 font-black rounded-xl text-xs transition-all cursor-pointer shadow-md disabled:opacity-60"
                            >
                              {downloadingAwardImage ? (
                                <>
                                  <Loader2 className="w-4 h-4 text-slate-950 animate-spin" />
                                  <span>Generating Image...</span>
                                </>
                              ) : (
                                <>
                                  <ImageIcon className="w-4 h-4 text-slate-950" />
                                  <span>Download Award (PNG)</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Share button in modal */}
                          <button
                            onClick={() => setShareWinner(selectedCitationWinner)}
                            title="Share this honor with loved ones across social media platforms"
                            className="min-h-[42px] inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md"
                          >
                            <Share2 className="w-4 h-4 text-white" />
                            <span className="hidden sm:inline">Share Honor</span>
                            <span className="sm:hidden">Share</span>
                          </button>

                          <button
                            onClick={closeCitationModal}
                            className="min-h-[42px] inline-flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs transition-all cursor-pointer border border-slate-700"
                          >
                            <span>Close</span>
                          </button>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* SOCIAL SHARING MODAL ACROSS ALL PLATFORMS */}
        <ShareWinnerModal
          record={shareWinner}
          isOpen={Boolean(shareWinner)}
          onClose={closeShareModal}
        />
      </div>
    </div>
  );
};
