import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGameState } from '../contexts/GameStateContext';
import ResourceDisplay from './ResourceDisplay';
import NavigationBar from './NavigationBar';
import { PlayerRank } from '../contexts/GameStateContext';

const Layout: React.FC = () => {
  const { t } = useTranslation();
  const { playerState } = useGameState();
  
  // Determine rank color based on player rank
  const getRankColor = (rank: PlayerRank) => {
    switch (rank) {
      case PlayerRank.PEASANT:
        return 'text-white';
      case PlayerRank.VASSAL:
        return 'text-primary neon-text';
      case PlayerRank.LORD:
        return 'text-secondary neon-text-magenta';
      case PlayerRank.MAGNATE:
        return 'text-accent neon-text-yellow';
      default:
        return 'text-white';
    }
  };

  // Progress percentage for level bar
  const levelProgress = Math.min(
    100,
    Math.floor((playerState.experience / playerState.nextLevelXp) * 100)
  );

  return (
    <div className="flex flex-col min-h-screen bg-background text-white">
      {/* Header with resources */}
      <header className="sticky top-0 z-50 border-b border-primary/30 bg-background/90 backdrop-blur-sm">
        <div className="container mx-auto p-2">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold neon-text glitch-effect">
              {t('appName')}
            </h1>
            
            <div className="text-sm font-mono">
              <span className={`${getRankColor(playerState.rank)}`}>
                {t(`ranks.${playerState.rank}`)}
              </span>
              <span className="ml-2">Lvl {playerState.level}</span>
            </div>
          </div>
          
          {/* Resources */}
          <ResourceDisplay />
          
          {/* XP Bar */}
          <div className="mt-1 h-1 w-full bg-surface rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary"
              style={{ width: `${levelProgress}%` }}
            />
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="flex-grow container mx-auto p-4 pb-20">
        <Outlet />
      </main>
      
      {/* Navigation bar at bottom */}
      <NavigationBar />
      
      {/* Scanline effect */}
      <div className="scanline" />
    </div>
  );
};

export default Layout; 