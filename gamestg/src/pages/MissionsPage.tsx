import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameState, Mission } from '../contexts/GameStateContext';
import Loader from '../components/UI/Loader';

const MissionCard: React.FC<{
  mission: Mission;
  onComplete: (id: string) => void;
  disabled: boolean;
}> = ({ mission, onComplete, disabled }) => {
  const { t } = useTranslation();
  const [isCompleting, setIsCompleting] = useState(false);
  
  // Calculate cooldown time remaining
  const getCooldownTime = () => {
    if (!mission.cooldownEnds) return null;
    const now = Date.now();
    if (now > mission.cooldownEnds) return null;
    
    const timeLeft = Math.floor((mission.cooldownEnds - now) / 1000);
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };
  
  const cooldownTime = getCooldownTime();
  
  // Handle mission completion
  const handleComplete = async () => {
    if (disabled || mission.completed || cooldownTime) return;
    
    setIsCompleting(true);
    await onComplete(mission.id);
    setIsCompleting(false);
  };
  
  // Get mission type icon (simple SVG paths)
  const getMissionIcon = () => {
    switch (mission.type) {
      case 'collect':
        return 'M19 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h4l3 3 3-3h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 3.3c1.49 0 2.7 1.21 2.7 2.7 0 1.49-1.21 2.7-2.7 2.7-1.49 0-2.7-1.21-2.7-2.7 0-1.49 1.21-2.7 2.7-2.7zM18 16H6v-.9c0-2 4-3.1 6-3.1s6 1.1 6 3.1v.9z';
      case 'spy':
        return 'M12 6c3.79 0 7.17 2.13 8.82 5.5-.59 1.22-1.42 2.27-2.41 3.12l1.41 1.41c1.39-1.23 2.49-2.77 3.18-4.53C21.27 7.11 17 4 12 4c-1.27 0-2.49.2-3.64.57l1.65 1.65C10.66 6.09 11.32 6 12 6zm-1.07 1.14L13 9.21c.57.25 1.03.71 1.28 1.28l2.07 2.07c.08-.34.14-.7.14-1.07C16.5 9.01 14.48 7 12 7c-.37 0-.72.05-1.07.14zM2.01 3.87l2.68 2.68C3.06 7.83 1.77 9.53 1 11.5 2.73 15.89 7 19 12 19c1.52 0 2.98-.29 4.32-.82l3.42 3.42 1.41-1.41L3.42 2.45 2.01 3.87zm7.5 7.5l2.61 2.61c-.04.01-.08.02-.12.02-1.38 0-2.5-1.12-2.5-2.5 0-.05.01-.08.01-.13zm-3.4-3.4l1.75 1.75c-.23.55-.36 1.15-.36 1.78 0 2.48 2.02 4.5 4.5 4.5.63 0 1.23-.13 1.77-.36l.98.98c-.88.24-1.8.38-2.75.38-3.79 0-7.17-2.13-8.82-5.5.7-1.43 1.72-2.61 2.93-3.53z';
      case 'capture':
        return 'M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L22 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z';
      case 'hack':
        return 'M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z';
      default:
        return 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z';
    }
  };
  
  // Get difficulty color
  const getDifficultyColor = () => {
    switch (mission.difficulty) {
      case 'easy':
        return 'text-success';
      case 'medium':
        return 'text-accent';
      case 'hard':
        return 'text-error';
      default:
        return 'text-white';
    }
  };
  
  return (
    <div className={`tech-panel border ${mission.completed ? 'border-success/30' : 'border-primary/30'}`}>
      <div className="flex justify-between items-start">
        {/* Mission icon and type */}
        <div className="flex items-center">
          <div className="w-10 h-10 mr-3 flex items-center justify-center border border-primary/50 rounded">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-6 h-6 text-primary"
            >
              <path d={getMissionIcon()} />
            </svg>
          </div>
          <div>
            <h3 className="font-medium">{t(`missions.${mission.type}`)}</h3>
            <div className={`text-xs ${getDifficultyColor()}`}>
              {t(`missions.difficulty`)}: {t(`missions.${mission.difficulty}`)}
            </div>
          </div>
        </div>
        
        {/* Mission status badge */}
        {mission.completed && (
          <div className="bg-success/20 text-success text-xs px-2 py-1 rounded">
            {t('missions.completed')}
          </div>
        )}
      </div>
      
      {/* Rewards */}
      <div className="mt-3 border-t border-primary/20 pt-3">
        <div className="text-xs text-gray-400 mb-1">{t('missions.reward')}:</div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(mission.rewards).map(([key, value]) => {
            if (!value) return null;
            return (
              <div key={key} className="text-xs bg-surface px-2 py-1 rounded-sm">
                {t(`resources.${key}`)}: <span className="text-primary">+{value}</span>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Action button */}
      <div className="mt-3">
        <button
          onClick={handleComplete}
          disabled={disabled || mission.completed || Boolean(cooldownTime) || isCompleting}
          className={`w-full py-1.5 text-sm ${
            mission.completed 
              ? 'bg-success/20 text-success cursor-default'
              : cooldownTime 
                ? 'bg-gray-800 text-gray-500 cursor-default'
                : 'cyber-btn'
          }`}
        >
          {isCompleting ? (
            <Loader size="sm" />
          ) : mission.completed ? (
            t('missions.completed')
          ) : cooldownTime ? (
            `Перезарядка: ${cooldownTime}`
          ) : (
            t('missions.complete')
          )}
        </button>
      </div>
    </div>
  );
};

const MissionsPage: React.FC = () => {
  const { t } = useTranslation();
  const { playerState, isLoading, completeMission, refreshMissions } = useGameState();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  if (isLoading) {
    return <Loader text={t('loading')} />;
  }
  
  // Handle mission completion
  const handleCompleteMission = async (missionId: string) => {
    await completeMission(missionId);
  };
  
  // Handle mission refresh
  const handleRefreshMissions = async () => {
    setIsRefreshing(true);
    refreshMissions();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };
  
  // Check if player has enough energy
  const hasEnoughEnergy = playerState.resources.energy >= 10;
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold neon-text">
          {t('missions.daily')}
        </h2>
        <button 
          onClick={handleRefreshMissions}
          disabled={isRefreshing}
          className="cyber-btn-secondary text-xs px-3 py-1.5"
        >
          {isRefreshing ? <Loader size="sm" /> : 'Обновить'}
        </button>
      </div>
      
      {/* Energy warning */}
      {!hasEnoughEnergy && (
        <div className="mb-4 p-3 border border-error/30 bg-error/10 rounded text-sm">
          Недостаточно энергии! Требуется 10 энергии для выполнения задания.
        </div>
      )}
      
      {/* Missions list */}
      <div className="space-y-4">
        {playerState.missions.length === 0 ? (
          <div className="tech-panel text-center text-gray-400">
            Нет доступных заданий. Обновите список.
          </div>
        ) : (
          playerState.missions.map(mission => (
            <MissionCard
              key={mission.id}
              mission={mission}
              onComplete={handleCompleteMission}
              disabled={!hasEnoughEnergy}
            />
          ))
        )}
      </div>
      
      {/* Mission help text */}
      <div className="mt-6 p-3 border border-primary/30 rounded text-xs text-gray-400">
        <p className="mb-2">
          <span className="text-primary">Информация:</span> Выполнение заданий потребляет 10 единиц энергии.
        </p>
        <p>
          Задания разной сложности дают разное количество опыта и ресурсов. Задания высокой сложности имеют шанс награды в TON-кредитах.
        </p>
      </div>
    </div>
  );
};

export default MissionsPage; 