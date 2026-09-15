import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  VotingExercise,
  Organisation,
  Department
} from '../../types';
import {
  getVotingExercises,
  getOrganisations,
  getDepartments
} from '../../services/db';
import { DynamicVotingPage } from './DynamicVotingPage';
import { PublicResultsPage } from './PublicResultsPage';
import { useAuth } from '../../context/AuthContext';
import heroBg from '../../assets/images/hero_background_1788250789348.jpg';

import {
  Vote,
  Award,
  Building2,
  Layers,
  FolderTree,
  Clock,
  CheckCircle2,
  ArrowRight,
  Search,
  Sparkles,
  X,
  Heart,
  Info,
  Check,
  Crown,
  Trophy,
  ShieldCheck,
  Users
} from 'lucide-react';

interface VoterPortalProps {
  onSelectExercise?: (id: string) => void;
  onViewResults?: (id: string) => void;
  onNavigateToWinners?: () => void;
}

export const VoterPortal: React.FC<VoterPortalProps> = ({
  onSelectExercise,
  onViewResults,
  onNavigateToWinners
}) => {
  const {
    voterSession,
    authenticateWithVoterCode,
    clearVoterSession
  } = useAuth();

  const [exercises, setExercises] = useState<VotingExercise[]>([]);
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAboutModal, setShowAboutModal] = useState(false);

  // Filters
  const [selectedScope, setSelectedScope] = useState<string>('all');
  const [selectedOrg, setSelectedOrg] = useState<string>('all');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'open' | 'published'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Active view inside voter portal
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(
    null
  );

  const [viewMode, setViewMode] = useState<
    'directory' | 'vote' | 'results'
  >('directory');

  // ============================================================
  // LOAD DATA
  // ============================================================

  const loadData = async () => {
    setLoading(true);

    try {
      const [
        exList,
        orgsList,
        deptsList
      ] = await Promise.all([
        getVotingExercises({
          includeArchived: false
        }),
        getOrganisations(false),
        getDepartments(undefined, false)
      ]);

      setExercises(exList);
      setOrganisations(orgsList);
      setDepartments(deptsList);
    } catch (err) {
      console.error(
        'Error loading voter portal:',
        err
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleSync = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (!detail?.key || detail.key.includes('exercise') || detail.key.includes('org') || detail.key.includes('dept')) {
        loadData();
      }
    };

    window.addEventListener('trh_cache_sync', handleSync);
    return () => {
      window.removeEventListener('trh_cache_sync', handleSync);
    };
  }, []);

  // ============================================================
  // NAVIGATION
  // ============================================================

  const handleOpenExercise = (id: string) => {
    if (onSelectExercise) {
      onSelectExercise(id);
      return;
    }

    setActiveExerciseId(id);
    setViewMode('vote');
  };

  const handleViewResults = (id: string) => {
    if (onViewResults) {
      onViewResults(id);
      return;
    }

    setActiveExerciseId(id);
    setViewMode('results');
  };

  const handleBackToDirectory = () => {
    setActiveExerciseId(null);
    setViewMode('directory');
    loadData();
  };

  const handleViewWinnersClick = () => {
    if (onNavigateToWinners) {
      onNavigateToWinners();
      return;
    }

    setStatusFilter('published');

    const element = document.getElementById(
      'ballot-directory-section'
    );

    if (element) {
      element.scrollIntoView({
        behavior: 'smooth'
      });
    }
  };

  // ============================================================
  // VOTING VIEW
  // ============================================================

  if (
    viewMode === 'vote' &&
    activeExerciseId
  ) {
    return (
      <DynamicVotingPage
        exerciseId={activeExerciseId}
        onBack={handleBackToDirectory}
        onViewResults={handleViewResults}
      />
    );
  }

  // ============================================================
  // RESULTS VIEW
  // ============================================================

  if (
    viewMode === 'results' &&
    activeExerciseId
  ) {
    return (
      <PublicResultsPage
        exerciseId={activeExerciseId}
        onBack={handleBackToDirectory}
        onVoteAgain={handleOpenExercise}
      />
    );
  }

  // ============================================================
  // FILTER EXERCISES
  // ============================================================

  const filteredExercises = exercises.filter(
    (exercise) => {
      if (
        selectedScope !== 'all' &&
        exercise.scopeType !== selectedScope
      ) {
        return false;
      }

      if (
        selectedOrg !== 'all' &&
        exercise.organisationId !== selectedOrg
      ) {
        return false;
      }

      if (
        selectedDept !== 'all' &&
        exercise.departmentId !== selectedDept
      ) {
        return false;
      }

      if (
        statusFilter === 'open' &&
        exercise.status !== 'open'
      ) {
        return false;
      }

      if (
        statusFilter === 'published' &&
        !exercise.resultsPublished
      ) {
        return false;
      }

      if (searchQuery.trim()) {
        const query =
          searchQuery.toLowerCase();

        const matchTitle =
          exercise.title
            .toLowerCase()
            .includes(query);

        const matchOrg =
          exercise.organisationName
            ?.toLowerCase()
            .includes(query);

        const matchDept =
          exercise.departmentName
            ?.toLowerCase()
            .includes(query);

        const matchScope =
          exercise.scopeType
            ?.toLowerCase()
            .includes(query);

        return (
          matchTitle ||
          matchOrg ||
          matchDept ||
          matchScope
        );
      }

      return true;
    }
  );

  const activeOpenCount =
    exercises.filter(
      (exercise) =>
        exercise.status === 'open'
    ).length;

  // ============================================================
  // DIRECTORY
  // ============================================================

  return (
    <div className="w-full bg-[#0F172A]">

      {/* ======================================================
          PAGE CONTENT
          ====================================================== */}

      <div className="w-full">

        {/* ====================================================
            HERO - Background image fully covers the screen width
            ==================================================== */}

        <section
          id="hero-banner-section"
          className="relative w-full bg-[#0F172A] bg-cover bg-center bg-no-repeat border-b border-slate-800/80"
          style={{
            backgroundImage: `
              linear-gradient(
                to bottom,
                rgba(15, 23, 42, 0.84),
                rgba(15, 23, 42, 0.94)
              ),
              url(${heroBg})
            `
          }}
        >
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 md:py-24 text-center">

            {/* Eyebrow */}
            <motion.div
              initial={{
                opacity: 0,
                y: 15
              }}
              animate={{
                opacity: 1,
                y: 0
              }}
              transition={{
                duration: 0.5
              }}
              className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#251464]/80 text-[#FF8A00] border border-[#FF8A00]/40 rounded-full text-xs font-bold shadow-lg shadow-black/20 backdrop-blur-sm"
            >
              <span>
                TRH Recognition Portal
              </span>
            </motion.div>

            {/* Heading */}
            <motion.div
              initial={{
                opacity: 0,
                y: 20
              }}
              animate={{
                opacity: 1,
                y: 0
              }}
              transition={{
                duration: 0.6,
                delay: 0.1
              }}
              className="mt-6 space-y-4"
            >
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight font-['Inter',sans-serif]">

                <span className="block animate-gradient-grey">
                  TRH Workforce
                </span>

                <span className="block animate-gradient-right">
                  Cast Your Vote for Kingdom Excellence
                </span>

              </h1>
            </motion.div>

            {/* Description */}
            <motion.p
              initial={{
                opacity: 0,
                y: 15
              }}
              animate={{
                opacity: 1,
                y: 0
              }}
              transition={{
                duration: 0.5,
                delay: 0.2
              }}
              className="max-w-2xl mx-auto mt-6 text-sm sm:text-base md:text-lg text-[#94A3B8] leading-relaxed"
            >
              Recognise outstanding ministry leaders,
              celebrate exceptional workers, and honour
              teams and departments that exemplify the
              values of H.E.A.R.T.I. Every recognition
              exercise is dynamically configured by church
              leadership, with secure ballot protection
              built into every vote.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{
                opacity: 0,
                y: 15
              }}
              animate={{
                opacity: 1,
                y: 0
              }}
              transition={{
                duration: 0.5,
                delay: 0.3
              }}
              className="flex flex-wrap items-center justify-center gap-4 mt-8"
            >

              {/* View Winners - with Kingdom Excellence animation and motion graphics */}
              <motion.button
                id="hero-btn-view-winners"
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.98, y: 0 }}
                onClick={
                  handleViewWinnersClick
                }
                className="btn-animate-kingdom-gradient relative inline-flex items-center gap-2 px-6 py-3 text-white font-bold rounded-xl text-sm shadow-xl shadow-[#FF8A00]/25 hover:shadow-[#FF8A00]/45 transition-all duration-300 overflow-hidden cursor-pointer group"
              >
                <Award className="w-4 h-4 text-white group-hover:rotate-12 transition-transform duration-300 shrink-0" />

                <span className="font-extrabold tracking-wide drop-shadow-sm">
                  View Winners
                </span>
              </motion.button>

              {/* About - with TRH Workforce silver/grey animation and motion graphics */}
              <motion.button
                id="hero-btn-about"
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.98, y: 0 }}
                onClick={() =>
                  setShowAboutModal(true)
                }
                className="btn-animate-grey-gradient relative inline-flex items-center gap-2 px-6 py-3 text-[#F8FAFC] font-semibold rounded-xl text-sm border border-[#64748B]/70 shadow-lg shadow-black/30 hover:border-[#94A3B8] transition-all duration-300 overflow-hidden cursor-pointer group"
              >
                <Info className="w-4 h-4 text-[#FF8A00] group-hover:rotate-12 transition-transform duration-300 shrink-0" />

                <span className="animate-gradient-grey font-bold tracking-wide">
                  About
                </span>
              </motion.button>

            </motion.div>

            {/* Status */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-6 mt-6 text-xs sm:text-sm text-[#94A3B8] border-t border-[#334155]/60 max-w-lg mx-auto">

              <span className="flex items-center gap-2 font-semibold text-[#F8FAFC]">

                <span className="w-2.5 h-2.5 rounded-full bg-[#FF8A00] animate-pulse" />

                {activeOpenCount} Active Elections Open

              </span>

              <span className="text-[#475569]">
                •
              </span>

              <span className="flex items-center gap-1.5 font-semibold text-[#F8FAFC]">

                <Check className="w-4 h-4 text-[#FF8A00]" />

                Verified Member Ballot Protection

              </span>

            </div>

          </div>
        </section>

        {/* ====================================================
            DIRECTORY
            ==================================================== */}

        <div
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 pb-20 space-y-8"
        >

          {/* ==================================================
              FILTER & SEARCH BAR
              ================================================== */}

          <motion.div
            id="ballot-directory-section"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="bg-[#1E293B] rounded-2xl border border-[#334155] shadow-lg p-4 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4"
          >

            {/* Search */}
            <div className="relative flex-1">

              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />

              <input
                type="text"
                placeholder="Search by title, ministry, or department..."
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(
                    event.target.value
                  )
                }
                className="w-full pl-10 pr-4 py-2.5 bg-[#334155] border border-[#475569] rounded-xl text-xs sm:text-sm text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#FF8A00] transition-all"
              />

            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">

              {/* Scope */}
              <select
                value={selectedScope}
                onChange={(event) => {
                  setSelectedScope(event.target.value);
                }}
                className="px-3.5 py-2.5 bg-[#334155] border border-[#475569] rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00] font-medium cursor-pointer"
              >
                <option value="all">All Voting Scopes</option>
                <option value="church">Church-Wide</option>
                <option value="workforce">Entire Workforce</option>
                <option value="organisation">Organisation Scope</option>
                <option value="department">Department Scope</option>
                <option value="unit">Unit Scope</option>
                <option value="custom">Custom Group</option>
              </select>

              {/* Organisation */}
              <select
                value={selectedOrg}
                onChange={(event) => {
                  setSelectedOrg(
                    event.target.value
                  );

                  setSelectedDept('all');
                }}
                className="px-3.5 py-2.5 bg-[#334155] border border-[#475569] rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00] font-medium cursor-pointer"
              >
                <option value="all">
                  All Organisations
                </option>

                {organisations.map(
                  (organisation) => (
                    <option
                      key={
                        organisation.id
                      }
                      value={
                        organisation.id
                      }
                    >
                      {organisation.name}
                    </option>
                  )
                )}

              </select>

              {/* Department */}
              {selectedOrg !== 'all' && (
                <select
                  value={selectedDept}
                  onChange={(event) =>
                    setSelectedDept(
                      event.target.value
                    )
                  }
                  className="px-3.5 py-2.5 bg-[#334155] border border-[#475569] rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00] font-medium cursor-pointer"
                >

                  <option value="all">
                    All Departments
                  </option>

                  {departments
                    .filter(
                      (department) =>
                        department.organisationId ===
                        selectedOrg
                    )
                    .map(
                      (department) => (
                        <option
                          key={
                            department.id
                          }
                          value={
                            department.id
                          }
                        >
                          {department.name}
                        </option>
                      )
                    )}

                </select>
              )}

              {/* Status Filter */}
              <div className="flex items-center bg-[#0F172A] p-1 rounded-xl border border-[#334155] text-xs">

                {/* All */}
                <button
                  onClick={() =>
                    setStatusFilter(
                      'all'
                    )
                  }
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    statusFilter === 'all'
                      ? 'bg-gradient-to-r from-[#FF8A00] to-[#E85B00] text-slate-950 shadow-md font-bold'
                      : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                  }`}
                >
                  All
                </button>

                {/* Open */}
                <button
                  onClick={() =>
                    setStatusFilter(
                      'open'
                    )
                  }
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    statusFilter === 'open'
                      ? 'bg-gradient-to-r from-[#FF8A00] to-[#E85B00] text-slate-950 shadow-md font-bold'
                      : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                  }`}
                >
                  Open
                </button>

                {/* Results */}
                <button
                  onClick={() =>
                    setStatusFilter(
                      'published'
                    )
                  }
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    statusFilter ===
                    'published'
                      ? 'bg-gradient-to-r from-[#FF8A00] to-[#E85B00] text-slate-950 shadow-md font-bold'
                      : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                  }`}
                >
                  Results
                </button>

              </div>

            </div>

          </motion.div>

          {/* ==================================================
              EXERCISES
              ================================================== */}

          {loading ? (
            <div className="py-16 text-center">

              <div className="w-10 h-10 border-4 border-[#FF8A00] border-t-transparent rounded-full animate-spin mx-auto mb-3" />

              <p className="text-sm text-[#94A3B8]">
                Loading voting exercises
                from church database...
              </p>

            </div>
          ) : filteredExercises.length === 0 ? (

            /* ==================================================
               EMPTY STATE
               ================================================== */

            <div className="bg-[#1E293B] rounded-3xl border border-dashed border-[#334155] p-12 text-center space-y-3">

              <div className="w-12 h-12 bg-[#334155] rounded-2xl flex items-center justify-center text-[#FF8A00] mx-auto">

                <Vote className="w-6 h-6" />

              </div>

              <h3 className="text-base font-bold text-[#F8FAFC]">
                No Voting Exercises Match Your Filters
              </h3>

              <p className="text-xs text-[#94A3B8] max-w-sm mx-auto">
                Try adjusting your search
                query, selecting another
                organisation, or clearing
                your filters.
              </p>

              <button
                onClick={() => {
                  setSelectedOrg('all');
                  setSelectedDept('all');
                  setStatusFilter('all');
                  setSearchQuery('');
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#334155] hover:bg-[#475569] text-[#F8FAFC] rounded-xl text-xs font-semibold transition-colors mt-2"
              >
                Reset Filters
              </button>

            </div>

          ) : (

            /* ==================================================
               EXERCISES GRID
               ================================================== */

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

              {filteredExercises.map(
                (exercise, index) => {

                  const isOpen =
                    exercise.status ===
                    'open';

                  const isScheduled =
                    exercise.status ===
                    'scheduled';

                  const isClosed =
                    exercise.status ===
                      'closed' ||
                    exercise.status ===
                      'archived';

                  return (
                    <motion.div
                      key={exercise.id}
                      id={`exercise-card-${exercise.id}`}
                      initial={{ opacity: 0, y: 36, scale: 0.97 }}
                      whileInView={{ opacity: 1, y: 0, scale: 1 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{
                        duration: 0.5,
                        delay: (index % 3) * 0.08,
                        ease: [0.22, 1, 0.36, 1]
                      }}
                      whileHover={{ y: -6, transition: { duration: 0.25 } }}
                      className="bg-[#1E293B] rounded-2xl border border-[#334155] shadow-lg hover:border-[#FF8A00]/50 transition-all flex flex-col justify-between overflow-hidden group hover:shadow-[0_15px_35px_rgba(255,138,0,0.12)]"
                    >

                      {/* Card Body */}
                      <div className="p-6 space-y-4">

                        {/* Organisation & Status */}
                        <div className="flex items-center justify-between gap-2">

                          <div className="flex items-center gap-1.5 flex-wrap">
                            {exercise.scopeType && (
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
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
                                {exercise.scopeType === 'church'
                                  ? 'Church-Wide'
                                  : exercise.scopeType === 'workforce'
                                  ? 'Workforce'
                                  : exercise.scopeType === 'department'
                                  ? 'Department'
                                  : exercise.scopeType === 'unit'
                                  ? 'Unit Scope'
                                  : exercise.scopeType === 'custom'
                                  ? 'Custom'
                                  : 'Organisation'}
                              </span>
                            )}

                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#F8FAFC] bg-[#334155] px-2 py-0.5 rounded-md">
                              <Building2 className="w-3 h-3 text-[#FF8A00]" />
                              <span className="truncate max-w-[120px]">
                                {exercise.organisationName || 'Church Wide'}
                              </span>
                            </span>
                          </div>

                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                              isOpen
                                ? 'bg-gradient-to-r from-[#FF8A00] to-[#E85B00] text-slate-950'
                                : isScheduled
                                ? 'bg-[#251464] text-[#F8FAFC] border border-[#FF8A00]/40'
                                : 'bg-[#334155] text-[#94A3B8]'
                            }`}
                          >

                            {isOpen && (
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-pulse" />
                            )}

                            {exercise.status}

                          </span>

                        </div>

                        {/* Title */}
                        <div>

                          <h3 className="text-base font-bold font-display text-[#F8FAFC] group-hover:text-[#FF8A00] transition-colors line-clamp-2">
                            {exercise.title}
                          </h3>

                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {exercise.departmentName && (
                              <p className="text-xs text-[#FF8A00] font-medium flex items-center gap-1">
                                <Layers className="w-3 h-3" />
                                <span>{exercise.departmentName}</span>
                              </p>
                            )}

                            {exercise.unitName && (
                              <p className="text-xs text-cyan-300 font-medium flex items-center gap-1">
                                <FolderTree className="w-3 h-3 text-cyan-400" />
                                <span>{exercise.unitName}</span>
                              </p>
                            )}
                          </div>

                        </div>

                        {/* Description */}
                        {exercise.description && (
                          <p className="text-xs text-[#94A3B8] line-clamp-2 leading-relaxed">
                            {exercise.description}
                          </p>
                        )}

                        {/* Metadata */}
                        <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-[#94A3B8] border-t border-[#334155]">

                          <span className="flex items-center gap-1">

                            <Award className="w-3.5 h-3.5 text-[#FF8A00]" />

                            {exercise.nomineeCount ||
                              0}{' '}
                            Nominees

                          </span>

                          <span className="flex items-center gap-1">

                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />

                            {exercise.criteriaCount ||
                              0}{' '}
                            Criteria

                          </span>

                          <span className="flex items-center gap-1">

                            <Clock className="w-3.5 h-3.5 text-[#94A3B8]" />

                            {new Date(
                              exercise.endTime
                            ).toLocaleDateString()}

                          </span>

                        </div>

                      </div>

                      {/* Card Footer */}
                      <div className="p-4 bg-[#0F172A]/70 border-t border-[#334155] flex items-center justify-between gap-2">

                        {exercise.resultsPublished ? (
                          <button
                            onClick={() =>
                              handleViewResults(
                                exercise.id
                              )
                            }
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FF8A00] hover:text-[#E85B00] transition-colors"
                          >

                            <Award className="w-3.5 h-3.5" />

                            <span>
                              View Certified Results
                            </span>

                          </button>
                        ) : (
                          <span className="text-xs text-[#94A3B8] italic">
                            {isClosed
                              ? 'Results pending release'
                              : 'Results unreleased'}
                          </span>
                        )}

                        <button
                          onClick={() =>
                            handleOpenExercise(
                              exercise.id
                            )
                          }
                          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            isOpen
                              ? 'bg-gradient-to-r from-[#FF8A00] to-[#E85B00] hover:from-[#E85B00] hover:to-[#FF8A00] text-slate-950 shadow-md shadow-[#FF8A00]/20'
                              : 'bg-[#334155] hover:bg-[#475569] text-[#F8FAFC]'
                          }`}
                        >

                          <span>
                            {isOpen
                              ? 'Cast Vote'
                              : 'View Ballot'}
                          </span>

                          <ArrowRight className="w-3.5 h-3.5" />

                        </button>

                      </div>

                    </motion.div>
                  );
                }
              )}

            </div>
          )}

          {/* ==================================================
             KINGDOM VALUES SHOWCASE (H.E.A.R.T.I) - SCROLL MOTION
             ================================================== */}
          <motion.section
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="pt-10 sm:pt-14 border-t border-[#334155]/60 space-y-6 sm:space-y-8"
          >
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF8A00]/10 border border-[#FF8A00]/30 text-[#FF8A00] text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>The Standard of Kingdom Service</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] tracking-tight">
                  Guided by the H.E.A.R.T.I Core Values
                </h2>
                <p className="text-sm sm:text-base text-[#94A3B8] max-w-2xl">
                  Every nomination and vote cast honors godly stewardship and consecrated labor across TRH Ministries Global.
                </p>
              </div>

              <div className="text-xs text-[#94A3B8] font-mono flex items-center gap-2 bg-[#1E293B] px-3.5 py-2 rounded-xl border border-[#334155] self-start md:self-auto">
                <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                <span>Kingdom Criteria Enforced</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {[
                {
                  letter: 'H',
                  name: 'Honour',
                  accent: 'from-amber-500/20 to-amber-600/5 text-amber-400 border-amber-500/30',
                  badge: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
                  desc: 'Esteeming one another with reverent biblical regard, recognizing spiritual leadership, and treating every member as Christ\'s ambassador.',
                  scripture: 'Romans 12:10'
                },
                {
                  letter: 'E',
                  name: 'Excellence',
                  accent: 'from-[#FF8A00]/20 to-[#FF8A00]/5 text-[#FF8A00] border-[#FF8A00]/30',
                  badge: 'bg-[#FF8A00]/10 text-[#FF8A00] border-[#FF8A00]/30',
                  desc: 'Offering our utmost best to the King in craftsmanship, preparation, and presentation; rejecting mediocrity in sacred work.',
                  scripture: 'Colossians 3:23'
                },
                {
                  letter: 'A',
                  name: 'Accountability',
                  accent: 'from-blue-500/20 to-blue-600/5 text-blue-400 border-blue-500/30',
                  badge: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
                  desc: 'Transparent stewardship before God and church authorities, welcoming righteous oversight and answering faithfully for every trust.',
                  scripture: 'Luke 16:10'
                },
                {
                  letter: 'R',
                  name: 'Results',
                  accent: 'from-emerald-500/20 to-emerald-600/5 text-emerald-400 border-emerald-500/30',
                  badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
                  desc: 'Bearing lasting spiritual fruit that transforms lives, expands ministry capacity, and establishes tangible Kingdom impact.',
                  scripture: 'John 15:16'
                },
                {
                  letter: 'T',
                  name: 'Transforming Love',
                  accent: 'from-rose-500/20 to-rose-600/5 text-rose-400 border-rose-500/30',
                  badge: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
                  desc: 'Ministering with supernatural empathy and patience, uplifting brethren and reflecting the redeeming heart of Christ.',
                  scripture: '1 Corinthians 13:13'
                },
                {
                  letter: 'I',
                  name: 'Innovation',
                  accent: 'from-cyan-500/20 to-cyan-600/5 text-cyan-400 border-cyan-500/30',
                  badge: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
                  desc: 'Embracing divine wisdom and modern technology to solve challenges, advance the Gospel, and multiply ministry reach.',
                  scripture: 'Proverbs 3:5-6'
                }
              ].map((val, idx) => (
                <motion.div
                  key={val.letter}
                  initial={{ opacity: 0, y: 32, scale: 0.98 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{
                    duration: 0.45,
                    delay: (idx % 3) * 0.08,
                    ease: [0.22, 1, 0.36, 1]
                  }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className={`relative p-5 sm:p-6 rounded-2xl bg-gradient-to-b ${val.accent} bg-[#1E293B] border border-[#334155] shadow-lg flex flex-col justify-between group`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-[#0F172A] border border-[#334155] flex items-center justify-center font-black text-lg tracking-wider">
                        {val.letter}
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${val.badge}`}>
                        {val.scripture}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-[#F8FAFC] group-hover:text-[#FF8A00] transition-colors">
                      {val.name}
                    </h3>

                    <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                      {val.desc}
                    </p>
                  </div>

                  <div className="pt-4 mt-2 border-t border-[#334155]/40 flex items-center justify-between text-[11px] text-[#64748B]">
                    <span>Workforce Honor Pillar</span>
                    <Check className="w-3.5 h-3.5 text-[#10B981]" />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* ==================================================
             FOUR PILLARS OF BALLOT INTEGRITY - SCROLL MOTION
             ================================================== */}
          <motion.section
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="pt-10 sm:pt-14 border-t border-[#334155]/60 space-y-6 sm:space-y-8"
          >
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified Governance</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] tracking-tight">
                Architected for Absolute Ballot Trust
              </h2>
              <p className="text-xs sm:text-sm text-[#94A3B8]">
                Every single vote cast inside TRH Ministries is cryptographically counted and verifiable.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {[
                {
                  title: 'Credential Verification',
                  desc: 'Voters authenticate with approved church email or PIN codes, preventing ghost ballots.',
                  icon: Users
                },
                {
                  title: 'Secret Ballot Isolation',
                  desc: 'Vote tallies update through atomic transactions while individual choices remain sealed.',
                  icon: ShieldCheck
                },
                {
                  title: 'Departmental Scope',
                  desc: 'Church-wide, Workforce, Organisation, Department, and Unit scopes safeguard autonomy.',
                  icon: Building2
                },
                {
                  title: 'Permanent Hall of Fame',
                  desc: 'Elected honorees are perpetually archived with downloadable certificates and statuettes.',
                  icon: Trophy
                }
              ].map((pillar, pIdx) => {
                const IconComponent = pillar.icon;
                return (
                  <motion.div
                    key={pillar.title}
                    initial={{ opacity: 0, y: 28, scale: 0.98 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{
                      duration: 0.45,
                      delay: (pIdx % 4) * 0.08,
                      ease: [0.22, 1, 0.36, 1]
                    }}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    className="p-5 rounded-2xl bg-[#1E293B] border border-[#334155] shadow-lg flex flex-col justify-between space-y-3"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#0F172A] border border-[#334155] flex items-center justify-center text-[#FF8A00]">
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="text-sm font-bold text-[#F8FAFC]">
                        {pillar.title}
                      </h4>
                      <p className="text-xs text-[#94A3B8] leading-relaxed">
                        {pillar.desc}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>

          {/* ==================================================
             HALL OF FAME CALLOUT BANNER - SCROLL MOTION
             ================================================== */}
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#1E293B] via-[#0F172A] to-[#1E293B] border border-[#FF8A00]/40 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6"
          >
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-[#FF8A00]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-[#FF8A00] to-[#FFB800] p-0.5 shadow-lg shadow-[#FF8A00]/20 flex-shrink-0">
                <div className="w-full h-full bg-[#0F172A] rounded-[14px] flex items-center justify-center text-[#FF8A00]">
                  <Crown className="w-8 h-8" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#FF8A00]">
                    Perpetual Honors Archive
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF8A00]" />
                  <span className="text-xs text-[#94A3B8]">All Eras & Departments</span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-[#F8FAFC]">
                  Explore the TRH Hall of Fame Gallery
                </h3>
                <p className="text-xs sm:text-sm text-[#94A3B8] max-w-xl">
                  Celebrate previous workforce winners, view their 3D Gold Pedestal Statuettes, and download high-resolution certificates.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleViewWinnersClick}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#FF8A00] to-[#E85B00] hover:from-[#E85B00] hover:to-[#FF8A00] text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-[#FF8A00]/20 transition-all transform hover:scale-105 active:scale-95 flex-shrink-0"
            >
              <Trophy className="w-4 h-4" />
              <span>Enter Hall of Fame</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>

        </div>

      </div>

      {/* ========================================================
          ABOUT MODAL
          ======================================================== */}

      {showAboutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">

          <div className="bg-[#1E293B] border border-[#334155] rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl text-[#F8FAFC] p-6 sm:p-8 space-y-6">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#334155] pb-4">

              <div className="flex items-center gap-2.5">

                <div className="w-10 h-10 rounded-xl bg-[#251464] border border-[#FF8A00]/40 flex items-center justify-center text-[#FF8A00]">

                  <Sparkles className="w-5 h-5" />

                </div>

                <div>

                  <h3 className="text-lg font-bold font-display text-[#F8FAFC]">
                    About TRH Workforce
                  </h3>

                  <p className="text-xs text-[#94A3B8]">
                    TRH Ministries Global Voting &amp;
                    Recognition System
                  </p>

                </div>

              </div>

              <button
                onClick={() =>
                  setShowAboutModal(false)
                }
                className="w-8 h-8 rounded-full bg-[#334155] hover:bg-[#475569] text-[#94A3B8] hover:text-[#F8FAFC] flex items-center justify-center transition-colors"
                aria-label="Close about dialog"
              >
                <X className="w-4 h-4" />
              </button>

            </div>

            {/* Modal Body */}
            <div className="space-y-4 text-xs sm:text-sm text-[#94A3B8] leading-relaxed">

              <p>
                <strong className="text-[#F8FAFC]">
                  TRH Workforce
                </strong>{' '}
                is the dedicated church
                recognition and ballot
                management platform for{' '}
                <strong className="text-[#FF8A00]">
                  TRH Ministries Global
                </strong>
                . It provides transparent,
                tamper-proof, and spiritually
                inspiring voting across all
                church ministries, departments,
                and leadership arms.
              </p>

              {/* H.E.A.R.T.I. */}
              <div className="bg-[#0F172A] rounded-2xl border border-[#334155] p-4 sm:p-5 space-y-3">

                <h4 className="text-xs uppercase font-bold tracking-wider text-[#FF8A00] flex items-center gap-1.5">

                  <Heart className="w-3.5 h-3.5" />

                  Our Core H.E.A.R.T.I. Kingdom Values

                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">

                  <div className="p-2.5 rounded-xl bg-[#1E293B] border border-[#334155]">

                    <span className="font-bold text-[#F8FAFC]">
                      H — Honour:
                    </span>

                    <p className="text-[#94A3B8] mt-0.5">
                      Valuing leaders, servants,
                      and one another with
                      Christ-like reverence.
                    </p>

                  </div>

                  <div className="p-2.5 rounded-xl bg-[#1E293B] border border-[#334155]">

                    <span className="font-bold text-[#F8FAFC]">
                      E — Excellence:
                    </span>

                    <p className="text-[#94A3B8] mt-0.5">
                      Bringing our highest craft,
                      preparation, and devotion
                      to God’s house.
                    </p>

                  </div>

                  <div className="p-2.5 rounded-xl bg-[#1E293B] border border-[#334155]">

                    <span className="font-bold text-[#F8FAFC]">
                      A — Accountability:
                    </span>

                    <p className="text-[#94A3B8] mt-0.5">
                      Faithfulness, stewardship,
                      and transparent
                      responsibility.
                    </p>

                  </div>

                  <div className="p-2.5 rounded-xl bg-[#1E293B] border border-[#334155]">

                    <span className="font-bold text-[#F8FAFC]">
                      R — Results:
                    </span>

                    <p className="text-[#94A3B8] mt-0.5">
                      Focusing on high kingdom
                      impact, measurable
                      fruitfulness, and diligent
                      execution.
                    </p>

                  </div>

                  <div className="p-2.5 rounded-xl bg-[#1E293B] border border-[#334155]">

                    <span className="font-bold text-[#F8FAFC]">
                      T — Transforming Love:
                    </span>

                    <p className="text-[#94A3B8] mt-0.5">
                      Expressing unconditional
                      compassion, Christ-like
                      grace, and servant
                      leadership.
                    </p>

                  </div>

                  <div className="p-2.5 rounded-xl bg-[#1E293B] border border-[#334155]">

                    <span className="font-bold text-[#F8FAFC]">
                      I — Innovation:
                    </span>

                    <p className="text-[#94A3B8] mt-0.5">
                      Creative forward-thinking,
                      continual improvement,
                      and modern ministry
                      excellence.
                    </p>

                  </div>

                </div>

              </div>

              {/* Ballot Protection */}
              <div className="space-y-2">

                <h4 className="text-xs uppercase font-bold tracking-wider text-[#F8FAFC]">
                  Ballot Protection &amp; Integrity
                </h4>

                <ul className="list-disc list-inside space-y-1.5 text-xs text-[#94A3B8]">

                  <li>
                    Atomic Firestore database
                    transactions prevent
                    duplicate vote submissions.
                  </li>

                  <li>
                    Members authenticate
                    securely with unique voter
                    credentials or verified
                    church accounts.
                  </li>

                  <li>
                    Every ballot is strictly
                    confidential; individual
                    choices are sealed and
                    tallied automatically.
                  </li>

                  <li>
                    Immutable audit logging
                    records all administrative
                    lifecycle actions.
                  </li>

                </ul>

              </div>

            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-[#334155] flex justify-end">

              <button
                onClick={() =>
                  setShowAboutModal(false)
                }
                className="px-5 py-2.5 bg-[#FF8A00] hover:bg-[#E85B00] text-slate-950 font-bold rounded-xl text-xs transition-colors"
              >
                Close &amp; Continue Voting
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};