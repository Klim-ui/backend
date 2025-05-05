import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Icons (simple SVG paths to represent each section)
const icons = {
  profile: 'M12 2a5 5 0 110 10 5 5 0 010-10zm0 12c4.42 0 8 1.79 8 4v2H4v-2c0-2.21 3.58-4 8-4z',
  missions: 'M3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2zm12 4c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3zm-9 8c0-2 4-3.1 6-3.1s6 1.1 6 3.1v1H6v-1z',
  community: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
  nft: 'M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4.86 8.86l-3 3.87L9 13.14 6 17h12l-3.86-5.14z',
  shop: 'M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z',
};

interface NavItemProps {
  to: string;
  label: string;
  icon: string;
}

const NavItem: React.FC<NavItemProps> = ({ to, label, icon }) => {
  return (
    <NavLink 
      to={to}
      className={({ isActive }) => 
        `flex flex-col items-center justify-center text-xs p-1 ${
          isActive ? 'text-primary' : 'text-gray-400'
        }`
      }
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        fill="currentColor" 
        className="w-6 h-6 mb-1"
      >
        <path d={icon} />
      </svg>
      <span>{label}</span>
    </NavLink>
  );
};

const NavigationBar: React.FC = () => {
  const { t } = useTranslation();

  return (
    <nav className="fixed bottom-0 left-0 w-full border-t border-primary/30 bg-surface/90 backdrop-blur-sm z-50">
      <div className="grid grid-cols-5 h-16">
        <NavItem to="/profile" label={t('nav.profile')} icon={icons.profile} />
        <NavItem to="/missions" label={t('nav.missions')} icon={icons.missions} />
        <NavItem to="/community" label={t('nav.community')} icon={icons.community} />
        <NavItem to="/nft" label={t('nav.nft')} icon={icons.nft} />
        <NavItem to="/shop" label={t('nav.shop')} icon={icons.shop} />
      </div>
    </nav>
  );
};

export default NavigationBar; 