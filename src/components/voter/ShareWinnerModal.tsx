import React, { useState } from 'react';
import { WinnerRecord } from '../../types';
import {
  Share2,
  Copy,
  Check,
  X,
  MessageCircle,
  Mail,
  Send,
  ExternalLink,
  Sparkles,
  Trophy,
  Crown,
  Globe,
  Smartphone
} from 'lucide-react';

interface ShareWinnerModalProps {
  record: WinnerRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareWinnerModal: React.FC<ShareWinnerModalProps> = ({
  record,
  isOpen,
  onClose
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);

  if (!isOpen || !record) return null;

  const primaryWinner = record.winner || record.allWinners?.[0];
  const primaryName = primaryWinner?.displayName || record.winner?.displayName || 'Honored Servant';
  const isJoint = Boolean(
    record.isJointWinner ||
    record.jointWinnerName ||
    record.secondaryDepartmentName ||
    (record.allWinners && record.allWinners.length > 1)
  );
  const coWinnerName = record.jointWinnerName || (record.allWinners && record.allWinners.length > 1 ? record.allWinners[1].displayName : '');
  const displayName = isJoint && coWinnerName ? `${primaryName} & ${coWinnerName}` : primaryName;

  const orgName = record.organisationName || 'The Reinvention House';
  const awardCategory = record.categoryName || record.awardTitle || record.exerciseTitle || 'Worker of the Month';
  const monthYear = `${record.month || ''} ${record.year || ''}`.trim() || new Date(record.endTime).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const photoUrl = primaryWinner?.photoUrl || record.winner?.photoUrl;

  // Generate public deep-link for this honoree
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://ais-dev-jy5fwzfbmkomrkwfknlkh5-7594041143.europe-west3.run.app';
  const shareUrl = `${currentOrigin}?view=hall-of-fame&winner=${encodeURIComponent(primaryName)}&exercise=${encodeURIComponent(record.exerciseId)}`;

  const shareTitle = `TRH Honors: ${displayName} - ${awardCategory}`;
  const shareText = `🎉 Celebrating ${displayName} recognized as ${awardCategory} (${monthYear}) at TRH Ministries Global (${orgName})! Faithful service, exemplary dedication, and kingdom excellence. 🏆✨`;

  const instagramCaption = `👑 KINGDOM EXCELLENCE & HONORS 👑\n\nHuge congratulations to ${displayName} for being commemorated as ${awardCategory} (${monthYear}) at TRH Ministries Global (${orgName})!\n\n"Recognized with highest honors for extraordinary dedication, leadership, and faithful kingdom service."\n\nCelebrate and view official verified certificate at:\n${shareUrl}\n\n#TRHMinistriesGlobal #WorkforceHonors #KingdomExcellence #ChurchAwards #TheReinventionHouse #ProudMoment`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleCopyCaption = async () => {
    try {
      await navigator.clipboard.writeText(instagramCaption);
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 2500);
    } catch (err) {
      console.error('Failed to copy caption:', err);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl
        });
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      handleCopyLink();
    }
  };

  // Social Share URL Builders
  const shareChannels = [
    {
      name: 'WhatsApp',
      description: 'Send to contacts or family groups',
      color: 'from-emerald-500 to-green-600',
      textColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/40',
      bgColor: 'hover:bg-emerald-950/40',
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.067-2.224-.555-1.879-.765-3.08-2.684-3.174-2.808-.094-.124-.76-1.011-.76-1.928s.479-1.365.65-1.554c.171-.189.373-.236.497-.236.124 0 .248.002.356.007.114.006.267-.043.418.32.155.373.53 1.295.576 1.39.047.095.078.206.016.33-.062.124-.094.202-.187.311-.093.11-.197.245-.281.33-.094.094-.192.196-.083.383.11.187.487.804 1.045 1.302.72.641 1.326.84 1.513.934.187.094.296.079.405-.047.11-.124.467-.544.591-.731.124-.187.248-.156.419-.093.171.062 1.088.513 1.275.607.187.094.311.14.357.218.047.078.047.452-.097.857zM12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.66 1.434 5.176L2 22l4.954-1.399C8.42 21.492 10.151 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" />
        </svg>
      ),
      url: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`
    },
    {
      name: 'Facebook',
      description: 'Share post to Timeline or Groups',
      color: 'from-blue-600 to-blue-700',
      textColor: 'text-blue-400',
      borderColor: 'border-blue-500/40',
      bgColor: 'hover:bg-blue-950/40',
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`
    },
    {
      name: 'Twitter / X',
      description: 'Post a tweet with hashtags',
      color: 'from-slate-700 to-slate-900',
      textColor: 'text-slate-200',
      borderColor: 'border-slate-500/40',
      bgColor: 'hover:bg-slate-800/60',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}&hashtags=TRHHonors,KingdomExcellence`
    },
    {
      name: 'LinkedIn',
      description: 'Publish professional achievement',
      color: 'from-sky-700 to-blue-800',
      textColor: 'text-sky-400',
      borderColor: 'border-sky-500/40',
      bgColor: 'hover:bg-sky-950/40',
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
        </svg>
      ),
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
    },
    {
      name: 'Telegram',
      description: 'Broadcast to channels or chats',
      color: 'from-sky-500 to-blue-600',
      textColor: 'text-sky-300',
      borderColor: 'border-sky-400/40',
      bgColor: 'hover:bg-sky-950/40',
      icon: <Send className="w-5 h-5" />,
      url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`
    },
    {
      name: 'Email',
      description: 'Email friends & fellow workers',
      color: 'from-amber-600 to-orange-700',
      textColor: 'text-amber-300',
      borderColor: 'border-amber-500/40',
      bgColor: 'hover:bg-amber-950/40',
      icon: <Mail className="w-5 h-5" />,
      url: `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(`${shareText}\n\nView official Certificate and Hall of Fame record:\n${shareUrl}`)}`
    }
  ];

  return (
    <div
      className="fixed inset-0 z-[9999] p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md flex items-center justify-center overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="share-winner-modal"
        className="bg-[#1E293B] border border-[#334155] rounded-2xl sm:rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl my-auto max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col"
      >
        {/* Modal Top Header */}
        <div className="shrink-0 p-4 sm:p-5 bg-gradient-to-r from-[#251464] via-[#1E293B] to-[#251464] border-b border-amber-500/30 flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#FF8A00] text-slate-950 flex items-center justify-center shadow-lg shadow-[#FF8A00]/25 shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-[#F8FAFC] font-display truncate">
                Share Kingdom Honor
              </h3>
              <p className="text-xs text-[#94A3B8] truncate">
                {displayName} • {awardCategory}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-[#94A3B8] hover:text-[#F8FAFC] p-2 rounded-xl hover:bg-[#334155] transition-colors cursor-pointer shrink-0"
            aria-label="Close share dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body Container */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-5">
          {/* Winner Overview Card */}
          <div className="p-3.5 sm:p-4 bg-[#0F172A] rounded-2xl border border-slate-800 flex items-center gap-3.5">
            <div className="relative w-14 h-14 rounded-full p-0.5 bg-gradient-to-br from-[#FF8A00] via-amber-400 to-orange-600 shrink-0 shadow-md">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={primaryName}
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : null}
              <div
                className={`w-full h-full rounded-full bg-[#1E293B] flex items-center justify-center text-amber-400 font-bold text-lg ${
                  photoUrl ? 'hidden' : 'flex'
                }`}
              >
                {primaryName.charAt(0)}
              </div>
              <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-[#FF8A00] text-slate-950 shadow">
                <Crown className="w-3 h-3 fill-slate-950" />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#FF8A00] block truncate">
                {awardCategory}
              </span>
              <h4 className="text-sm sm:text-base font-bold text-white truncate font-display">
                {displayName}
              </h4>
              <p className="text-xs text-[#94A3B8] truncate">
                {orgName} • {monthYear}
              </p>
            </div>
          </div>

          {/* Native Mobile Share Sheet Button (Shown if Web Share is supported) */}
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              onClick={handleNativeShare}
              className="w-full p-3 bg-gradient-to-r from-[#FF8A00] to-orange-600 hover:from-amber-500 hover:to-orange-500 text-slate-950 rounded-xl text-xs sm:text-sm font-extrabold shadow-lg shadow-[#FF8A00]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span>Share via Device (WhatsApp, Stories &amp; Apps)</span>
            </button>
          )}

          {/* Social Platforms 1-Click Sharing Grid */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-[#F8FAFC] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#FF8A00]" />
              <span>Share Across Social Media</span>
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {shareChannels.map((channel) => (
                <a
                  key={channel.name}
                  href={channel.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-3 bg-[#0F172A] border ${channel.borderColor} ${channel.bgColor} rounded-xl transition-all flex flex-col items-center text-center gap-1.5 cursor-pointer group shadow-sm`}
                >
                  <div className={`${channel.textColor} group-hover:scale-110 transition-transform`}>
                    {channel.icon}
                  </div>
                  <span className="text-xs font-bold text-white group-hover:text-[#FF8A00] transition-colors">
                    {channel.name}
                  </span>
                  <span className="text-[10px] text-[#94A3B8] line-clamp-1">
                    {channel.description}
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* Dedicated Instagram Section */}
          <div className="p-4 bg-gradient-to-br from-purple-950/40 via-rose-950/30 to-amber-950/20 rounded-2xl border border-rose-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </div>
                <span className="text-xs font-bold text-white">Instagram Post &amp; Stories</span>
              </div>
              <a
                href="https://www.instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-rose-300 hover:text-white flex items-center gap-1 font-semibold"
              >
                <span>Open Instagram</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <p className="text-[11px] text-slate-300">
              Copy celebratory citation &amp; hashtags to paste directly into your Instagram feed or story post:
            </p>

            <button
              onClick={handleCopyCaption}
              className="w-full py-2 px-3 bg-rose-600/20 hover:bg-rose-600/30 text-rose-200 border border-rose-500/40 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {copiedCaption ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Caption &amp; Hashtags Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Instagram Caption &amp; Hashtags</span>
                </>
              )}
            </button>
          </div>

          {/* Copy Direct Link Section */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#94A3B8]">
              Direct Shareable Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full px-3 py-2 bg-[#0F172A] border border-[#475569] rounded-xl text-xs text-[#F8FAFC] font-mono select-all focus:outline-none focus:border-[#FF8A00]"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 bg-slate-800 hover:bg-[#FF8A00] text-white hover:text-slate-950 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer border border-slate-700 shadow-sm"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#334155] flex items-center justify-end bg-[#1E293B] shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#334155] hover:bg-[#475569] text-[#F8FAFC] rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
