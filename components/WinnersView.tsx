
import React from 'react';
import { winners } from '../services/data';

const WinnersView: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-6 py-12 animate-fade-in">
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#fb8c00]/10 border border-[#fb8c00]/20 text-[#fb8c00] text-xs font-black mb-6 tracking-widest uppercase">
          🏆 Hall of Fame
        </div>
        <h2 className="text-5xl font-black tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-r from-[#fb8c00] via-white to-[#f04124]">
          Previous Winners
        </h2>
        <p className="text-gray-400 text-lg font-medium">Recognizing consistent excellence in our workforce.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {winners.map((winner, idx) => (
          <div key={idx} className="glass rounded-[2rem] p-6 hover:border-[#fb8c00]/40 transition-all group">
            <div className="relative mb-6">
              <div className="aspect-square rounded-2xl overflow-hidden border-2 border-white/5">
                <img src={winner.image} alt={winner.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="absolute -bottom-3 -right-3 bg-[#fb8c00] text-[#1e145e] px-4 py-1.5 rounded-xl font-black text-[10px] shadow-lg">
                {winner.month} {winner.year}
              </div>
            </div>
            <h3 className="text-xl font-black text-white mb-1 tracking-tight">{winner.name}</h3>
            <p className="text-[#fb8c00] text-xs font-bold uppercase tracking-widest">{winner.org}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WinnersView;
