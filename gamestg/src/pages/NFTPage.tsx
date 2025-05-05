import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useGameState } from '../contexts/GameStateContext';
import Loader from '../components/UI/Loader';

const NFTPage: React.FC = () => {
  const { t } = useTranslation();
  const { isWalletConnected } = useAuth();
  const { playerState, isLoading } = useGameState();
  
  if (isLoading) {
    return <Loader text={t('loading')} />;
  }
  
  // Placeholder NFT data
  const nft = playerState.nftId ? {
    id: playerState.nftId,
    name: 'Cyber Peasant #1337',
    image: 'https://placehold.co/300x300/1a1926/00f2ff?text=NFT',
    level: playerState.level,
    rank: playerState.rank,
  } : null;
  
  return (
    <div>
      <h2 className="text-xl font-bold neon-text mb-4">
        {t('nav.nft')}
      </h2>
      
      {!isWalletConnected ? (
        // No wallet connected
        <div className="tech-panel text-center p-6">
          <p className="mb-4 text-gray-400">
            Для работы с NFT необходимо подключить кошелек TON.
          </p>
          <button className="cyber-btn">
            {t('auth.connectWallet')}
          </button>
        </div>
      ) : !nft ? (
        // No NFT yet
        <div className="tech-panel">
          <p className="mb-4 text-gray-400">
            У вас еще нет NFT. Вы можете создать новый NFT или привязать существующий.
          </p>
          
          <div className="grid grid-cols-2 gap-4 mt-6">
            <button className="cyber-btn">
              {t('nft.mint')}
            </button>
            <button className="cyber-btn">
              {t('nft.connect')}
            </button>
          </div>
        </div>
      ) : (
        // NFT display
        <div>
          <div className="tech-panel">
            <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6">
              {/* NFT image */}
              <div className="relative w-48 h-48 border-2 border-primary neon-border rounded-lg overflow-hidden">
                <img 
                  src={nft.image} 
                  alt={nft.name} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 glitch-effect pointer-events-none"></div>
              </div>
              
              {/* NFT info */}
              <div className="flex-1">
                <h3 className="text-xl font-bold">{nft.name}</h3>
                
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">ID:</span>
                    <span className="font-mono">{nft.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Уровень:</span>
                    <span>{nft.level}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Ранг:</span>
                    <span className="neon-text">{t(`ranks.${nft.rank}`)}</span>
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-primary/30">
                  <button className="cyber-btn w-full">
                    {t('nft.upgrade')}
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* NFT Attributes */}
          <div className="tech-panel mt-4">
            <h3 className="text-primary font-bold mb-3">Атрибуты</h3>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Placeholder attributes */}
              <div className="border border-primary/30 rounded p-2">
                <div className="text-xs text-gray-400">Редкость</div>
                <div className="text-sm">Обычный</div>
                <div className="w-full bg-surface h-1.5 rounded-full mt-1 overflow-hidden">
                  <div className="bg-primary h-full" style={{ width: '20%' }}></div>
                </div>
              </div>
              
              <div className="border border-primary/30 rounded p-2">
                <div className="text-xs text-gray-400">Сила</div>
                <div className="text-sm">10</div>
                <div className="w-full bg-surface h-1.5 rounded-full mt-1 overflow-hidden">
                  <div className="bg-primary h-full" style={{ width: '10%' }}></div>
                </div>
              </div>
              
              <div className="border border-primary/30 rounded p-2">
                <div className="text-xs text-gray-400">Интеллект</div>
                <div className="text-sm">25</div>
                <div className="w-full bg-surface h-1.5 rounded-full mt-1 overflow-hidden">
                  <div className="bg-primary h-full" style={{ width: '25%' }}></div>
                </div>
              </div>
              
              <div className="border border-primary/30 rounded p-2">
                <div className="text-xs text-gray-400">Харизма</div>
                <div className="text-sm">15</div>
                <div className="w-full bg-surface h-1.5 rounded-full mt-1 overflow-hidden">
                  <div className="bg-primary h-full" style={{ width: '15%' }}></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* NFT History */}
          <div className="tech-panel mt-4">
            <h3 className="text-secondary font-bold mb-3">История NFT</h3>
            <p className="text-sm text-gray-400">
              NFT создан 01.07.2023. Последнее улучшение: 15.07.2023
            </p>
            
            <div className="mt-3 space-y-2">
              <div className="text-xs border border-gray-700 rounded p-2 flex items-center">
                <div className="w-2 h-2 rounded-full bg-primary mr-2"></div>
                <div className="text-gray-400 mr-auto">Создание</div>
                <div>01.07.2023</div>
              </div>
              
              <div className="text-xs border border-gray-700 rounded p-2 flex items-center">
                <div className="w-2 h-2 rounded-full bg-primary mr-2"></div>
                <div className="text-gray-400 mr-auto">Улучшение до уровня 2</div>
                <div>05.07.2023</div>
              </div>
              
              <div className="text-xs border border-gray-700 rounded p-2 flex items-center">
                <div className="w-2 h-2 rounded-full bg-primary mr-2"></div>
                <div className="text-gray-400 mr-auto">Улучшение до уровня 3</div>
                <div>15.07.2023</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NFTPage; 