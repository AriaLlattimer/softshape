import { useEffect, useState, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ensureSeeded, getProfile } from './db/database';
import { Discover } from './pages/Discover';
import { History } from './pages/History';
import { Home } from './pages/Home';
import { Measurements } from './pages/Measurements';
import { Onboarding } from './pages/Onboarding';
import { Settings } from './pages/Settings';
import { Workout } from './pages/Workout';

function RequireProfile({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureSeeded();
      const profile = await getProfile();
      if (!cancelled) {
        setHasProfile(Boolean(profile?.onboardingComplete));
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <div className="boot">
        <p>Loading SoftShape…</p>
      </div>
    );
  }

  if (!hasProfile) return <Navigate to="/onboarding" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route
          element={
            <RequireProfile>
              <Layout />
            </RequireProfile>
          }
        >
          <Route index element={<Home />} />
          <Route path="workout" element={<Workout />} />
          <Route path="measurements" element={<Measurements />} />
          <Route path="history" element={<History />} />
          <Route path="discover" element={<Discover />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
