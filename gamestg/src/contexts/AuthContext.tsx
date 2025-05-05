import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import TonConnect from '@tonconnect/sdk';

// Types
interface UserData {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserData | null;
  isWalletConnected: boolean;
  walletAddress: string | null;
  login: () => Promise<void>;
  logout: () => void;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}

interface AuthProviderProps {
  children: ReactNode;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// TON Connect connector
const tonConnector = new TonConnect({
  manifestUrl: 'https://your-domain.com/tonconnect-manifest.json',
});

// Provider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [isWalletConnected, setIsWalletConnected] = useState<boolean>(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const navigate = useNavigate();

  // Check Telegram auth on mount
  useEffect(() => {
    const initAuth = () => {
      // Check if we have a user from Telegram WebApp
      if (WebApp.initDataUnsafe?.user) {
        const telegramUser = WebApp.initDataUnsafe.user;
        setUser({
          id: telegramUser.id,
          username: telegramUser.username,
          first_name: telegramUser.first_name,
          last_name: telegramUser.last_name,
          photo_url: telegramUser.photo_url,
        });
        setIsAuthenticated(true);
        navigate('/profile');
      } else {
        // No authenticated user
        setIsAuthenticated(false);
        navigate('/login');
      }
    };

    initAuth();
  }, [navigate]);

  // Check wallet connection on mount
  useEffect(() => {
    const unsubscribe = tonConnector.onStatusChange(wallet => {
      if (wallet) {
        setIsWalletConnected(true);
        setWalletAddress(wallet.account.address);
      } else {
        setIsWalletConnected(false);
        setWalletAddress(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Login function (for demo only, in production this is handled by Telegram)
  const login = async (): Promise<void> => {
    // For development, mock Telegram user
    if (process.env.NODE_ENV === 'development') {
      const mockUser = {
        id: 123456789,
        username: 'demo_user',
        first_name: 'Demo',
        last_name: 'User',
        photo_url: 'https://t.me/i/userpic/320/MKstWnQtMrFubuNSZG1YjVkr9IqScm0o6JX76HZRC-c.jpg',
      };
      setUser(mockUser);
      setIsAuthenticated(true);
      navigate('/profile');
    } else {
      // In production, just check the WebApp user
      if (WebApp.initDataUnsafe?.user) {
        login();
      } else {
        console.error('Cannot authenticate: Not in Telegram WebApp context');
      }
    }
  };

  // Logout function
  const logout = (): void => {
    setUser(null);
    setIsAuthenticated(false);
    navigate('/login');
  };

  // Connect wallet
  const connectWallet = async (): Promise<void> => {
    try {
      const walletConnectionSource = {
        universalLink: 'https://app.tonkeeper.com/ton-connect',
        bridgeUrl: 'https://bridge.tonapi.io/bridge',
      };
      await tonConnector.connect(walletConnectionSource);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  // Disconnect wallet
  const disconnectWallet = (): void => {
    tonConnector.disconnect();
  };

  const value = {
    isAuthenticated,
    user,
    isWalletConnected,
    walletAddress,
    login,
    logout,
    connectWallet,
    disconnectWallet,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Create a hook to use the auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 