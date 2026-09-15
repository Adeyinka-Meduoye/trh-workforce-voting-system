import React, { useState, useEffect } from 'react';
import { VotingExercise, VotingResult } from '../../types';
import { getVotingExerciseById, getVotingResults } from '../../services/db';
import {
  Award,
  Crown,
  Trophy,
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Share2,
  Building2,
  Layers,
  Sparkles,
  BarChart2
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface PublicResultsPageProps {
  exerciseId: string;
  onBack: () => void;
  onVoteAgain?: (exerciseId: string) => void;
}

export const PublicResultsPage: React.FC<PublicResultsPageProps> = ({
  exerciseId,
  onBack,
  onVoteAgain
}) => {
  const [exercise, setExercise] = useState<VotingExercise | null>(null);
  const [results, setResults] = useState<VotingResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [ex, res] = await Promise.all([
          getVotingExerciseById(exerciseId),
          getVotingResults(exerciseId)
        ]);
        setExercise(ex);
        setResults(res);

        // If results are published and winners exist, trigger light victory confetti
        if (ex?.resultsPublished && res?.winners && res.winners.length > 0) {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.5 }
          });
        }
      } catch (e) {
        console.error('Error loading results:', e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [exerciseId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <div className="w-10 h-10 border-4 border-[#FF8A00] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-[#94A3B8] font-medium">Computing and verifying certified election results...</p>
      </div>
    );
  }

  if (!exercise || !results) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center bg-[#1E293B] rounded-2xl border border-[#334155] shadow-lg p-8 mt-8">
        <AlertCircle className="w-12 h-12 text-[#FF8A00] mx-auto mb-4" />
        <h2 className="text-xl font-bold text-[#F8FAFC] mb-2">Results Not Available</h2>
        <p className="text-[#94A3B8] mb-6">Could not load results for this voting exercise.</p>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF8A00] text-slate-950 font-bold rounded-xl text-sm hover:bg-[#E85B00] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Directory
        </button>
      </div>
    );
  }

  // If results are not published yet and viewing as public voter
  if (!exercise.resultsPublished) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center bg-[#1E293B] rounded-2xl border border-[#334155] shadow-lg p-8 mt-8 space-y-4">
        <div className="w-12 h-12 bg-[#251464] text-[#FF8A00] border border-[#FF8A00]/30 rounded-2xl flex items-center justify-center mx-auto">
          <Award className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-[#F8FAFC] font-display">Results Awaiting Official Publication</h2>
        <p className="text-sm text-[#94A3B8] leading-relaxed">
          The election results for <strong className="text-[#F8FAFC]">{exercise.title}</strong> have not yet been released by the church administrators. Please check back shortly.
        </p>
        <div className="pt-2">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#334155] hover:bg-[#475569] text-[#F8FAFC] rounded-xl text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Voting Portal
          </button>
        </div>
      </div>
    );
  }

  const { winners, isTie, nomineeResults, totalVotes, totalEligible, participationRate } = results;

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 space-y-8 animate-fadeIn">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Directory
        </button>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-[#251464] text-[#FF8A00] border border-[#FF8A00]/40 text-xs font-bold rounded-full">
            <Sparkles className="w-3.5 h-3.5" />
            Official Certified Results
          </span>
        </div>
      </div>

      {/* Header Info */}
      <div className="bg-[#1E293B] rounded-2xl border border-[#334155] shadow-xl p-6 sm:p-8 space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#334155] text-[#F8FAFC] font-semibold rounded-md border border-[#475569]">
            <Building2 className="w-3.5 h-3.5 text-[#FF8A00]" />
            {exercise.organisationName}
          </span>
          {exercise.departmentName && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#251464] text-[#FF8A00] font-semibold rounded-md border border-[#FF8A00]/30">
              <Layers className="w-3.5 h-3.5 text-[#FF8A00]" />
              {exercise.departmentName}
            </span>
          )}
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#334155] text-[#F8FAFC] font-semibold rounded-md border border-[#475569]">
            <Award className="w-3.5 h-3.5 text-[#FF8A00]" />
            {exercise.categoryName || 'Recognition'}
          </span>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-[#F8FAFC] tracking-tight">
            {exercise.title} — Official Results
          </h1>
          {exercise.description && (
            <p className="mt-2 text-sm text-[#94A3B8]">{exercise.description}</p>
          )}
        </div>

        {/* Turnout and Participation Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[#334155]">
          <div className="p-3 bg-[#0F172A] rounded-xl border border-[#334155]">
            <div className="text-xs text-[#94A3B8] font-medium">Total Votes Cast</div>
            <div className="text-xl font-bold text-[#F8FAFC] font-display mt-0.5">{totalVotes}</div>
          </div>
          <div className="p-3 bg-[#0F172A] rounded-xl border border-[#334155]">
            <div className="text-xs text-[#94A3B8] font-medium">Registered Voters</div>
            <div className="text-xl font-bold text-[#F8FAFC] font-display mt-0.5">{totalEligible}</div>
          </div>
          <div className="p-3 bg-[#0F172A] rounded-xl border border-[#334155]">
            <div className="text-xs text-[#94A3B8] font-medium">Turnout Rate</div>
            <div className="text-xl font-bold text-[#FF8A00] font-display mt-0.5">{participationRate}%</div>
          </div>
          <div className="p-3 bg-[#0F172A] rounded-xl border border-[#334155]">
            <div className="text-xs text-[#94A3B8] font-medium">Nominees Evaluated</div>
            <div className="text-xl font-bold text-[#F8FAFC] font-display mt-0.5">{nomineeResults.length}</div>
          </div>
        </div>
      </div>

      {/* WINNER SHOWCASE OR TIE BANNER */}
      {totalVotes === 0 ? (
        <div className="bg-[#1E293B] rounded-2xl border border-dashed border-[#334155] p-8 text-center text-[#94A3B8] text-sm">
          No votes were cast during this voting cycle.
        </div>
      ) : isTie ? (
        <div className="bg-gradient-to-br from-[#251464] to-[#1E293B] rounded-2xl border border-[#FF8A00]/40 p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF8A00] text-slate-950 flex items-center justify-center shadow-md">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#F8FAFC] font-display">
                Official Result: Joint Winners (Tie)
              </h2>
              <p className="text-xs text-[#94A3B8]">
                Multiple nominees received the exact same top vote count ({winners[0]?.voteCount} votes each).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
            {winners.map((w) => (
              <div
                key={w.nomineeId}
                className="bg-[#0F172A] rounded-xl p-4 border border-[#334155] shadow-sm flex items-center gap-3"
              >
                <div className="w-12 h-12 rounded-xl bg-[#251464] overflow-hidden shrink-0 border border-[#FF8A00]/40">
                  {w.photoUrl ? (
                    <img src={w.photoUrl} alt={w.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-[#FF8A00]">
                      {w.displayName.charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#F8FAFC]">{w.displayName}</h4>
                  <div className="text-xs text-[#FF8A00] font-semibold mt-0.5">
                    {w.voteCount} votes ({w.percentage}%)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : winners.length > 0 ? (
        <div className="bg-gradient-to-r from-[#251464] via-[#1E293B] to-[#0F172A] text-[#F8FAFC] rounded-2xl p-6 sm:p-8 shadow-2xl border border-[#334155] relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-[#FF8A00]/20 rounded-full blur-3xl"></div>

          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
            {/* Winner Portrait */}
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-[#0F172A] border-2 border-[#FF8A00] overflow-hidden shadow-2xl shrink-0 relative">
              {winners[0].photoUrl ? (
                <img
                  src={winners[0].photoUrl}
                  alt={winners[0].displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-display font-bold text-[#FF8A00] text-4xl">
                  {winners[0].displayName.charAt(0)}
                </div>
              )}
              <div className="absolute top-2 right-2 bg-[#FF8A00] text-slate-950 p-1.5 rounded-full shadow">
                <Crown className="w-4 h-4 fill-slate-950" />
              </div>
            </div>

            <div className="flex-1 text-center md:text-left space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FF8A00]/20 border border-[#FF8A00]/40 text-[#FF8A00] rounded-full text-xs font-bold">
                <Trophy className="w-3.5 h-3.5" /> First Place Recipient
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold font-display text-[#F8FAFC]">
                {winners[0].displayName}
              </h2>
              {(winners[0].roleOrTitle || winners[0].department) && (
                <p className="text-sm text-[#FF8A00]">
                  {[winners[0].roleOrTitle, winners[0].department].filter(Boolean).join(' • ')}
                </p>
              )}
              <p className="text-xs text-[#94A3B8] pt-1">
                Received a total of <strong className="text-[#FF8A00] font-bold">{winners[0].voteCount} votes</strong> ({winners[0].percentage}% of all cast ballots).
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* FULL RESULTS BREAKDOWN TABLE / CARDS */}
      <div className="bg-[#1E293B] rounded-2xl border border-[#334155] shadow-lg p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-[#FF8A00]" />
            <h2 className="text-base font-bold text-[#F8FAFC] font-display">
              Comprehensive Nominee Standings
            </h2>
          </div>
          <span className="text-xs text-[#94A3B8] font-mono">
            {nomineeResults.length} Nominees Evaluated
          </span>
        </div>

        <div className="space-y-4">
          {nomineeResults.map((nominee, idx) => {
            const isFirst = idx === 0 && nominee.voteCount > 0;
            const rankLabel = idx === 0 ? '1st' : idx === 1 ? '2nd' : idx === 2 ? '3rd' : `${idx + 1}th`;

            return (
              <div
                key={nominee.nomineeId}
                className={`p-4 rounded-xl border transition-all ${
                  isFirst
                    ? 'bg-[#251464]/30 border-[#FF8A00]/50'
                    : 'bg-[#0F172A] border-[#334155]'
                }`}
              >
                <div className="flex items-center justify-between gap-4 mb-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                        idx === 0
                          ? 'bg-[#FF8A00] text-slate-950'
                          : idx === 1
                          ? 'bg-[#334155] text-[#F8FAFC]'
                          : idx === 2
                          ? 'bg-[#251464] text-[#FF8A00]'
                          : 'bg-[#0F172A] text-[#94A3B8] border border-[#334155]'
                      }`}
                    >
                      {rankLabel}
                    </span>

                    <div className="w-9 h-9 rounded-lg bg-[#334155] overflow-hidden shrink-0">
                      {nominee.photoUrl ? (
                        <img
                          src={nominee.photoUrl}
                          alt={nominee.displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-[#FF8A00] text-xs">
                          {nominee.displayName.charAt(0)}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-bold text-[#F8FAFC] break-words whitespace-normal">
                        {nominee.displayName}
                      </div>
                      {(nominee.roleOrTitle || nominee.department) && (
                        <div className="text-xs text-[#94A3B8] break-words whitespace-normal">
                          {[nominee.roleOrTitle, nominee.department].filter(Boolean).join(' • ')}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-[#F8FAFC] font-display">
                      {nominee.voteCount} <span className="text-xs font-normal text-[#94A3B8]">votes</span>
                    </div>
                    <div className="text-xs font-semibold text-[#FF8A00]">
                      {nominee.percentage}%
                    </div>
                  </div>
                </div>

                {/* Progress Percentage Bar */}
                <div className="w-full h-2.5 bg-[#334155] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      isFirst ? 'bg-gradient-to-r from-[#FF8A00] to-[#E85B00]' : 'bg-[#475569]'
                    }`}
                    style={{ width: `${nominee.percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
