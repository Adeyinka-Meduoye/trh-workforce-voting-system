
import React, { useState } from 'react';
import { View } from '../types';

interface Props {
  currentView: View;
  setView: (v: View) => void;
}

const Header: React.FC<Props> = ({ currentView, setView }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuItems = [
    { label: 'Vote', view: View.HOME },
    { label: 'Winners', view: View.WINNERS },
    { label: 'About', view: View.ABOUT },
  ];

  const handleNav = (view: View) => {
    setView(view);
    setIsMenuOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] px-4 sm:px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between glass rounded-2xl sm:rounded-3xl px-4 sm:px-6 py-3 transition-all duration-300">
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => handleNav(View.HOME)}
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center transition-transform group-hover:scale-110">
            <img 
              src="/images/logo-trans.png" 
              alt="TRH Logo" 
              className="w-full h-full object-contain filter drop-shadow-md"
              onError={(e) => {
                // Fallback if image fails to load during transition
                (e.target as HTMLImageElement).src = "https://i.postimg.cc/4yRFmpJw/TRH_logo.png";
              }}
            />
          </div>
          <span className="text-lg sm:text-xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-gray-500">
            TRH Workforce
          </span>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-4">
          {menuItems.map((item) => (
            <button 
              key={item.view}
              onClick={() => handleNav(item.view)}
              className={`text-sm px-4 py-2 rounded-xl font-bold transition-all duration-300 ${
                currentView === item.view 
                  ? 'bg-[#fb8c00] text-[#1e145e] shadow-lg shadow-orange-500/30 scale-105' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Mobile Toggle */}
        <button 
          className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5 focus:outline-none"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <span className={`block w-6 h-0.5 bg-white transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
          <span className={`block w-6 h-0.5 bg-white transition-all duration-300 ${isMenuOpen ? 'opacity-0' : ''}`}></span>
          <span className={`block w-6 h-0.5 bg-white transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <div className={`md:hidden fixed inset-0 bg-[#020617]/95 backdrop-blur-xl z-[-1] transition-transform duration-500 ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <nav className="flex flex-col items-center justify-center h-full gap-8">
          {menuItems.map((item) => (
            <button 
              key={item.view}
              onClick={() => handleNav(item.view)}
              className={`text-2xl font-black tracking-tighter transition-all ${
                currentView === item.view ? 'text-[#fb8c00]' : 'text-gray-400'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
};

export default Header;
