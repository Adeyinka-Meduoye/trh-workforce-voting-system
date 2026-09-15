import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSystemConfig } from '../../context/SystemConfigContext';
import { useAuth } from '../../context/AuthContext';
import { useActionModal } from '../../context/ActionModalContext';
import { APP_LOGO_PATH } from '../../constants/branding';
import {
  Church,
  Vote,
  LayoutDashboard,
  Trophy,
  UserCheck,
  ShieldCheck,
  LogOut,
  User,
  Menu,
  X
} from 'lucide-react';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, param?: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { config } = useSystemConfig();
  const { adminUser, voterSession, clearVoterSession, isAdmin, logoutAdmin } = useAuth();
  const { notifyAction, confirmAction } = useActionModal();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (view: string, param?: string) => {
    onNavigate(view, param);
    setMobileMenuOpen(false);
  };

  const handleAdminSignOut = () => {
    confirmAction({
      type: 'logout',
      title: 'Confirm Administrative Sign Out',
      message: 'Are you sure you want to end your current administrative session? You will need to enter your credentials to log in again.',
      confirmLabel: 'Sign Out',
      isDanger: false,
      onConfirm: async () => {
        const actorName = adminUser?.fullName || 'Super Admin';
        const actorRole = adminUser?.role || 'super_admin';
        logoutAdmin();
        setMobileMenuOpen(false);
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

  const handleVoterSignOut = () => {
    confirmAction({
      type: 'logout',
      title: 'Switch Voter Code',
      message: `Are you sure you want to clear your current voter verification session (${voterSession?.fullName})?`,
      confirmLabel: 'Clear Code',
      onConfirm: async () => {
        clearVoterSession();
        setMobileMenuOpen(false);
        notifyAction({
          type: 'logout',
          title: 'Voter Session Cleared',
          details: 'You can now enter another voter code on the voter portal.',
          actorName: voterSession?.fullName || 'Voter',
          actorRole: 'voter'
        });
      }
    });
  };

  return (
    <header className="sticky top-0 z-50 bg-[#1E293B] text-[#F8FAFC] shadow-lg shadow-black/20 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div
            id="nav-brand-logo"
            onClick={() => handleNavClick('voter_portal')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <img
              src={config.logoUrl || APP_LOGO_PATH}
              alt={config.churchName || 'TRH Workforce Logo'}
              className="h-10 sm:h-11 w-auto max-w-[150px] object-contain shrink-0 group-hover:scale-105 transition-transform"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.endsWith('.svg')) {
                  target.src = '/logo.svg';
                }
              }}
            />
            <div className="min-w-0">
              <div className="font-display font-bold text-base sm:text-lg tracking-tight text-[#F8FAFC] leading-tight truncate">
                <span>{config.churchName || 'TRH Workforce'}</span>
              </div>
              <p className="text-xs text-[#94A3B8] font-medium truncate max-w-[200px] sm:max-w-md">
                {config.churchTagline || 'Recognition System'}
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links (Large Screens >= 1024px) */}
          <div className="hidden lg:flex items-center gap-3 xl:gap-4">
            <nav className="flex items-center gap-1 bg-[#0F172A] p-1 rounded-xl border border-slate-800">
              <button
                id="nav-btn-voter-portal"
                onClick={() => handleNavClick('voter_portal')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  currentView === 'voter_portal' || currentView === 'vote_screen'
                    ? 'bg-gradient-to-r from-[#FF8A00] to-[#E85B00] text-slate-950 shadow-md shadow-[#FF8A00]/25 font-bold'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#334155]'
                }`}
              >
                <Vote className="w-4 h-4" />
                <span>Voter Portal</span>
              </button>

              <button
                id="nav-btn-hall-of-fame"
                onClick={() => handleNavClick('winners_hall_of_fame')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  currentView === 'winners_hall_of_fame' || currentView === 'results_screen'
                    ? 'bg-gradient-to-r from-[#FF8A00] to-[#E85B00] text-slate-950 shadow-md shadow-[#FF8A00]/25 font-bold'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#334155]'
                }`}
              >
                <Trophy className="w-4 h-4" />
                <span>Hall of Fame</span>
              </button>

              <button
                id="nav-btn-admin-cms"
                onClick={() => handleNavClick('admin_dashboard')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  currentView === 'admin_dashboard'
                    ? 'bg-gradient-to-r from-[#FF8A00] to-[#E85B00] text-slate-950 shadow-md shadow-[#FF8A00]/25 font-bold'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#334155]'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Admin CMS</span>
              </button>
            </nav>

            {/* Voter Verified Pill */}
            {voterSession && (
              <div className="flex items-center gap-2 bg-[#251464]/80 border border-[#FF8A00]/40 px-3 py-1 rounded-full text-xs text-[#F8FAFC]">
                <UserCheck className="w-3.5 h-3.5 text-[#FF8A00]" />
                <span className="font-medium truncate max-w-[120px]">{voterSession.fullName}</span>
                <span className="text-[10px] bg-[#FF8A00] text-slate-950 font-bold px-1.5 py-0.5 rounded font-mono">
                  {voterSession.voterCode}
                </span>
                <button
                  onClick={handleVoterSignOut}
                  title="Switch voter code"
                  className="hover:text-[#FF8A00] text-[#94A3B8] ml-1 font-bold cursor-pointer"
                >
                  &times;
                </button>
              </div>
            )}

            {/* Admin Session Badge */}
            {adminUser && (
              <div className="flex items-center gap-2 bg-[#334155] border border-slate-700 px-3 py-1 rounded-xl text-xs text-[#F8FAFC]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#FF8A00]" />
                <span className="font-bold text-[#F8FAFC]">@{adminUser.username}</span>
                <span className="text-[10px] bg-[#FF8A00]/20 text-[#FF8A00] border border-[#FF8A00]/30 px-1.5 py-0.5 rounded uppercase font-bold">
                  {adminUser.role.replace('_', ' ')}
                </span>
                <button
                  onClick={handleAdminSignOut}
                  title="Sign out of Admin CMS"
                  className="text-red-400 hover:text-red-300 ml-1 p-0.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile & Tablet Hamburger Toggle Button (< 1024px) */}
          <div className="flex items-center gap-2 lg:hidden">
            {voterSession && (
              <span className="text-[10px] bg-[#251464] border border-[#FF8A00]/40 text-[#FF8A00] px-2 py-1 rounded-full font-mono font-bold">
                {voterSession.voterCode}
              </span>
            )}
            {adminUser && (
              <span className="text-[10px] bg-[#334155] border border-slate-700 text-[#FF8A00] px-2 py-1 rounded-lg font-bold uppercase">
                Admin
              </span>
            )}
            <button
              id="mobile-menu-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-xl bg-[#0F172A] border border-slate-800 text-[#F8FAFC] hover:text-[#FF8A00] hover:bg-[#334155] transition-all cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile & Tablet Dropdown Drawer (< 1024px) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden bg-[#1E293B] border-t border-slate-800 overflow-hidden shadow-2xl"
          >
            <div className="px-4 py-4 space-y-3">
              {/* Navigation Options */}
              <div className="space-y-1.5">
                <button
                  onClick={() => handleNavClick('voter_portal')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    currentView === 'voter_portal' || currentView === 'vote_screen'
                      ? 'bg-gradient-to-r from-[#FF8A00] to-[#E85B00] text-slate-950 font-bold shadow-md shadow-[#FF8A00]/25'
                      : 'text-[#F8FAFC] hover:bg-[#334155]'
                  }`}
                >
                  <Vote className="w-5 h-5" />
                  <span>Voter Portal</span>
                </button>

                <button
                  onClick={() => handleNavClick('winners_hall_of_fame')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    currentView === 'winners_hall_of_fame' || currentView === 'results_screen'
                      ? 'bg-gradient-to-r from-[#FF8A00] to-[#E85B00] text-slate-950 font-bold shadow-md shadow-[#FF8A00]/25'
                      : 'text-[#F8FAFC] hover:bg-[#334155]'
                  }`}
                >
                  <Trophy className="w-5 h-5" />
                  <span>Hall of Fame</span>
                </button>

                <button
                  onClick={() => handleNavClick('admin_dashboard')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    currentView === 'admin_dashboard'
                      ? 'bg-gradient-to-r from-[#FF8A00] to-[#E85B00] text-slate-950 font-bold shadow-md shadow-[#FF8A00]/25'
                      : 'text-[#F8FAFC] hover:bg-[#334155]'
                  }`}
                >
                  <LayoutDashboard className="w-5 h-5" />
                  <span>Admin CMS</span>
                </button>
              </div>

              {/* Voter & Admin Status in Drawer */}
              {(voterSession || adminUser) && (
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  {voterSession && (
                    <div className="flex items-center justify-between p-3 bg-[#251464]/60 border border-[#FF8A00]/30 rounded-xl text-xs">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-[#FF8A00]" />
                        <div>
                          <div className="font-semibold text-[#F8FAFC]">{voterSession.fullName}</div>
                          <div className="text-[11px] text-[#94A3B8] font-mono">Code: {voterSession.voterCode}</div>
                        </div>
                      </div>
                      <button
                        onClick={handleVoterSignOut}
                        className="px-2.5 py-1 bg-[#334155] hover:bg-[#475569] text-[#F8FAFC] rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Switch Code
                      </button>
                    </div>
                  )}

                  {adminUser && (
                    <div className="flex items-center justify-between p-3 bg-[#334155]/70 border border-slate-700 rounded-xl text-xs">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#FF8A00]" />
                        <div>
                          <div className="font-bold text-[#F8FAFC]">@{adminUser.username}</div>
                          <div className="text-[10px] text-[#FF8A00] font-semibold uppercase">
                            {adminUser.role.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={handleAdminSignOut}
                        className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
