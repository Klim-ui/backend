import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

// Types
export enum PlayerRank {
  PEASANT = 'peasant',
  VASSAL = 'vassal',
  LORD = 'lord',
  MAGNATE = 'magnate',
}

export interface Resources {
  data: number;
  influence: number;
  energy: number;
  loyalty: number;
  credits: number;
}

export interface Mission {
  id: string;
  type: 'collect' | 'spy' | 'capture' | 'hack';
  difficulty: 'easy' | 'medium' | 'hard';
  rewards: Partial<Resources>;
  completed: boolean;
  cooldownEnds?: number;
}

export interface PlayerState {
  rank: PlayerRank;
  experience: number;
  level: number;
  resources: Resources;
  missions: Mission[];
  nextLevelXp: number;
  nftId?: string;
}

interface GameStateContextType {
  playerState: PlayerState;
  isLoading: boolean;
  lastUpdated: Date;
  refreshMissions: () => void;
  completeMission: (missionId: string) => Promise<boolean>;
  addResources: (resources: Partial<Resources>) => void;
  hasEnoughResources: (cost: Partial<Resources>) => boolean;
  spendResources: (cost: Partial<Resources>) => boolean;
  upgradeRank: () => boolean;
}

interface GameStateProviderProps {
  children: ReactNode;
}

// Create context
const GameStateContext = createContext<GameStateContextType | undefined>(undefined);

// Initial state
const initialState: PlayerState = {
  rank: PlayerRank.PEASANT,
  experience: 0,
  level: 1,
  resources: {
    data: 100,
    influence: 10,
    energy: 50,
    loyalty: 5,
    credits: 0,
  },
  missions: [],
  nextLevelXp: 100,
};

// Helper to calculate XP needed for next level
const calculateNextLevelXp = (level: number): number => {
  return Math.floor(100 * Math.pow(1.5, level - 1));
};

