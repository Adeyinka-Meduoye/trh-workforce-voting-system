import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ChevronDown
} from 'lucide-react';
import { OFFICIAL_USERS_LIST } from '../../constants/officialUsers';
import { getUserAccounts } from '../../services/db';

interface AdminLoginProps {
  onLoginSuccess?: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const { loginAdmin } = useAuth();
  const [selectedOfficialUsername, setSelectedOfficialUsername] = useState<string>('');
  const [customUsername, setCustomUsername] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Dynamic official usernames list synced with Firestore
  const [officialOptions, setOfficialOptions] = useState<Array<{ username: string; label: string; isSuperAdmin: boolean; description?: string }>>(() => {
    return OFFICIAL_USERS_LIST.map(u => ({
      username: u.username,
      label: u.username,
      isSuperAdmin: u.isSuperAdmin,
      description: u.description
    }));
  });

  useEffect(() => {
    let isMounted = true;
    getUserAccounts().then((accounts) => {
      if (isMounted && accounts && accounts.length > 0) {
        const activeAccounts = accounts.filter(a => a.status === 'active');
        if (activeAccounts.length > 0) {
          setOfficialOptions(
            activeAccounts.map(a => {
              const officialDef = OFFICIAL_USERS_LIST.find(o => o.username === a.username);
              return {
                username: a.username,
                label: a.username,
                isSuperAdmin: a.role === 'super_admin',
                description: a.departmentName
                  ? `${a.fullName} • ${a.departmentName}`
                  : officialDef?.description || a.fullName
              };
            })
          );
        }
      }
    }).catch(err => {
      console.warn('Could not load dynamic usernames for login dropdown:', err);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const activeUsername = isCustomMode ? customUsername : selectedOfficialUsername;
  const currentOption = officialOptions.find(o => o.username === selectedOfficialUsername);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUsername.trim() || !password.trim()) {
      setErrorMsg(
        isCustomMode
          ? 'Please enter your Username (Login ID) and Password.'
          : 'Please select an Official Username and enter your Password.'
      );
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await loginAdmin(activeUsername.trim(), password.trim());
      if (res.success) {
        if (onLoginSuccess) {
          onLoginSuccess();
        }
      } else {
        setErrorMsg(res.message || 'Invalid administrative credentials.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to authenticate. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Glowing Background Glow Accent */}
        <div className="relative">
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-[#251464] via-[#FF8A00] to-[#E85B00] opacity-30 blur-xl"></div>

          <div className="relative bg-[#1E293B] border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6">
            {/* Header / Logo Icon */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#251464] to-[#0F172A] border border-[#FF8A00]/40 text-[#FF8A00] shadow-lg shadow-[#FF8A00]/10 mb-1">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-bold font-display text-[#F8FAFC] tracking-tight">
                Admin CMS Access
              </h1>
              <p className="text-xs text-[#94A3B8] max-w-xs mx-auto">
                Sign in with your official administrative credentials to manage recognition exercises, church organisations, and voting records.
              </p>
            </div>

            {/* Error Notification */}
            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">{errorMsg}</div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Select Official Username Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="admin-official-username-select" className="block text-xs font-semibold text-[#F8FAFC]">
                    Select Official Username
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomMode(!isCustomMode);
                      setErrorMsg(null);
                    }}
                    className="text-[11px] text-[#94A3B8] hover:text-[#FF8A00] transition-colors cursor-pointer"
                  >
                    {isCustomMode ? '← Use Official List' : 'Other Login ID?'}
                  </button>
                </div>

                {!isCustomMode ? (
                  <div className="space-y-1.5">
                    <div className="relative">
                      <User className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                      <select
                        id="admin-official-username-select"
                        required
                        value={selectedOfficialUsername}
                        onChange={(e) => {
                          setSelectedOfficialUsername(e.target.value);
                          setErrorMsg(null);
                        }}
                        className="w-full pl-10 pr-9 py-2.5 bg-[#334155] border border-slate-700 rounded-xl text-xs sm:text-sm text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00] transition-colors appearance-none cursor-pointer"
                      >
                        <option value="" disabled className="bg-[#1E293B] text-[#94A3B8]">
                          -- Select Official Username --
                        </option>
                        {officialOptions.map((u) => (
                          <option
                            key={u.username}
                            value={u.username}
                            className="bg-[#1E293B] text-[#F8FAFC] py-1.5"
                          >
                            {u.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-[#94A3B8] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* Role / Description Pill */}
                    {selectedOfficialUsername && currentOption?.description ? (
                      <div className="text-[11px] text-[#94A3B8] px-1 font-medium">
                        {currentOption.description}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="relative">
                      <User className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="admin-login-custom-username"
                        type="text"
                        required
                        autoFocus
                        autoComplete="username"
                        placeholder="e.g. staff ID or custom admin username"
                        value={customUsername}
                        onChange={(e) => setCustomUsername(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-[#334155] border border-slate-700 rounded-xl text-xs sm:text-sm text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#FF8A00] transition-colors"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label htmlFor="admin-login-password" className="block text-xs font-semibold text-[#F8FAFC]">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="admin-login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="Enter your administrative password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-[#334155] border border-slate-700 rounded-xl text-xs sm:text-sm text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#FF8A00] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                id="btn-admin-login-submit"
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-[#FF8A00] to-[#E85B00] hover:from-[#E85B00] hover:to-[#FF8A00] text-slate-950 font-bold rounded-xl text-xs sm:text-sm transition-all shadow-lg shadow-[#FF8A00]/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Admin CMS</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

