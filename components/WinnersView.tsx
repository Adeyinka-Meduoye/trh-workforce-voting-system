
import React from 'react';
import { winners } from '../services/data';
import ScrollReveal from './ScrollReveal';

const WinnersView: React.FC = () => {
  const handleShare = async (winner: typeof winners[0]) => {
    const shareData = {
      title: 'TRH Workforce Winner',
      text: `Celebrating ${winner.name} as the ${winner.month} ${winner.year} Team Member of the Month in ${winner.org}!`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div id="hall-of-fame" className="max-w-7xl mx-auto px-6 py-12">
      <ScrollReveal className="text-center mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#fb8c00]/10 border border-[#fb8c00]/20 text-[#fb8c00] text-xs font-black mb-6 tracking-widest uppercase">
          🏆 Hall of Fame
        </div>
        <h2 className="text-5xl font-black tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-r from-[#fb8c00] via-white to-[#f04124]">
          Previous Winners
        </h2>
        <p className="text-gray-400 text-lg font-medium">Recognizing consistent excellence in our workforce.</p>
      </ScrollReveal>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {winners.map((winner, idx) => (
          <ScrollReveal key={idx} delay={idx * 100}>
            <div className="glass rounded-[2rem] p-6 hover:border-[#fb8c00]/40 transition-all group relative">
              <div className="relative mb-6">
                <div className="aspect-square rounded-2xl overflow-hidden border-2 border-white/5">
                  <img 
                    src={winner.image} 
                    alt={winner.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                </div>
                <div className="absolute -bottom-3 -right-3 bg-[#fb8c00] text-[#1e145e] px-4 py-1.5 rounded-xl font-black text-[10px] shadow-lg">
                  {winner.month} {winner.year}
                </div>
              </div>
              
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="text-xl font-black text-white mb-1 tracking-tight">{winner.name}</h3>
                  <p className="text-[#fb8c00] text-xs font-bold uppercase tracking-widest">{winner.org}</p>
                </div>
                
                <button 
                  onClick={() => handleShare(winner)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-[#fb8c00]/20 hover:text-[#fb8c00] transition-colors group/share"
                  title="Share Profile"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </button>
              </div>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </div>
  );
};

export default WinnersView;
