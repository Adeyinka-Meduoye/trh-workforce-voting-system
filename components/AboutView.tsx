
import React from 'react';

const AboutView: React.FC = () => {
  return (
    <section className="max-w-4xl mx-auto px-6 py-12 animate-fade-in">
      <div className="text-center mb-16">
        <h2 className="text-5xl font-black mb-6 bg-clip-text text-transparent bg-gradient-to-r from-[#fb8c00] to-white tracking-tighter">
          Excellence is Our Standard
        </h2>
        <p className="text-gray-400 text-lg font-medium">Elevating standards through intentional recognition.</p>
      </div>
      
      <div className="space-y-12">
        <div className="glass p-12 rounded-[2.5rem] relative overflow-hidden group border-[#fb8c00]/10">
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-[#fb8c00]/5 rounded-full blur-[100px] transition-all group-hover:bg-[#fb8c00]/10"></div>
          <p className="text-xl text-gray-200 leading-relaxed font-semibold">
            The TRH Workforce Team Member of the Month initiative celebrates individuals 
            who consistently embody our core values—<span className="text-[#fb8c00] font-black">Honor, Excellence, Accountability, Results, and Trust</span>.
            This initiative nurtures a culture of teamwork and exceptional commitment across 
            every organization and department of TRH Global.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="glass p-10 rounded-[2rem] border-l-8 border-[#fb8c00] hover:scale-[1.02] transition-transform">
            <h3 className="text-2xl font-black mb-8 text-[#fb8c00] tracking-tight">The Process</h3>
            <div className="space-y-8">
              {[
                { n: '1', t: 'Internal Voting', d: 'Monthly departmental voting to identify local standouts.' },
                { n: '2', t: 'Global Selection', d: 'Winners move to final workforce-wide committee selection.' },
                { n: '3', t: 'Recognition', d: 'Finalists are honored, celebrated, and showcased globally.' }
              ].map(item => (
                <div key={item.n} className="flex gap-5">
                  <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-[#fb8c00] flex items-center justify-center font-black text-[#1e145e] shadow-lg">
                    {item.n}
                  </div>
                  <div>
                    <h4 className="font-black text-white text-lg tracking-tight mb-1">{item.t}</h4>
                    <p className="text-sm text-gray-400 font-medium">{item.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass p-10 rounded-[2rem] border-l-8 border-[#f04124] flex flex-col justify-center hover:scale-[1.02] transition-transform">
            <div className="w-20 h-20 bg-[#f04124]/10 rounded-3xl flex items-center justify-center mb-8 border border-[#f04124]/20">
              <svg className="w-10 h-10 text-[#f04124]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h3 className="text-3xl font-black mb-4 tracking-tighter text-white">The Assignment</h3>
            <p className="text-gray-400 leading-relaxed font-medium text-lg">
              To create a workspace where every effort for the Kingdom is seen, valued, and amplified. 
              We believe that acknowledging excellence is the first step toward achieving greatness 
              as a unified workforce.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutView;
