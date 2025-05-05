import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import WebApp from '@twa-dev/sdk';

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();

  // If already authenticated, redirect to profile
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/profile');
    }
  }, [isAuthenticated, navigate]);

  // Handle login button click
  const handleLogin = async () => {
    try {
      await login();
    } catch (error) {
      console.error('Login failed:', error);
    }
  };
  
  // Determine if we're inside Telegram
  const isTelegram = Boolean(WebApp?.initData);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      {/* Logo/Title */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-2 glitch-effect neon-text">
          {t('appName')}
        </h1>
        <div className="w-32 h-1 bg-primary mx-auto rounded-full"></div>
      </div>
      
      {/* Login button */}
      <div className="tech-panel w-full max-w-sm p-6">
        <p className="text-center mb-6 text-sm">
          {isTelegram 
            ? 'Добро пожаловать в цифровую феодальную эпоху. Начните свой путь от цифрового крестьянина к техно-лорду.'
            : 'Игра доступна только через Telegram.'}
        </p>
        
        <button 
          onClick={handleLogin}
          className="cyber-btn w-full mb-4"
          disabled={!isTelegram}
        >
          {t('auth.login')}
        </button>
        
        {!isTelegram && (
          <p className="text-error text-xs text-center">
            Откройте приложение через Telegram
          </p>
        )}
      </div>
      
      {/* Cyberpunk decorative elements */}
      <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-r from-primary/5 via-primary/20 to-primary/5"></div>
      <div className="absolute bottom-0 left-0 w-full h-4 bg-gradient-to-r from-primary/5 via-primary/20 to-primary/5"></div>
      
      {/* Scanline effect */}
      <div className="scanline"></div>
    </div>
  );
};

export default LoginPage; 