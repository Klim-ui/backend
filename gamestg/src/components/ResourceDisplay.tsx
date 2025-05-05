import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGameState } from '../contexts/GameStateContext';

const ResourceDisplay: React.FC = () => {
  const { t } = useTranslation();
  const { playerState } = useGameState();
  const { resources } = playerState;

  return (
    <div className="flex justify-between items-center text-xs font-mono mt-2 space-x-2 overflow-x-auto pb-1">
      {/* Data */}
      <div className="flex items-center">
        <div className="w-3 h-3 rounded-full bg-primary mr-1 animate-pulse"></div>
        <span>{t('resources.data')}: {resources.data}</span>
      </div>
      
      {/* Influence */}
      <div className="flex items-center">
        <div className="w-3 h-3 rounded-full bg-secondary mr-1"></div>
        <span>{t('resources.influence')}: {resources.influence}</span>
      </div>
      
      {/* Energy */}
      <div className="flex items-center">
        <div className="w-3 h-3 rounded-full bg-accent mr-1"></div>
        <span>{t('resources.energy')}: {resources.energy}</span>
      </div>
      
      {/* Loyalty */}
      <div className="flex items-center">
        <div className="w-3 h-3 rounded-full bg-success mr-1"></div>
        <span>{t('resources.loyalty')}: {resources.loyalty}</span>
      </div>
      
      {/* Credits (TON) */}
      <div className="flex items-center">
        <div className="w-3 h-3 rounded-full bg-white mr-1"></div>
        <span>{t('resources.credits')}: {resources.credits}</span>
      </div>
    </div>
  );
};

export default ResourceDisplay; 