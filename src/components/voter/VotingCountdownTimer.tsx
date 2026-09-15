import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle, Calendar, Timer, Flame } from 'lucide-react';
import { ExerciseStatus } from '../../types';

interface VotingCountdownTimerProps {
  endTime?: string;
  startTime?: string;
  status: ExerciseStatus;
  className?: string;
  onExpire?: () => void;
}

interface TimeParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  isExpired: boolean;
  isNotStarted: boolean;
}

export const VotingCountdownTimer: React.FC<VotingCountdownTimerProps> = ({
  endTime,
  startTime,
  status,
  className = '',
  onExpire
}) => {
  const [timeParts, setTimeParts] = useState<TimeParts>(() => calculateTimeParts());
  const [hasTriggeredExpire, setHasTriggeredExpire] = useState(false);

  function calculateTimeParts(): TimeParts {
    const now = Date.now();
    const endMs = endTime ? new Date(endTime).getTime() : 0;
    const startMs = startTime ? new Date(startTime).getTime() : 0;

    // If exercise is scheduled and start is in future
    if (status === 'scheduled' && startMs > now) {
      const diff = Math.max(0, startMs - now);
      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
        totalMs: diff,
        isExpired: false,
        isNotStarted: true
      };
    }

    if (!endMs || isNaN(endMs)) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalMs: 0,
        isExpired: false,
        isNotStarted: false
      };
    }

    const diff = endMs - now;
    if (diff <= 0 || status === 'closed' || status === 'archived') {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalMs: 0,
        isExpired: true,
        isNotStarted: false
      };
    }

    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
      totalMs: diff,
      isExpired: false,
      isNotStarted: false
    };
  }

  useEffect(() => {
    const tick = () => {
      const parts = calculateTimeParts();
      setTimeParts(parts);

      if (parts.isExpired && !hasTriggeredExpire && status === 'open') {
        setHasTriggeredExpire(true);
        if (onExpire) onExpire();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endTime, startTime, status, hasTriggeredExpire, onExpire]);

  // Format formatted date label
  const formattedEndDate = React.useMemo(() => {
    if (!endTime) return null;
    try {
      const date = new Date(endTime);
      if (isNaN(date.getTime())) return null;
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short'
      }).format(date);
    } catch {
      return null;
    }
  }, [endTime]);

  const isCritical = !timeParts.isExpired && !timeParts.isNotStarted && timeParts.totalMs < 60 * 60 * 1000; // < 1 hour
  const isUrgent = !timeParts.isExpired && !timeParts.isNotStarted && timeParts.totalMs < 24 * 60 * 60 * 1000; // < 24 hours

  // Helper pad
  const pad = (n: number) => String(n).padStart(2, '0');

  // Closed State
  if (timeParts.isExpired || status === 'closed' || status === 'archived') {
    return (
      <div
        id="voting-countdown-timer-closed"
        className={`bg-[#0F172A] border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-inner ${className}`}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="text-sm font-bold text-slate-200">Voting Exercise Concluded</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Closed
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                The official voting window has closed. No additional ballots can be accepted.
              </p>
            </div>
          </div>

          {formattedEndDate && (
            <div className="text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Closed: {formattedEndDate}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Scheduled / Not Started State
  if (timeParts.isNotStarted) {
    return (
      <div
        id="voting-countdown-timer-scheduled"
        className={`bg-[#1E293B] border border-indigo-500/30 rounded-2xl p-4 sm:p-5 shadow-lg ${className}`}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-100">Voting Opens In</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Scheduled
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Ballot submissions will unlock once the exercise start time arrives.
              </p>
            </div>
          </div>

          {/* Digits Display */}
          <div className="flex items-center gap-2">
            {[
              { label: 'DAYS', val: timeParts.days },
              { label: 'HRS', val: timeParts.hours },
              { label: 'MIN', val: timeParts.minutes },
              { label: 'SEC', val: timeParts.seconds }
            ].map((unit, i) => (
              <div key={unit.label} className="flex items-center gap-2">
                <div className="flex flex-col items-center bg-[#0F172A] border border-indigo-500/30 rounded-xl px-2.5 py-1.5 min-w-[50px]">
                  <span className="text-lg font-black font-mono text-indigo-200 leading-none">
                    {pad(unit.val)}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 mt-1">{unit.label}</span>
                </div>
                {i < 3 && <span className="text-indigo-400 font-bold">:</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Active / Open Countdown
  return (
    <div
      id="voting-countdown-timer"
      className={`rounded-2xl border transition-all p-4 sm:p-5 relative overflow-hidden shadow-lg ${
        isCritical
          ? 'bg-gradient-to-r from-rose-950/40 via-[#1E293B] to-[#1E293B] border-rose-500/50 shadow-rose-900/20'
          : isUrgent
          ? 'bg-gradient-to-r from-amber-950/30 via-[#1E293B] to-[#1E293B] border-amber-500/40 shadow-amber-900/15'
          : 'bg-[#1E293B] border-[#334155]'
      } ${className}`}
    >
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Left info label */}
        <div className="flex items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
              isCritical
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 animate-pulse'
                : isUrgent
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                : 'bg-[#251464] border-[#FF8A00]/30 text-[#FF8A00]'
            }`}
          >
            {isCritical ? (
              <Flame className="w-6 h-6" />
            ) : isUrgent ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <Timer className="w-5 h-5" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-[#F8FAFC] font-display flex items-center gap-1.5">
                Voting Exercise Countdown
              </h3>

              {isCritical ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                  <Flame className="w-3 h-3" /> Closing Very Soon (&lt; 1 hr)
                </span>
              ) : isUrgent ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <Clock className="w-3 h-3" /> Closes in &lt; 24 hrs
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  Active Voting Open
                </span>
              )}
            </div>

            <p className="text-xs text-[#94A3B8] mt-0.5">
              {formattedEndDate ? (
                <>
                  Closes officially on <strong className="text-[#F8FAFC]">{formattedEndDate}</strong>
                </>
              ) : (
                'Time remaining before ballot submissions close'
              )}
            </p>
          </div>
        </div>

        {/* Right Digital Countdown Blocks */}
        <div className="flex items-center gap-2 sm:gap-3 w-full lg:w-auto justify-center sm:justify-start">
          {/* Days */}
          <div className="flex flex-col items-center">
            <div
              className={`min-w-[54px] sm:min-w-[62px] h-12 sm:h-14 rounded-xl flex items-center justify-center font-mono text-xl sm:text-2xl font-black shadow-inner border transition-all ${
                isCritical
                  ? 'bg-[#0F172A] text-rose-400 border-rose-500/40'
                  : isUrgent
                  ? 'bg-[#0F172A] text-amber-400 border-amber-500/40'
                  : 'bg-[#0F172A] text-[#FF8A00] border-[#334155]'
              }`}
            >
              {pad(timeParts.days)}
            </div>
            <span className="text-[10px] font-bold text-[#94A3B8] mt-1 tracking-wider uppercase">
              Days
            </span>
          </div>

          <span
            className={`text-xl sm:text-2xl font-bold font-mono pb-4 ${
              isCritical ? 'text-rose-400' : isUrgent ? 'text-amber-400' : 'text-[#FF8A00]'
            }`}
          >
            :
          </span>

          {/* Hours */}
          <div className="flex flex-col items-center">
            <div
              className={`min-w-[54px] sm:min-w-[62px] h-12 sm:h-14 rounded-xl flex items-center justify-center font-mono text-xl sm:text-2xl font-black shadow-inner border transition-all ${
                isCritical
                  ? 'bg-[#0F172A] text-rose-400 border-rose-500/40'
                  : isUrgent
                  ? 'bg-[#0F172A] text-amber-400 border-amber-500/40'
                  : 'bg-[#0F172A] text-[#FF8A00] border-[#334155]'
              }`}
            >
              {pad(timeParts.hours)}
            </div>
            <span className="text-[10px] font-bold text-[#94A3B8] mt-1 tracking-wider uppercase">
              Hours
            </span>
          </div>

          <span
            className={`text-xl sm:text-2xl font-bold font-mono pb-4 ${
              isCritical ? 'text-rose-400' : isUrgent ? 'text-amber-400' : 'text-[#FF8A00]'
            }`}
          >
            :
          </span>

          {/* Minutes */}
          <div className="flex flex-col items-center">
            <div
              className={`min-w-[54px] sm:min-w-[62px] h-12 sm:h-14 rounded-xl flex items-center justify-center font-mono text-xl sm:text-2xl font-black shadow-inner border transition-all ${
                isCritical
                  ? 'bg-[#0F172A] text-rose-400 border-rose-500/40'
                  : isUrgent
                  ? 'bg-[#0F172A] text-amber-400 border-amber-500/40'
                  : 'bg-[#0F172A] text-[#FF8A00] border-[#334155]'
              }`}
            >
              {pad(timeParts.minutes)}
            </div>
            <span className="text-[10px] font-bold text-[#94A3B8] mt-1 tracking-wider uppercase">
              Mins
            </span>
          </div>

          <span
            className={`text-xl sm:text-2xl font-bold font-mono pb-4 ${
              isCritical ? 'text-rose-400' : isUrgent ? 'text-amber-400' : 'text-[#FF8A00]'
            }`}
          >
            :
          </span>

          {/* Seconds */}
          <div className="flex flex-col items-center">
            <div
              className={`min-w-[54px] sm:min-w-[62px] h-12 sm:h-14 rounded-xl flex items-center justify-center font-mono text-xl sm:text-2xl font-black shadow-inner border transition-all ${
                isCritical
                  ? 'bg-[#0F172A] text-rose-300 border-rose-500/40'
                  : isUrgent
                  ? 'bg-[#0F172A] text-amber-300 border-amber-500/40'
                  : 'bg-[#0F172A] text-[#FFA439] border-[#334155]'
              }`}
            >
              {pad(timeParts.seconds)}
            </div>
            <span className="text-[10px] font-bold text-[#94A3B8] mt-1 tracking-wider uppercase">
              Secs
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
