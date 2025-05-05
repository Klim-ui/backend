import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useGameState, PlayerRank } from '../contexts/GameStateContext';
import Loader from '../components/UI/Loader';

const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const { user, isWalletConnected, walletAddress, connectWallet, disconnectWallet } = useAuth();
  const { playerState, isLoading, upgradeRank } = useGameState();
  
  if (isLoading) {
    return <Loader text={t('loading')} />;
  }
  
  // Format wallet address for display (first 6 chars + ... + last 4 chars)
  const formatWalletAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  // Calculate next rank requirements
  const getNextRankRequirements = () => {
    switch (playerState.rank) {
      case PlayerRank.PEASANT:
        return {
          rank: PlayerRank.VASSAL,
          requirements: { data: 1000, influence: 200, loyalty: 50 }
        };
      case PlayerRank.VASSAL:
        return {
          rank: PlayerRank.LORD,
          requirements: { data: 5000, influence: 1000, loyalty: 200, credits: 5 }
        };
      case PlayerRank.LORD:
        return {
          rank: PlayerRank.MAGNATE,
          requirements: { data: 20000, influence: 5000, loyalty: 1000, credits: 20 }
        };
      default:
        return null;
    }
  };
  
  const nextRank = getNextRankRequirements();
  
  // Handle rank upgrade
  const handleUpgradeRank = () => {
    if (upgradeRank()) {
      // Show success message
    } else {
      // Show error message (not enough resources)
    }
  };
  
  return (
    <div className="space-y-6">
      {/* User profile card */}
      <div className="tech-panel">
        <div className="flex items-center space-x-4">
          {/* Avatar */}
          <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-primary">
            {user?.photo_url ? (
              <img 
                src={user.photo_url} 
                alt="User Avatar" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-surface flex items-center justify-center text-primary">
                {user?.first_name?.charAt(0) || '?'}
              </div>
            )}
            <div className="absolute inset-0 border border-primary/30 rounded-full"></div>
          </div>
          
          {/* User info */}
          <div className="flex-1">
            <h2 className="font-bold text-lg">
              {user?.first_name} {user?.last_name}
              {user?.username && <span className="text-primary text-sm ml-1">@{user.username}</span>}
            </h2>
            <div className={`text-sm font-mono ${
              playerState.rank === PlayerRank.PEASANT ? 'text-white' : 
              playerState.rank === PlayerRank.VASSAL ? 'neon-text' : 
              playerState.rank === PlayerRank.LORD ? 'neon-text-magenta' : 
              'neon-text-yellow'
            }`}>
              {t(`ranks.${playerState.rank}`)}
            </div>
          </div>
        </div>
        
        {/* Wallet connection */}
        <div className="mt-4 pt-4 border-t border-primary/30">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              {isWalletConnected ? (
                <div>
                  <span className="text-primary mr-1">•</span>
                  {formatWalletAddress(walletAddress || '')}
                </div>
              ) : (
                <div className="text-gray-400">{t('auth.connectWallet')}</div>
              )}
            </div>
            <button 
              onClick={isWalletConnected ? disconnectWallet : connectWallet}
              className={`text-xs px-2 py-1 ${
                isWalletConnected ? 'border border-error/50 text-error' : 'cyber-btn'
              }`}
            >
              {isWalletConnected ? t('auth.disconnectWallet') : t('auth.connectWallet')}
            </button>
          </div>
        </div>
      </div>
      
      {/* Stats panel */}
      <div className="tech-panel">
        <h3 className="text-primary text-lg font-bold mb-3">{t('nav.profile')}</h3>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Level */}
          <div className="border border-primary/30 rounded p-3">
            <div className="text-gray-400 text-sm">Уровень</div>
            <div className="text-2xl font-bold">{playerState.level}</div>
            <div className="text-xs mt-1">
              {playerState.experience} / {playerState.nextLevelXp} XP
            </div>
            <div className="w-full h-1 bg-surface mt-2 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary"
                style={{ 
                  width: `${Math.min(100, Math.floor((playerState.experience / playerState.nextLevelXp) * 100))}%` 
                }}
              />
            </div>
          </div>
          
          {/* Rank */}
          <div className="border border-primary/30 rounded p-3">
            <div className="text-gray-400 text-sm">Ранг</div>
            <div className={`text-2xl font-bold ${
              playerState.rank === PlayerRank.PEASANT ? 'text-white' : 
              playerState.rank === PlayerRank.VASSAL ? 'neon-text' : 
              playerState.rank === PlayerRank.LORD ? 'neon-text-magenta' : 
              'neon-text-yellow'
            }`}>
              {t(`ranks.${playerState.rank}`)}
            </div>
            
            {nextRank && (
              <div className="mt-2">
                <button 
                  onClick={handleUpgradeRank}
                  className="cyber-btn text-xs w-full"
                >
                  Повысить ранг
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Next rank requirements */}
        {nextRank && (
          <div className="mt-4 border border-primary/30 rounded p-3">
            <div className="text-sm font-medium mb-2">
              Требования для получения ранга <span className="text-primary">{t(`ranks.${nextRank.rank}`)}</span>:
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(nextRank.requirements).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span>{t(`resources.${key}`)}</span>
                  <span className={playerState.resources[key as keyof typeof playerState.resources] >= value ? 'text-success' : 'text-error'}>
                    {playerState.resources[key as keyof typeof playerState.resources]}/{value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {!nextRank && (
          <div className="mt-4 border border-accent/30 rounded p-3 text-accent text-center">
            Вы достигли максимального ранга!
          </div>
        )}
      </div>
      
      {/* Game achievements & stats placeholders */}
      <div className="tech-panel">
        <h3 className="text-secondary text-lg font-bold mb-3">Достижения</h3>
        <p className="text-gray-400 text-sm">Выполняйте задания, чтобы открыть достижения.</p>
        
        {/* Placeholder achievements */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[1, 2, 3, 4, 5, 6].map((_, index) => (
            <div key={index} className="border border-gray-700 h-16 rounded flex items-center justify-center text-gray-600">
              ?
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage; 