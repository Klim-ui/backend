import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translation resources
const resources = {
  ru: {
    translation: {
      // General
      appName: 'Кибер-Феодализм',
      loading: 'Загрузка...',
      
      // Resources
      resources: {
        data: 'Данные',
        influence: 'Влияние',
        loyalty: 'Лояльность',
        energy: 'Энергия',
        credits: 'TON-кредиты',
      },
      
      // Ranks
      ranks: {
        peasant: 'Цифровой Крестьянин',
        vassal: 'Вассал',
        lord: 'Лорд',
        magnate: 'Техно-Магнат',
      },
      
      // Navigation
      nav: {
        profile: 'Профиль',
        missions: 'Задания',
        community: 'Сообщество',
        nft: 'NFT',
        shop: 'Магазин',
      },
      
      // Auth
      auth: {
        login: 'Войти через Telegram',
        connectWallet: 'Подключить кошелек',
        disconnectWallet: 'Отключить кошелек',
      },
      
      // Missions
      missions: {
        daily: 'Ежедневные задания',
        collect: 'Собрать данные',
        spy: 'Пройти слежку',
        capture: 'Захватить канал',
        hack: 'Взломать алгоритм',
        reward: 'Награда',
        difficulty: 'Сложность',
        easy: 'Легко',
        medium: 'Средне',
        hard: 'Сложно',
        complete: 'Выполнить',
        completed: 'Выполнено',
      },
      
      // NFT
      nft: {
        mint: 'Создать NFT',
        upgrade: 'Улучшить NFT',
        connect: 'Подключить существующий NFT',
      },
      
      // Community
      community: {
        leaderboard: 'Рейтинг',
        clans: 'Цифровые княжества',
        chat: 'Чат',
        createClan: 'Создать княжество',
        joinClan: 'Вступить в княжество',
      },
      
      // Shop
      shop: {
        buy: 'Купить',
        boosts: 'Усиления',
        resources: 'Ресурсы',
        customization: 'Кастомизация',
      },
    },
  },
  en: {
    translation: {
      // General
      appName: 'Cyber-Feudalism',
      loading: 'Loading...',
      
      // Resources
      resources: {
        data: 'Data',
        influence: 'Influence',
        loyalty: 'Loyalty',
        energy: 'Energy',
        credits: 'TON-credits',
      },
      
      // Ranks
      ranks: {
        peasant: 'Digital Peasant',
        vassal: 'Vassal',
        lord: 'Lord',
        magnate: 'Techno-Magnate',
      },
      
      // Navigation
      nav: {
        profile: 'Profile',
        missions: 'Missions',
        community: 'Community',
        nft: 'NFT',
        shop: 'Shop',
      },
      
      // Auth
      auth: {
        login: 'Login with Telegram',
        connectWallet: 'Connect Wallet',
        disconnectWallet: 'Disconnect Wallet',
      },
      
      // Missions
      missions: {
        daily: 'Daily Missions',
        collect: 'Collect Data',
        spy: 'Conduct Surveillance',
        capture: 'Capture Channel',
        hack: 'Hack Algorithm',
        reward: 'Reward',
        difficulty: 'Difficulty',
        easy: 'Easy',
        medium: 'Medium',
        hard: 'Hard',
        complete: 'Complete',
        completed: 'Completed',
      },
      
      // NFT
      nft: {
        mint: 'Mint NFT',
        upgrade: 'Upgrade NFT',
        connect: 'Connect Existing NFT',
      },
      
      // Community
      community: {
        leaderboard: 'Leaderboard',
        clans: 'Digital Fiefdoms',
        chat: 'Chat',
        createClan: 'Create Fiefdom',
        joinClan: 'Join Fiefdom',
      },
      
      // Shop
      shop: {
        buy: 'Buy',
        boosts: 'Boosts',
        resources: 'Resources',
        customization: 'Customization',
      },
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ru', // Default language
    interpolation: {
      escapeValue: false, // React already escapes
    },
    fallbackLng: 'en',
  });

export default i18n; 