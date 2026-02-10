
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import OrgCard from './components/OrgCard';
import AboutView from './components/AboutView';
import WinnersView from './components/WinnersView';
import ScrollReveal from './components/ScrollReveal';
import { organisations } from './services/data';
import { View } from './types';

const App: React.FC = () => {
  const [view, setView] = useState<View>(View.HOME);

  useEffect(() => {
    // Only scroll to top if we didn't just trigger a specific scroll-to-id in the Header
    if (view !== View.WINNERS) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [view]);

  return (
    <div className="min-h-screen bg-[#020617] text-gray-100 selection:bg-[#fb8c00]/30">
      {/* Background logo-themed glows */}
      <div className="fixed top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#1e145e]/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#fb8c00]/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed top-[20%] right-[-5%] w-[30%] h-[30%] bg-[#f04124]/5 rounded-full blur-[120px] pointer-events-none"></div>
      
      <Header currentView={view} setView={setView} />
      
      <main className="pt-24 sm:pt-32 pb-24 relative">
        {view === View.HOME && (
          <>
            <section className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 mb-16 sm:mb-24">
              {/* Hero Background Image Container */}
              <div className="absolute inset-0 z-[-1] rounded-[3rem] overflow-hidden opacity-30 mask-gradient">
                <img 
                  src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=2000" 
                  alt="Workforce Background" 
                  className="w-full h-full object-cover scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#020617] via-transparent to-[#020617]"></div>
              </div>

              <div className="text-center py-12 sm:py-24">
                <div className="animate-hero-reveal [animation-delay:100ms] inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#fb8c00]/10 border border-[#fb8c00]/20 text-[#fb8c00] text-[10px] sm:text-xs font-black mb-6 sm:mb-8 tracking-widest uppercase">
                  <span>✨ Celebrating Commitment</span>
                </div>
                
                <h1 className="animate-hero-reveal [animation-delay:300ms] text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter mb-8 leading-[1.1] sm:leading-[0.85] px-2">
                  TRH Workforce <br className="hidden sm:block" />
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#fb8c00] via-white to-[#f04124]">
                    Team Member of the Month
                  </span>
                </h1>
                
                <p className="animate-hero-reveal [animation-delay:500ms] text-base sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 sm:mb-14 leading-relaxed font-medium">
                  Honouring excellence. Celebrating commitment. Elevating God's Kingdom. Choose your organization 
                  and cast your vote to recognize outstanding service.
                </p>
                
                <button 
                  onClick={() => document.getElementById('grid')?.scrollIntoView({ behavior: 'smooth' })}
                  className="animate-hero-reveal [animation-delay:700ms] group flex flex-col items-center gap-4 mx-auto"
                >
                  <p className="text-[10px] uppercase tracking-[0.4em] text-gray-600 font-black group-hover:text-white transition-colors">Select Organisation</p>
                  <div className="w-7 h-12 border-2 border-white/10 rounded-full p-1.5 flex justify-center group-hover:border-[#fb8c00]/50 transition-colors">
                    <div className="w-1 h-3 bg-[#fb8c00] rounded-full animate-bounce"></div>
                  </div>
                </button>
              </div>
            </section>

            <section id="grid" className="max-w-7xl mx-auto px-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                {organisations.map((org, i) => (
                  <ScrollReveal key={i} delay={i * 50}>
                    <OrgCard org={org} />
                  </ScrollReveal>
                ))}
              </div>
            </section>
          </>
        )}

        {view === View.WINNERS && <WinnersView />}
        {view === View.ABOUT && <AboutView />}
      </main>

      <footer className="py-16 sm:py-24 border-t border-white/5 bg-[#020617] relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex flex-col items-center gap-4 mb-10">
            <div className="flex items-center justify-center gap-4">
              <div className="w-10 h-10 flex items-center justify-center">
                 <img 
                  src="/images/TRH-white-trans.png" 
                  alt="TRH Logo" 
                  className="w-full h-full object-contain brightness-110"
                />
              </div>
              <span className="text-xl font-black tracking-tighter text-white">TRH Workforce</span>
            </div>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 sm:gap-8 mb-16">
            {['Honor', 'Excellence', 'Accountability', 'Results', 'Trust'].map(v => (
              <span key={v} className="text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-[#fb8c00] transition-colors cursor-default">
                {v}
              </span>
            ))}
          </div>

          <div className="pt-8 border-t border-white/5 flex flex-col items-center gap-8">
            <p className="text-[10px] text-gray-600 font-bold tracking-widest uppercase text-center w-full">
              © 2026 TRH MINISTRIES GLOBAL
            </p>
            
            <div className="flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
              <p className="text-[9px] font-bold text-gray-600 uppercase tracking-[0.3em]">Developed By</p>
              <p className="text-[11px] font-black text-gray-500 tracking-tighter">MEDUS TECHNOLOGIES</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
