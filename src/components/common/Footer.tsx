import React from 'react';
import { useSystemConfig } from '../../context/SystemConfigContext';
import { APP_LOGO_PATH } from '../../constants/branding';
import {
  ShieldCheck,
  Church,
  Sparkles,
  Heart,
  Award,
  Layers,
  Flame,
  Code2
} from 'lucide-react';

export const Footer: React.FC = () => {
  const { config } = useSystemConfig();

  return (
    <footer className="bg-[#0B1120] border-t border-[#334155]/80 text-[#94A3B8] text-xs mt-auto">
      {/* Upper Footer: Brand, Values, and System Integrity */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-[#1E293B]">
          {/* Col 1: Ministry Branding */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <img
                src={config.logoUrl || APP_LOGO_PATH}
                alt={config.churchName || 'TRH Workforce Logo'}
                className="h-10 w-auto max-w-[150px] object-contain shrink-0"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.endsWith('.svg')) {
                    target.src = '/logo.svg';
                  }
                }}
              />
              <div>
                <h3 className="text-sm font-bold font-display text-[#F8FAFC]">
                  {config.churchName || 'TRH Workforce'}
                </h3>
                <p className="text-[11px] text-[#FF8A00] font-medium">
                  {config.churchTagline || 'Recognition & Ballot System'}
                </p>
              </div>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed max-w-sm">
              The official church voting and workforce recognition platform for TRH Ministries Global, fostering servant leadership and kingdom excellence across all ministries.
            </p>
          </div>

          {/* Col 2: H.E.A.R.T.I. Kingdom Values */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[#F8FAFC] flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-[#FF8A00]" />
              <span>Celebrating H.E.A.R.T.I</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-[#94A3B8]">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF8A00]"></span>
                <strong className="text-[#F8FAFC]">H</strong> — Honour
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF8A00]"></span>
                <strong className="text-[#F8FAFC]">E</strong> — Excellence
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF8A00]"></span>
                <strong className="text-[#F8FAFC]">A</strong> — Accountability
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF8A00]"></span>
                <strong className="text-[#F8FAFC]">R</strong> — Results
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF8A00]"></span>
                <strong className="text-[#F8FAFC]">T</strong> — Transforming Love
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF8A00]"></span>
                <strong className="text-[#F8FAFC]">I</strong> — Innovation
              </div>
            </div>
          </div>

          {/* Col 3: System Safeguards & Trust */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[#F8FAFC] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#FF8A00]" />
              <span>Ballot Security &amp; Trust</span>
            </div>
            <ul className="space-y-1.5 text-xs text-[#94A3B8]">
              <li className="flex items-center gap-2">
                <span className="text-[#FF8A00]">✓</span>
                <span>Atomic Transaction Double-Vote Prevention</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#FF8A00]">✓</span>
                <span>Verified Member Voter Credentials</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#FF8A00]">✓</span>
                <span>Encrypted Receipt Hashes &amp; Audit Logs</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Lower Footer: Centered Copyright & Developer Attribution */}
        <div className="pt-8 flex flex-col items-center justify-center gap-3 text-center">
          {/* Copyright Statement */}
          <div className="space-y-0.5">
            <p className="text-[8px] sm:text-xs font-bold text-[#F8FAFC] tracking-wide">
              &copy; {new Date().getFullYear()} TRH MINISTRIES GLOBAL
            </p>
            <p className="text-[8px] text-[#64748B]">
              All Rights Reserved. TRH Ministries Global.
            </p>
          </div>

          {/* Developer Attribution (Clean & Centered without Card or Icon) */}
          <div className="space-y-0.5 pt-0.5">
            <span className="block text-[7px] uppercase font-bold tracking-widest text-[#94A3B8]">
              DEVELOPED BY
            </span>
            <span className="block text-[8px] sm:text-xs font-bold text-[#F8FAFC] font-display tracking-wide">
              TRH INNOVATION &amp; TECHNOLOGY ORGANIZATION
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
