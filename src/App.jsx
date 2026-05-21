import { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Budgets from './pages/Budgets';
import Goals from './pages/Goals';
import Investments from './pages/Investments';
import Recurring from './pages/Recurring';
import Planejamento from './pages/Planejamento';
import CalendarPage from './pages/CalendarPage';
import Reports from './pages/Reports';
import SettingsPage from './pages/Settings';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Signup from './pages/Signup';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoadingAuth, authChecked } = useAuth();

  if (isLoadingAuth || !authChecked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-muted-foreground text-sm font-medium">Carregando Lúmen...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const AuthenticatedLayout = () => {
  const { isLoadingAuth, isAuthenticated, authChecked } = useAuth();

  useEffect(() => {
    if (isAuthenticated && authChecked) {
      import('@/lib/entitySetup').then(({ lumenSetup }) => {
        lumenSetup.migrateCardsToCloud().catch(() => {});
      });
    }
  }, [isAuthenticated, authChecked]);

  if (isLoadingAuth || !authChecked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-muted-foreground text-sm font-medium">Carregando Lúmen...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout />
  );
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        element={
          <ProtectedRoute>
            <AuthenticatedLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
        <Route path="/transactions" element={<ErrorBoundary><Transactions /></ErrorBoundary>} />
        <Route path="/planejamento" element={<ErrorBoundary><Planejamento /></ErrorBoundary>} />
        <Route path="/budgets" element={<ErrorBoundary><Budgets /></ErrorBoundary>} />
        <Route path="/goals" element={<ErrorBoundary><Goals /></ErrorBoundary>} />
        <Route path="/investments" element={<ErrorBoundary><Investments /></ErrorBoundary>} />
        <Route path="/recurring" element={<ErrorBoundary><Recurring /></ErrorBoundary>} />
        <Route path="/calendar" element={<ErrorBoundary><CalendarPage /></ErrorBoundary>} />
        <Route path="/reports" element={<ErrorBoundary><Reports /></ErrorBoundary>} />
        <Route path="/settings" element={<ErrorBoundary><SettingsPage /></ErrorBoundary>} />
        <Route path="/profile" element={<ErrorBoundary><Profile /></ErrorBoundary>} />
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
            <AppRoutes />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
