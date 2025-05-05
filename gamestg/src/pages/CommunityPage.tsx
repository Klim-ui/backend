import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useGameState, PlayerRank } from '../contexts/GameStateContext';
import Loader from '../components/UI/Loader';

// Mock data for leaderboard
const MOCK_LEADERBOARD = [
  { id: 1, name: 'TechnoLord', rank: PlayerRank.MAGNATE, level: 20, points: 15000 },
  { id: 2, name: 'CyberKnight', rank: PlayerRank.LORD, level: 18, points: 12500 },
  { id: 3, name: 'DataHunter', rank: PlayerRank.LORD, level: 15, points: 10800 },
  { id: 4, name: 'NeonSamurai', rank: PlayerRank.VASSAL, level: 12, points: 8200 },
  { id: 5, name: 'QuantumFarmer', rank: PlayerRank.VASSAL, level: 10, points: 6500 },
  { id: 6, name: 'DigitalSerf', rank: PlayerRank.PEASANT, level: 8, points: 4300 },
  { id: 7, name: 'VirtualVagrant', rank: PlayerRank.PEASANT, level: 5, points: 2100 },
  { id: 8, name: 'CryptoNewbie', rank: PlayerRank.PEASANT, level: 3, points: 1200 },
];

// Mock data for clans
const MOCK_CLANS = [
  { id: 1, name: 'Цифровая Империя', members: 42, rank: 1, leader: 'TechnoLord' },
  { id: 2, name: 'Криптократы', members: 38, rank: 2, leader: 'DataOverlord' },
  { id: 3, name: 'Нейронная Гильдия', members: 27, rank: 3, leader: 'SynapseKing' },
  { id: 4, name: 'Квантовое Братство', members: 23, rank: 4, leader: 'WaveParticle' },
  { id: 5, name: 'Технофеодалы', members: 18, rank: 5, leader: 'BitLord' },
];

const CommunityPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { playerState, isLoading } = useGameState();
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'clans'>('leaderboard');
  
  if (isLoading) {
    return <Loader text={t('loading')} />;
  }
  
  // Get rank color based on player rank
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
  
  // Find user in leaderboard (mock data)
  const userRank = MOCK_LEADERBOARD.findIndex(player => player.id === user?.id) + 1 || '?';
  
  return (
    <div>
      <h2 className="text-xl font-bold neon-text mb-4">
        {t('nav.community')}
      </h2>
      
      {/* Tabs */}
      <div className="flex border-b border-primary/30 mb-4">
        <button
          className={`py-2 px-4 font-medium ${
            activeTab === 'leaderboard' 
              ? 'text-primary border-b-2 border-primary' 
              : 'text-gray-400'
          }`}
          onClick={() => setActiveTab('leaderboard')}
        >
          {t('community.leaderboard')}
        </button>
        <button
          className={`py-2 px-4 font-medium ${
            activeTab === 'clans' 
              ? 'text-primary border-b-2 border-primary' 
              : 'text-gray-400'
          }`}
          onClick={() => setActiveTab('clans')}
        >
          {t('community.clans')}
        </button>
      </div>
      
      {/* Leaderboard tab */}
      {activeTab === 'leaderboard' && (
        <div>
          {/* User's position highlight */}
          <div className="tech-panel mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary flex items-center justify-center text-primary font-bold mr-3">
                  {userRank}
                </div>
                <div>
                  <div className="font-medium">
                    {user?.first_name} {user?.last_name}
                  </div>
                  <div className="text-xs text-gray-400">
                    {t(`ranks.${playerState.rank}`)} · Уровень {playerState.level}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-primary font-bold">
                  {playerState.experience} XP
                </div>
              </div>
            </div>
          </div>
          
          {/* Leaderboard table */}
          <div className="tech-panel">
            <div className="text-sm text-gray-400 mb-2">Топ игроков</div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-primary/20">
                    <th className="py-2 pl-2 pr-4 w-10">#</th>
                    <th className="py-2 px-4">Имя</th>
                    <th className="py-2 px-4">Ранг</th>
                    <th className="py-2 px-4">Уровень</th>
                    <th className="py-2 px-4 text-right">Очки</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_LEADERBOARD.map((player, index) => (
                    <tr 
                      key={player.id} 
                      className={`border-b border-gray-800 ${
                        player.id === user?.id ? 'bg-primary/10' : ''
                      }`}
                    >
                      <td className="py-3 pl-2 pr-4 font-mono text-sm">
                        {index === 0 ? (
                          <span className="text-accent">👑</span>
                        ) : index === 1 ? (
                          <span className="text-primary">🥈</span>
                        ) : index === 2 ? (
                          <span className="text-secondary">🥉</span>
                        ) : (
                          index + 1
                        )}
                      </td>
                      <td className="py-3 px-4">{player.name}</td>
                      <td className={`py-3 px-4 ${getRankColor(player.rank)}`}>
                        {t(`ranks.${player.rank}`)}
                      </td>
                      <td className="py-3 px-4">{player.level}</td>
                      <td className="py-3 px-4 text-right font-mono font-medium">
                        {player.points.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      {/* Clans tab */}
      {activeTab === 'clans' && (
        <div>
          {/* Clan finder/creator */}
          <div className="tech-panel mb-4">
            <div className="text-center p-4">
              <p className="mb-4 text-gray-400">
                Вы не состоите в цифровом княжестве.
                Присоединитесь к существующему или создайте своё.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button className="cyber-btn">
                  {t('community.joinClan')}
                </button>
                <button className="cyber-btn-secondary">
                  {t('community.createClan')}
                </button>
              </div>
            </div>
          </div>
          
          {/* Clans list */}
          <div className="tech-panel">
            <div className="text-sm text-gray-400 mb-2">Топ цифровых княжеств</div>
            <div className="space-y-3">
              {MOCK_CLANS.map(clan => (
                <div 
                  key={clan.id}
                  className="border border-primary/30 rounded p-3 hover:border-primary transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center">
                        <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mr-2">
                          {clan.rank}
                        </div>
                        <h3 className="font-medium">{clan.name}</h3>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Лидер: {clan.leader}
                      </div>
                    </div>
                    <div className="text-sm text-right">
                      <div className="text-primary font-medium">{clan.members}</div>
                      <div className="text-xs text-gray-400">участников</div>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-800 flex justify-end">
                    <button className="text-xs text-primary hover:text-white px-2 py-1 transition-colors">
                      Подробнее
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityPage; 