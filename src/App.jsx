import { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Budgets from './pages/Budgets';
import Goals from './pages/Goals';
import Planejamento from './pages/Planejamento';
import CalendarPage from './pages/CalendarPage';
import Reports from './pages/Reports';
import SettingsPage from './pages/Settings';
import { initStore } from '@/lib/store';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Initialize cloud sync after auth
  useEffect(() => {
    if (!isLoadingAuth && !authError) {
      // Fetch cards, rules, templates, settings from Base44 entities
      initStore();
      // Migrate localStorage cards to Card entity (lazy import to keep it out of main bundle)
      import('@/lib/entitySetup').then(({ lumenSetup }) => {
        lumenSetup.migrateCardsToCloud().catch(() => {});
      });
    }
  }, [isLoadingAuth, authError]);

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-muted-foreground text-sm font-medium">Carregando Lúmen...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
        <Route path="/transactions" element={<ErrorBoundary><Transactions /></ErrorBoundary>} />
        <Route path="/planejamento" element={<ErrorBoundary><Planejamento /></ErrorBoundary>} />
        <Route path="/budgets" element={<ErrorBoundary><Budgets /></ErrorBoundary>} />
        <Route path="/goals" element={<ErrorBoundary><Goals /></ErrorBoundary>} />
        <Route path="/calendar" element={<ErrorBoundary><CalendarPage /></ErrorBoundary>} />
        <Route path="/reports" element={<ErrorBoundary><Reports /></ErrorBoundary>} />
        <Route path="/settings" element={<ErrorBoundary><SettingsPage /></ErrorBoundary>} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;