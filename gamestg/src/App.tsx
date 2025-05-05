import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import WebApp from '@twa-dev/sdk';

// Contexts
import { AuthProvider } from './contexts/AuthContext';
import { GameStateProvider } from './contexts/GameStateContext';

// Components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Loader from './components/UI/Loader';

// Pages
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import MissionsPage from './pages/MissionsPage';
import NFTPage from './pages/NFTPage';
import CommunityPage from './pages/CommunityPage';
import ShopPage from './pages/ShopPage';

const App: React.FC = () => {
  const { t } = useTranslation();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize Telegram WebApp
    if (WebApp.isExpanded) {
      WebApp.ready();
      WebApp.enableClosingConfirmation();
    }
    
    // Set theme based on Telegram color scheme
    const isDarkMode = WebApp.colorScheme === 'dark';
    document.documentElement.classList.toggle('dark', isDarkMode);
    
    setIsInitialized(true);
  }, []);

  if (!isInitialized) {
    return <Loader text={t('loading')} />;
  }

  return (
    <AuthProvider>
      <GameStateProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/missions" element={<MissionsPage />} />
            <Route path="/nft" element={<NFTPage />} />
            <Route path="/community" element={<CommunityPage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/" element={<Navigate replace to="/profile" />} />
          </Route>
          
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </GameStateProvider>
    </AuthProvider>
  );
};

export default App; 