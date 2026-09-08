import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import VirementsList from './pages/VirementsList';
import ManualUpload from './pages/ManualUpload';
import SimulateurEDI from './pages/SimulateurEDI';
import ReferentielBanques from './pages/ReferentielBanques';
import SabAccounts from './pages/SabAccounts';
import AuditLogs from './pages/AuditLogs';
import ResetPassword from './pages/ResetPassword';
import FolderConfigs from './pages/FolderConfigs';
import OdScheduler from './pages/OdScheduler';

const MainLayout = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center gap-4 text-slate-400">
        <div className="w-10 h-10 border-3 border-[#772281] border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-semibold text-slate-300">Initialisation de l'application BDL RTGS...</span>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} />;
      case 'scheduler':
        return <OdScheduler />;
      case 'virements':
        return <VirementsList />;
      case 'upload':
        return <ManualUpload setActiveTab={setActiveTab} />;
      case 'simulateur':
        return <SimulateurEDI setActiveTab={setActiveTab} />;
      case 'banques':
        return <ReferentielBanques />;
      case 'sab':
        return <SabAccounts />;
      case 'folders':
        return <FolderConfigs />;
      case 'logs':
        return <AuditLogs />;
      case 'users':
        return <UsersManagement />;
      default:
        return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 flex flex-col selection:bg-[#772281] selection:text-white transition-colors duration-200">
      <Navbar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export const App = () => {
  const pathname = window.location.pathname;
  const search = window.location.search;
  const isResetPassword = pathname.includes('/reset-password') || search.includes('token=');

  return (
    <ThemeProvider>
      <AuthProvider>
        {isResetPassword ? <ResetPassword /> : <MainLayout />}
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