// Provider component
export const GameStateProvider: React.FC<GameStateProviderProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [playerState, setPlayerState] = useState<PlayerState>(initialState);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Load player data on auth change
  useEffect(() => {
    const fetchPlayerData = async () => {
      if (!isAuthenticated || !user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        // In a real app, this would be an API call
        // For now, we'll use mock data with local storage persistence
        const savedState = localStorage.getItem(`player_${user.id}`);
        
        if (savedState) {
          const parsedState = JSON.parse(savedState) as PlayerState;
          setPlayerState(parsedState);
        } else {
          // Generate three random missions for new players
          const newMissions = generateRandomMissions(3);
          setPlayerState({
            ...initialState,
            missions: newMissions,
          });
        }
      } catch (error) {
        console.error('Failed to load player data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlayerData();
  }, [isAuthenticated, user]);

  // Save player state to localStorage when it changes
  useEffect(() => {
    if (isAuthenticated && user && !isLoading) {
      localStorage.setItem(`player_${user.id}`, JSON.stringify(playerState));
    }
  }, [playerState, isAuthenticated, user, isLoading]);

  // Generate random missions
  const generateRandomMissions = (count: number): Mission[] => {
    const missionTypes: Mission['type'][] = ['collect', 'spy', 'capture', 'hack'];
    const difficultyLevels: Mission['difficulty'][] = ['easy', 'medium', 'hard'];
    
    return Array.from({ length: count }, (_, i) => {
      const type = missionTypes[Math.floor(Math.random() * missionTypes.length)];
      const difficulty = difficultyLevels[Math.floor(Math.random() * difficultyLevels.length)];
      
      // Scale rewards based on difficulty
      const difficultyMultiplier = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3;
      
      return {
        id: `mission_${Date.now()}_${i}`,
        type,
        difficulty,
        rewards: {
          data: 20 * difficultyMultiplier,
          influence: 5 * difficultyMultiplier,
          energy: 0, // Energy is consumed, not rewarded
          loyalty: 2 * difficultyMultiplier,
          credits: difficulty === 'hard' ? 1 : 0, // Only hard missions reward TON credits
        },
        completed: false,
      };
    });
  };

  // Refresh available missions
  const refreshMissions = () => {
    setPlayerState(prev => ({
      ...prev,
      missions: generateRandomMissions(3),
    }));
    setLastUpdated(new Date());
  };

  // Complete a mission
  const completeMission = async (missionId: string): Promise<boolean> => {
    const mission = playerState.missions.find(m => m.id === missionId);
    
    if (!mission || mission.completed) {
      return false;
    }
    
    // Check if player has enough energy (each mission costs 10 energy)
    if (playerState.resources.energy < 10) {
      return false;
    }
    
    // Update player state
    setPlayerState(prev => {
      // Calculate new resources
      const newResources = { ...prev.resources };
      
      // Deduct energy cost
      newResources.energy -= 10;
      
      // Add rewards
      Object.entries(mission.rewards).forEach(([key, value]) => {
        if (value && key in newResources) {
          newResources[key as keyof Resources] += value;
        }
      });
      
      // Add experience (based on difficulty)
      const experienceGain = mission.difficulty === 'easy' ? 10 : 
                            mission.difficulty === 'medium' ? 25 : 50;
      const newExperience = prev.experience + experienceGain;
      
      // Check if level up
      let newLevel = prev.level;
      let nextXp = prev.nextLevelXp;
      
      if (newExperience >= prev.nextLevelXp) {
        newLevel += 1;
        nextXp = calculateNextLevelXp(newLevel);
      }
      
      // Check if rank up (every 5 levels)
      let newRank = prev.rank;
      if (newLevel >= 5 && prev.rank === PlayerRank.PEASANT) {
        newRank = PlayerRank.VASSAL;
      } else if (newLevel >= 10 && prev.rank === PlayerRank.VASSAL) {
        newRank = PlayerRank.LORD;
      } else if (newLevel >= 15 && prev.rank === PlayerRank.LORD) {
        newRank = PlayerRank.MAGNATE;
      }
      
      // Mark mission as completed
      const newMissions = prev.missions.map(m => 
        m.id === missionId 
          ? { ...m, completed: true, cooldownEnds: Date.now() + 3600000 } // 1 hour cooldown
          : m
      );
      
      return {
        ...prev,
        resources: newResources,
        experience: newExperience,
        level: newLevel,
        nextLevelXp: nextXp,
        rank: newRank,
        missions: newMissions
      };
    });
    
    setLastUpdated(new Date());
    return true;
  };

  // Add resources to player (from rewards, shop, etc)
  const addResources = (resources: Partial<Resources>) => {
    setPlayerState(prev => {
      const newResources = { ...prev.resources };
      
      Object.entries(resources).forEach(([key, value]) => {
        if (value && key in newResources) {
          newResources[key as keyof Resources] += value;
        }
      });
      
      return {
        ...prev,
        resources: newResources
      };
    });
    
    setLastUpdated(new Date());
  };

  // Check if player has enough resources for a purchase/action
  const hasEnoughResources = (cost: Partial<Resources>): boolean => {
    return Object.entries(cost).every(([key, value]) => 
      playerState.resources[key as keyof Resources] >= (value || 0)
    );
  };

  // Spend resources (for purchases, actions, etc)
  const spendResources = (cost: Partial<Resources>): boolean => {
    if (!hasEnoughResources(cost)) {
      return false;
    }
    
    setPlayerState(prev => {
      const newResources = { ...prev.resources };
      
      Object.entries(cost).forEach(([key, value]) => {
        if (value && key in newResources) {
          newResources[key as keyof Resources] -= value;
        }
      });
      
      return {
        ...prev,
        resources: newResources
      };
    });
    
    setLastUpdated(new Date());
    return true;
  };

  // Manually upgrade rank (if player has enough resources)
  const upgradeRank = (): boolean => {
    const currentRank = playerState.rank;
    let nextRank: PlayerRank;
    let cost: Partial<Resources>;
    
    switch (currentRank) {
      case PlayerRank.PEASANT:
        nextRank = PlayerRank.VASSAL;
        cost = { data: 1000, influence: 200, loyalty: 50 };
        break;
      case PlayerRank.VASSAL:
        nextRank = PlayerRank.LORD;
        cost = { data: 5000, influence: 1000, loyalty: 200, credits: 5 };
        break;
      case PlayerRank.LORD:
        nextRank = PlayerRank.MAGNATE;
        cost = { data: 20000, influence: 5000, loyalty: 1000, credits: 20 };
        break;
      default:
        return false; // Already at max rank
    }
    
    if (!hasEnoughResources(cost)) {
      return false;
    }
    
    // Spend resources and upgrade rank
    spendResources(cost);
    
    setPlayerState(prev => ({
      ...prev,
      rank: nextRank
    }));
    
    return true;
  };

  const value = {
    playerState,
    isLoading,
    lastUpdated,
    refreshMissions,
    completeMission,
    addResources,
    hasEnoughResources,
    spendResources,
    upgradeRank
  };

  return <GameStateContext.Provider value={value}>{children}</GameStateContext.Provider>;
};

// Create a hook to use the game state context
export const useGameState = (): GameStateContextType => {
  const context = useContext(GameStateContext);
  if (context === undefined) {
    throw new Error('useGameState must be used within a GameStateProvider');
  }
  return context;
}; 