import { useState, useEffect, useCallback } from 'react';
import './AiContest.css';
import AiContestHero from './AiContestHero';
import AiLoadingStages from './AiLoadingStages';
import UserProfileDashboard from './UserProfileDashboard';
import AiCoachInsights from './AiCoachInsights';
import PersonalizedContestPreview from './PersonalizedContestPreview';
import ActiveContestSession from './ActiveContestSession';
import ContestResultsView from './ContestResultsView';
import { fetchPersonalizedContest } from '../../services/api';

const SESSION_STORAGE_KEY = 'nextcontest_ai_session';
const LAST_USERNAME_KEY = 'nextcontest_last_lc_user';

function getRestoredSession() {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(SESSION_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.contest && parsed.session && !parsed.session.completedTime) {
        const elapsed = (Date.now() - parsed.session.startTime) / 1000;
        const totalSec = (parsed.session.durationMinutes || 90) * 60;
        if (elapsed < totalSec) {
          return parsed;
        }
      }
    }
  } catch (e) {
    console.warn("Could not restore active session:", e);
  }
  return null;
}

const AiContestView = () => {
  const initialRestored = getRestoredSession();

  const [username, setUsername] = useState(() => initialRestored?.username || localStorage.getItem(LAST_USERNAME_KEY) || '');
  const [stage, setStage] = useState(() => initialRestored ? 'active_contest' : 'input');
  const [analysisData, setAnalysisData] = useState(() => initialRestored ? {
    contest: initialRestored.contest,
    profile: initialRestored.profile,
    ai_analysis: initialRestored.ai_analysis
  } : null);
  const [session, setSession] = useState(() => initialRestored?.session || null);
  const [error, setError] = useState(null);
  const [isRerolling, setIsRerolling] = useState(false);

  // Save active session changes to localStorage
  useEffect(() => {
    if (stage === 'active_contest' && analysisData?.contest && session) {
      localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({
          username,
          contest: analysisData.contest,
          profile: analysisData.profile,
          ai_analysis: analysisData.ai_analysis,
          session
        })
      );
    } else if (stage === 'results' || stage === 'input') {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, [stage, analysisData, session, username]);

  // Main analyze handler
  const handleAnalyze = async (inputUsername) => {
    const cleanUser = inputUsername.trim();
    if (!cleanUser) return;

    setUsername(cleanUser);
    localStorage.setItem(LAST_USERNAME_KEY, cleanUser);
    setError(null);
    setStage('analyzing');

    const minLoadTime = new Promise((resolve) => setTimeout(resolve, 3800));

    try {
      const [res] = await Promise.all([
        fetchPersonalizedContest(cleanUser),
        minLoadTime
      ]);

      if (res && res.contest) {
        setAnalysisData(res);
        setStage('dashboard');
      } else {
        throw new Error("Could not retrieve personalized contest data.");
      }
    } catch (err) {
      console.error("Personalized contest fetch failed:", err);
      setError(
        err?.message?.includes('404')
          ? `LeetCode user '@${cleanUser}' was not found. Please verify the username or check if profile is private.`
          : `Failed to analyze profile: ${err?.message || "Please ensure the backend is running and internet is active."}`
      );
      setStage('input');
    }
  };

  // Re-roll variant
  const handleReroll = async () => {
    if (!username || isRerolling) return;
    setIsRerolling(true);
    const newSeed = `seed_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    try {
      const res = await fetchPersonalizedContest(username, newSeed);
      if (res && res.contest) {
        setAnalysisData(res);
      }
    } catch (err) {
      console.error("Failed to reroll contest:", err);
    } finally {
      setIsRerolling(false);
    }
  };

  // Start 90-minute contest
  const handleStartContest = () => {
    const newSession = {
      startTime: Date.now(),
      durationMinutes: analysisData?.contest?.target_duration_minutes || 90,
      solvedSlugs: [],
      solveTimestamps: {},
      completedTime: null
    };
    setSession(newSession);
    setStage('active_contest');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Toggle problem solved with timestamp recording
  const handleToggleSolved = useCallback((slug) => {
    setSession((prev) => {
      if (!prev) return prev;
      const currentSolved = new Set(prev.solvedSlugs || []);
      const currentTimestamps = { ...(prev.solveTimestamps || {}) };

      if (currentSolved.has(slug)) {
        currentSolved.delete(slug);
        delete currentTimestamps[slug];
      } else {
        currentSolved.add(slug);
        const elapsedSec = Math.max(1, Math.floor((Date.now() - (prev.startTime || Date.now())) / 1000));
        const elapsedMin = Math.max(1, Math.ceil(elapsedSec / 60));
        currentTimestamps[slug] = elapsedMin;
      }
      return {
        ...prev,
        solvedSlugs: Array.from(currentSolved),
        solveTimestamps: currentTimestamps
      };
    });
  }, []);

  // Finish contest
  const handleFinishContest = useCallback(() => {
    setSession((prev) => ({
      ...prev,
      completedTime: Date.now()
    }));
    setStage('results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Back to profile view
  const handleBackToDashboard = () => {
    setStage('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // New contest
  const handleNewContest = () => {
    setSession(null);
    setStage('input');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="ai-contest-wrapper">
      {/* 1. Input Stage: Hero card */}
      {(stage === 'input' || stage === 'analyzing') && (
        <AiContestHero
          onAnalyze={handleAnalyze}
          isLoading={stage === 'analyzing'}
          error={error}
          initialUsername={username}
        />
      )}

      {/* 2. Analyzing Stage: 7-step loading display */}
      {stage === 'analyzing' && (
        <AiLoadingStages username={username} />
      )}

      {/* 3. Dashboard Stage: Profile + AI Coach + Contest Preview */}
      {stage === 'dashboard' && analysisData && (
        <>
          <UserProfileDashboard profile={analysisData.profile} />
          <AiCoachInsights aiAnalysis={analysisData.ai_analysis} />
          <PersonalizedContestPreview
            contest={analysisData.contest}
            onStartContest={handleStartContest}
            onReroll={handleReroll}
            isRerolling={isRerolling}
          />
        </>
      )}

      {/* 4. Active Contest Session: 90-min Live Room */}
      {stage === 'active_contest' && analysisData && session && (
        <ActiveContestSession
          contest={analysisData.contest}
          session={session}
          onToggleSolved={handleToggleSolved}
          onFinishContest={handleFinishContest}
        />
      )}

      {/* 5. Results Stage: Summary & Upsolve Links */}
      {stage === 'results' && analysisData && session && (
        <ContestResultsView
          contest={analysisData.contest}
          session={session}
          onNewContest={handleNewContest}
          onBackToDashboard={handleBackToDashboard}
        />
      )}
    </div>
  );
};

export default AiContestView;
