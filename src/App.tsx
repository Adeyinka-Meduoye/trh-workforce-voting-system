import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthProvider } from './context/AuthContext';
import { SystemConfigProvider } from './context/SystemConfigContext';
import { ActionModalProvider } from './context/ActionModalContext';
import { ToastProvider } from './context/ToastContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { VoterPortal } from './pages/voter/VoterPortal';
import { DynamicVotingPage } from './pages/voter/DynamicVotingPage';
import { PublicResultsPage } from './pages/voter/PublicResultsPage';
import { WinnersHallOfFame } from './pages/voter/WinnersHallOfFame';
import { AdminDashboard } from './pages/admin/AdminDashboard';

type AppView = 'voter_portal' | 'vote_screen' | 'results_screen' | 'winners_hall_of_fame' | 'admin_dashboard';

interface HistoryState {
  view: AppView;
  exerciseId?: string | null;
}

// Helper to construct canonical URL for view state
const buildViewUrl = (view: AppView, exerciseId?: string | null): string => {
  const url = new URL(window.location.href);
  url.searchParams.delete('view');
  url.searchParams.delete('id');

  if (view === 'winners_hall_of_fame') {
    url.searchParams.set('view', 'hall-of-fame');
  } else if (view === 'vote_screen' && exerciseId) {
    url.searchParams.set('view', 'vote');
    url.searchParams.set('id', exerciseId);
  } else if (view === 'results_screen' && exerciseId) {
    url.searchParams.set('view', 'results');
    url.searchParams.set('id', exerciseId);
  } else if (view === 'admin_dashboard') {
    url.searchParams.set('view', 'admin');
  }
  // For voter_portal, clean root URL without view query param is cleanest
  return url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : '') + url.hash;
};

// Helper to determine initial view and exerciseId from current URL
const parseInitialViewState = (): HistoryState => {
  if (typeof window === 'undefined') {
    return { view: 'voter_portal', exerciseId: null };
  }
  const params = new URLSearchParams(window.location.search);
  const viewParam = params.get('view')?.toLowerCase();
  const idParam = params.get('id');

  if (viewParam === 'hall-of-fame' || viewParam === 'winners' || viewParam === 'winners_hall_of_fame') {
    return { view: 'winners_hall_of_fame', exerciseId: null };
  }
  if (viewParam === 'vote' && idParam) {
    return { view: 'vote_screen', exerciseId: idParam };
  }
  if (viewParam === 'results' && idParam) {
    return { view: 'results_screen', exerciseId: idParam };
  }
  if (viewParam === 'admin' || viewParam === 'admin_dashboard') {
    return { view: 'admin_dashboard', exerciseId: null };
  }
  return { view: 'voter_portal', exerciseId: null };
};

const MainAppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(() => parseInitialViewState().view);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(() => parseInitialViewState().exerciseId || null);

  // Initialize and attach history listener for device back/forward buttons
  useEffect(() => {
    const initialState = parseInitialViewState();
    // Replace initial state so the entry point has state attached
    window.history.replaceState(
      { view: initialState.view, exerciseId: initialState.exerciseId } satisfies HistoryState,
      '',
      window.location.href
    );

    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as HistoryState | null;
      if (state && state.view) {
        setCurrentView(state.view);
        setSelectedExerciseId(state.exerciseId || null);
      } else {
        // Fallback: parse URL parameters directly
        const parsed = parseInitialViewState();
        setCurrentView(parsed.view);
        setSelectedExerciseId(parsed.exerciseId);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleNavigate = useCallback((view: string, exerciseId?: string) => {
    let targetView: AppView = 'voter_portal';
    if (view === 'voter-portal' || view === 'voter_portal') {
      targetView = 'voter_portal';
    } else if (view === 'admin-dashboard' || view === 'admin_dashboard') {
      targetView = 'admin_dashboard';
    } else if (view === 'winners_hall_of_fame' || view === 'winners' || view === 'hall-of-fame') {
      targetView = 'winners_hall_of_fame';
    } else if (view === 'vote_screen') {
      targetView = 'vote_screen';
    } else if (view === 'results_screen') {
      targetView = 'results_screen';
    } else {
      targetView = view as AppView;
    }

    const targetId = exerciseId !== undefined ? exerciseId : (targetView === currentView ? selectedExerciseId : null);

    // Push new entry to browser history so device back button works naturally
    const newUrl = buildViewUrl(targetView, targetId);
    window.history.pushState(
      { view: targetView, exerciseId: targetId } satisfies HistoryState,
      '',
      newUrl
    );

    setCurrentView(targetView);
    if (exerciseId !== undefined) {
      setSelectedExerciseId(exerciseId);
    } else if (targetView !== 'vote_screen' && targetView !== 'results_screen') {
      setSelectedExerciseId(null);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentView, selectedExerciseId]);

  // Back button handler for child pages: triggers history back if available, otherwise navigates to portal
  const handleGoBack = useCallback(() => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      handleNavigate('voter_portal');
    }
  }, [handleNavigate]);

  return (
    <div className="min-h-screen flex flex-col bg-[#0F172A] text-[#F8FAFC] font-sans selection:bg-[#FF8A00]/30 selection:text-[#FF8A00]">
      {/* Top Navigation */}
      <Navbar
        currentView={currentView}
        onNavigate={(view) => handleNavigate(view as AppView)}
      />

      {/* Main Content Area with Smooth Route Transitions */}
      <main className={`flex-1 w-full ${currentView === 'voter_portal' ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'}`}>
        <AnimatePresence mode="wait">
          {currentView === 'voter_portal' && (
            <motion.div
              key="voter_portal"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-full"
            >
              <VoterPortal
                onSelectExercise={(id) => handleNavigate('vote_screen', id)}
                onViewResults={(id) => handleNavigate('results_screen', id)}
                onNavigateToWinners={() => handleNavigate('winners_hall_of_fame')}
              />
            </motion.div>
          )}

          {currentView === 'winners_hall_of_fame' && (
            <motion.div
              key="winners_hall_of_fame"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-full"
            >
              <WinnersHallOfFame
                onBack={handleGoBack}
                onViewResults={(id) => handleNavigate('results_screen', id)}
                onNavigateToVote={(id) => (id ? handleNavigate('vote_screen', id) : handleNavigate('voter_portal'))}
              />
            </motion.div>
          )}

          {currentView === 'vote_screen' && selectedExerciseId && (
            <motion.div
              key={`vote_screen_${selectedExerciseId}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-full"
            >
              <DynamicVotingPage
                exerciseId={selectedExerciseId}
                onBack={handleGoBack}
                onViewResults={(id) => handleNavigate('results_screen', id)}
              />
            </motion.div>
          )}

          {currentView === 'results_screen' && selectedExerciseId && (
            <motion.div
              key={`results_screen_${selectedExerciseId}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-full"
            >
              <PublicResultsPage
                exerciseId={selectedExerciseId}
                onBack={handleGoBack}
              />
            </motion.div>
          )}

          {currentView === 'admin_dashboard' && (
            <motion.div
              key="admin_dashboard"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-full"
            >
              <AdminDashboard
                onNavigateToVoterPortal={() => handleNavigate('voter_portal')}
                onNavigateToExerciseVote={(id) => handleNavigate('vote_screen', id)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SystemConfigProvider>
        <ToastProvider>
          <ActionModalProvider>
            <ErrorBoundary>
              <MainAppContent />
            </ErrorBoundary>
          </ActionModalProvider>
        </ToastProvider>
      </SystemConfigProvider>
    </AuthProvider>
  );
}
