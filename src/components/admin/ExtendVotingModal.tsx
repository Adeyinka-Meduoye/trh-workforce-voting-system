import React, { useState, useEffect } from 'react';
import { VotingExercise } from '../../types';
import { extendVotingPeriod } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useActionModal } from '../../context/ActionModalContext';
import {
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  Timer,
  RefreshCw,
  Sparkles
} from 'lucide-react';

interface ExtendVotingModalProps {
  exercise: VotingExercise | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: VotingExercise) => void;
}

export const ExtendVotingModal: React.FC<ExtendVotingModalProps> = ({
  exercise,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { adminUser, userProfile } = useAuth();
  const { notifyAction } = useActionModal();

  const [newEndTimeInput, setNewEndTimeInput] = useState('');
  const [reopenIfClosed, setReopenIfClosed] = useState(true);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // When modal opens or exercise changes, initialize dates
  useEffect(() => {
    if (exercise && isOpen) {
      const now = new Date();
      const currentEnd = new Date(exercise.endTime);
      
      // Base extension date: if currentEnd is in the future, extend from currentEnd, otherwise extend from now
      const baseDate = currentEnd.getTime() > now.getTime() ? currentEnd : now;
      // Default extension: +24 hours
      const defaultExtended = new Date(baseDate.getTime() + 24 * 60 * 60 * 1000);
      
      setNewEndTimeInput(toLocalISOString(defaultExtended));
      setReopenIfClosed(exercise.status === 'closed');
      setReason('');
      setErrorMsg('');
    }
  }, [exercise, isOpen]);

  if (!isOpen || !exercise) return null;

  // Helper to format Date for <input type="datetime-local">
  function toLocalISOString(date: Date): string {
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  // Quick extension presets
  const applyPreset = (hours: number) => {
    const now = new Date();
    const currentEnd = new Date(exercise.endTime);
    const baseDate = currentEnd.getTime() > now.getTime() ? currentEnd : now;
    const targetDate = new Date(baseDate.getTime() + hours * 60 * 60 * 1000);
    setNewEndTimeInput(toLocalISOString(targetDate));
    setErrorMsg('');
  };

  const actor = {
    id: adminUser?.id || userProfile?.uid || 'superadmin',
    name: adminUser?.fullName || userProfile?.displayName || 'Super Admin',
    email: adminUser?.email || userProfile?.email || 'admin@trhministries.org',
    role: adminUser?.role || 'super_admin'
  };

  const currentEndDate = new Date(exercise.endTime);
  const isCurrentlyExpired = currentEndDate.getTime() <= Date.now();
  const newEndDate = newEndTimeInput ? new Date(newEndTimeInput) : null;
  const isValidNewEnd = newEndDate && !isNaN(newEndDate.getTime()) && newEndDate.getTime() > Date.now();

  const handleExtend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidNewEnd || !newEndDate) {
      setErrorMsg('Please choose a valid future date and time for the new deadline.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const updated = await extendVotingPeriod(
        exercise.id,
        newEndDate.toISOString(),
        {
          reopenIfClosed,
          reason: reason.trim() || undefined
        },
        actor
      );

      notifyAction({
        type: 'update',
        title: 'Voting Period Extended',
        details: `Extended deadline for "${exercise.title}" to ${newEndDate.toLocaleString()}.${
          reopenIfClosed && (exercise.status === 'closed' || exercise.status === 'scheduled')
            ? ' Voting cycle has been automatically reopened.'
            : ''
        }`,
        resourceName: exercise.title,
        actorName: actor.name,
        actorRole: actor.role
      });

      onSuccess(updated);
      onClose();
    } catch (err: any) {
      console.error('Error extending voting period:', err);
      setErrorMsg(err.message || 'Failed to extend voting period. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div
        id="extend-voting-period-modal"
        className="bg-[#1E293B] border border-[#334155] rounded-2xl sm:rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl space-y-0 my-auto max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-b from-[#251464]/60 to-transparent border-b border-[#334155] flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#251464] border border-[#FF8A00]/40 flex items-center justify-center text-[#FF8A00] shrink-0 shadow-md">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-[#F8FAFC] font-display">
                  Extend Voting Cycle Period
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    exercise.status === 'open'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : exercise.status === 'closed'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {exercise.status}
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] mt-1 line-clamp-1">
                {exercise.title}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-[#94A3B8] hover:text-[#F8FAFC] p-1.5 rounded-xl hover:bg-[#334155] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleExtend} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto overscroll-contain flex-1">
          {/* Current Deadline Overview Box */}
          <div className="p-4 bg-[#0F172A] rounded-2xl border border-[#334155] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[#94A3B8] block text-[11px]">Current Scheduled Deadline</span>
              <span className="font-semibold text-[#F8FAFC] mt-0.5 block">
                {currentEndDate.toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })}
              </span>
            </div>
            <div>
              <span className="text-[#94A3B8] block text-[11px]">Window Status</span>
              <span
                className={`font-semibold mt-0.5 inline-flex items-center gap-1.5 ${
                  isCurrentlyExpired ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {isCurrentlyExpired ? (
                  <>
                    <AlertCircle className="w-3.5 h-3.5" />
                    Voting Window Closed (Expired)
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Active Window
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Quick Extension Presets */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#F8FAFC] flex items-center justify-between">
              <span>Quick Extension Options</span>
              <span className="text-[11px] font-normal text-[#94A3B8]">
                From {isCurrentlyExpired ? 'Current Time' : 'Current Deadline'}
              </span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[
                { label: '+1 Hour', hours: 1 },
                { label: '+6 Hours', hours: 6 },
                { label: '+12 Hours', hours: 12 },
                { label: '+1 Day', hours: 24 },
                { label: '+3 Days', hours: 72 },
                { label: '+1 Week', hours: 168 }
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset.hours)}
                  className="px-2 py-2 bg-[#334155] hover:bg-[#475569] text-[#F8FAFC] rounded-xl text-xs font-semibold text-center border border-slate-700 hover:border-[#FF8A00]/50 transition-all cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date & Time Picker */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#F8FAFC] flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#FF8A00]" />
              <span>New Voting Deadline (Date & Time)</span>
            </label>
            <input
              type="datetime-local"
              id="input-extended-end-time"
              required
              value={newEndTimeInput}
              min={toLocalISOString(new Date())}
              onChange={(e) => {
                setNewEndTimeInput(e.target.value);
                setErrorMsg('');
              }}
              className="w-full px-4 py-2.5 bg-[#0F172A] border border-[#475569] rounded-xl text-xs sm:text-sm text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00] transition-colors"
            />
          </div>

          {/* Reopen Toggle */}
          <div className="p-3.5 bg-[#0F172A] rounded-xl border border-[#334155] flex items-start gap-3">
            <input
              type="checkbox"
              id="checkbox-reopen-exercise"
              checked={reopenIfClosed}
              onChange={(e) => setReopenIfClosed(e.target.checked)}
              className="mt-0.5 rounded text-[#FF8A00] focus:ring-[#FF8A00] cursor-pointer"
            />
            <label htmlFor="checkbox-reopen-exercise" className="text-xs text-[#F8FAFC] cursor-pointer select-none">
              <span className="font-semibold block">Reopen Exercise for Voting</span>
              <span className="text-[11px] text-[#94A3B8] block mt-0.5">
                Automatically switches the exercise status to <strong className="text-emerald-400">OPEN</strong> so church members can immediately cast their votes on the portal.
              </span>
            </label>
          </div>

          {/* Reason / Administrative Note */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#94A3B8]">
              Extension Reason / Administrative Note <span className="text-[10px]">(Optional - logged in audit trail)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Extended to allow night vigil shift workers and regional delegates to finish voting."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#0F172A] border border-[#475569] rounded-xl text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#FF8A00] transition-colors"
            />
          </div>

          {/* Live Preview of Extension */}
          {isValidNewEnd && newEndDate && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-300">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  New Deadline: <strong>{newEndDate.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</strong>
                </span>
              </div>
              <span className="text-[11px] bg-emerald-500/20 px-2 py-0.5 rounded font-mono font-bold">
                {reopenIfClosed ? 'Reopened & Active' : 'Extended'}
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="text-xs text-rose-400 flex items-center gap-1.5 p-3 bg-rose-950/40 rounded-xl border border-rose-800/60">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          </div>

          {/* Modal Footer Buttons */}
          <div className="p-4 sm:p-6 border-t border-[#334155] flex items-center justify-end gap-2.5 bg-[#1E293B] shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 bg-[#334155] hover:bg-[#475569] text-[#F8FAFC] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isValidNewEnd}
              className="px-5 py-2.5 bg-gradient-to-r from-[#FF8A00] to-[#E85B00] hover:from-[#E85B00] hover:to-[#FF8A00] text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-[#FF8A00]/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Extending Period...</span>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4" />
                  <span>Confirm & Extend Period</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
