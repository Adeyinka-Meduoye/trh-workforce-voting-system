import React, { useState, useEffect } from 'react';
import { useSystemConfig } from '../../context/SystemConfigContext';
import { useAuth } from '../../context/AuthContext';
import {
  Settings,
  Save,
  CheckCircle2,
  AlertCircle,
  Church,
  Mail,
  FileText,
  Image,
  Globe
} from 'lucide-react';

export const SystemSettings: React.FC = () => {
  const { config, updateConfig } = useSystemConfig();
  const { userProfile } = useAuth();

  const [churchName, setChurchName] = useState(config.churchName || 'TRH Workforce');
  const [tagline, setTagline] = useState(config.tagline || config.churchTagline || '');
  const [description, setDescription] = useState(config.description || '');
  const [primaryColor, setPrimaryColor] = useState(config.primaryColor || '#251464');
  const [accentColor, setAccentColor] = useState(config.accentColor || '#E85B00');
  const [logoUrl, setLogoUrl] = useState(config.logoUrl || '');
  const [supportEmail, setSupportEmail] = useState(config.supportEmail || config.contactEmail || 'admin@trhworkforce.org');

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Sync state when config finishes loading asynchronously
  useEffect(() => {
    if (config) {
      setChurchName(config.churchName || 'TRH Workforce');
      setTagline(config.tagline || config.churchTagline || '');
      setDescription(config.description || '');
      setPrimaryColor(config.primaryColor || '#251464');
      setAccentColor(config.accentColor || '#E85B00');
      setLogoUrl(config.logoUrl || '');
      setSupportEmail(config.supportEmail || config.contactEmail || 'admin@trhworkforce.org');
    }
  }, [config]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await updateConfig({
        churchName: (churchName || 'TRH Workforce').trim(),
        churchTagline: (tagline || '').trim(),
        tagline: (tagline || '').trim(),
        description: (description || '').trim(),
        primaryColor: primaryColor || '#251464',
        accentColor: accentColor || '#E85B00',
        logoUrl: (logoUrl || '').trim(),
        supportEmail: (supportEmail || 'admin@trhworkforce.org').trim(),
        contactEmail: (supportEmail || 'admin@trhworkforce.org').trim()
      });
      setSuccessMsg('Branding and system configuration updated successfully across the app.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (e: any) {
      console.error('Error updating configuration:', e);
      setErrorMsg(e?.message || 'Error updating configuration. Please check your network and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold font-display text-[#F8FAFC] flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#FF8A00]" />
          System Configuration & Ministry Branding
        </h2>
        <p className="text-xs text-[#94A3B8] mt-0.5">
          Customize TRH Ministries Global identity, color scheme, and administrative contact channels.
        </p>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSave} className="bg-[#1E293B] rounded-2xl border border-slate-800 p-6 space-y-6 shadow-xs">
        <h3 className="text-sm font-bold font-display text-[#F8FAFC] flex items-center gap-2 border-b border-slate-800 pb-3">
          <Church className="w-4 h-4 text-[#FF8A00]" />
          Global Ministry Identity
        </h3>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-[#F8FAFC] mb-1">Ministry / Organisation Name *</label>
            <div className="relative">
              <Church className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={churchName}
                onChange={(e) => setChurchName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#F8FAFC] mb-1">System Tagline</label>
            <div className="relative">
              <Globe className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#F8FAFC] mb-1">Mission / Portal Description</label>
            <div className="relative">
              <FileText className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-3" />
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00] resize-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#F8FAFC] mb-1">Custom Logo URL (Optional)</label>
            <div className="relative">
              <Image className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                placeholder="https://example.com/logo.png"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#F8FAFC] mb-1">Administrative / Committee Support Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-gradient-to-r from-[#FF8A00] to-[#E85B00] hover:from-[#E85B00] hover:to-[#FF8A00] text-slate-950 rounded-xl text-xs font-bold shadow-md shadow-[#FF8A00]/20 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Configuration Globally'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
