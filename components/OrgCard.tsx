
import React from 'react';
import { Organisation } from '../types';

interface Props {
  org: Organisation;
}

const OrgCard: React.FC<Props> = ({ org }) => {
  const handleVote = () => {
    window.location.href = org.url;
  };

  return (
    <div 
      onClick={handleVote}
      className="group relative h-80 rounded-[2.5rem] overflow-hidden cursor-pointer transition-all duration-500 hover:-translate-y-2 border border-white/10 hover:border-[#fb8c00]/50 shadow-2xl"
    >
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
        style={{ backgroundImage: `url(${org.bgImage})` }}
      />
      
      <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/40 to-transparent group-hover:from-[#1e145e]/90 transition-colors duration-500" />
      
      <div className="absolute inset-0 p-8 flex flex-col justify-end">
        <div className="mb-4">
          <h3 className="text-2xl font-black text-white mb-2 group-hover:text-[#fb8c00] transition-colors tracking-tighter">{org.name}</h3>
          <p className="text-sm text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300 leading-relaxed font-medium line-clamp-2">
            {org.description}
          </p>
        </div>
        
        <button className="w-fit px-8 py-3 bg-[#fb8c00] text-[#1e145e] text-xs font-black rounded-2xl hover:bg-white transition-all transform hover:scale-105 active:scale-95 shadow-xl shadow-orange-500/20">
          CAST YOUR VOTE
        </button>
      </div>
    </div>
  );
};

export default OrgCard;
