import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useGameState, Resources } from '../contexts/GameStateContext';
import Loader from '../components/UI/Loader';

// Product categories
type ProductCategory = 'boosts' | 'resources' | 'customization';

// Product interface
interface Product {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  price: number; // TON Credits
  benefits: Partial<Resources> | { [key: string]: any };
  image?: string;
  discount?: number;
}

// Mock shop products
const MOCK_PRODUCTS: Product[] = [
  {
    id: 'energy_boost_small',
    name: 'Малый заряд энергии',
    description: 'Восполняет 25 единиц энергии',
    category: 'boosts',
    price: 1,
    benefits: { energy: 25 },
    image: '⚡',
  },
  {
    id: 'energy_boost_medium',
    name: 'Средний заряд энергии',
    description: 'Восполняет 60 единиц энергии',
    category: 'boosts',
    price: 2,
    benefits: { energy: 60 },
    image: '⚡⚡',
  },
  {
    id: 'energy_boost_large',
    name: 'Большой заряд энергии',
    description: 'Восполняет 150 единиц энергии',
    category: 'boosts',
    price: 4,
    benefits: { energy: 150 },
    image: '⚡⚡⚡',
    discount: 20,
  },
  {
    id: 'data_pack_small',
    name: 'Малый набор данных',
    description: 'Добавляет 100 единиц данных',
    category: 'resources',
    price: 1,
    benefits: { data: 100 },
    image: '💾',
  },
  {
    id: 'data_pack_medium',
    name: 'Средний набор данных',
    description: 'Добавляет 250 единиц данных',
    category: 'resources',
    price: 2,
    benefits: { data: 250 },
    image: '💾💾',
  },
  {
    id: 'data_pack_large',
    name: 'Большой набор данных',
    description: 'Добавляет 650 единиц данных',
    category: 'resources',
    price: 5,
    benefits: { data: 650 },
    image: '💾💾💾',
    discount: 15,
  },
  {
    id: 'influence_pack_small',
    name: 'Малый пакет влияния',
    description: 'Добавляет 20 единиц влияния',
    category: 'resources',
    price: 2,
    benefits: { influence: 20 },
    image: '📊',
  },
  {
    id: 'influence_pack_medium',
    name: 'Средний пакет влияния',
    description: 'Добавляет 50 единиц влияния',
    category: 'resources',
    price: 4,
    benefits: { influence: 50 },
    image: '📊📊',
  },
  {
    id: 'avatar_frame_neon',
    name: 'Неоновая рамка аватара',
    description: 'Уникальная неоновая рамка для вашего профиля',
    category: 'customization',
    price: 10,
    benefits: { avatarFrame: 'neon' },
    image: '🖼️',
  },
  {
    id: 'title_cyberlord',
    name: 'Титул "Кибер-лорд"',
    description: 'Эксклюзивный титул для вашего профиля',
    category: 'customization',
    price: 15,
    benefits: { title: 'cyberlord' },
    image: '👑',
  },
];

const ShopPage: React.FC = () => {
  const { t } = useTranslation();
  const { isWalletConnected } = useAuth();
  const { playerState, isLoading, addResources, hasEnoughResources, spendResources } = useGameState();
  const [activeCategory, setActiveCategory] = useState<ProductCategory>('resources');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  if (isLoading) {
    return <Loader text={t('loading')} />;
  }
  
  // Filter products by category
  const filteredProducts = MOCK_PRODUCTS.filter(
    product => product.category === activeCategory
  );
  
  // Calculate final price with discount
  const calculatePrice = (product: Product): number => {
    if (!product.discount) return product.price;
    
    const discountAmount = (product.price * product.discount) / 100;
    return product.price - discountAmount;
  };
  
  // Handle product purchase
  const handlePurchase = (product: Product) => {
    // Check if player has enough TON credits
    if (!hasEnoughResources({ credits: product.price })) {
      alert('Недостаточно TON-кредитов!');
      return;
    }
    
    // Process purchase
    if (spendResources({ credits: product.price })) {
      // Add resources if applicable
      if ('data' in product.benefits || 'energy' in product.benefits || 
          'influence' in product.benefits || 'loyalty' in product.benefits) {
        addResources(product.benefits as Partial<Resources>);
      }
      
      // Handle customization items (in a real app, this would update the player profile)
      if ('avatarFrame' in product.benefits || 'title' in product.benefits) {
        // Apply customization
        console.log('Applied customization:', product.benefits);
      }
      
      alert('Покупка успешно совершена!');
    }
  };
  
  return (
    <div>
      <h2 className="text-xl font-bold neon-text mb-4">
        {t('nav.shop')}
      </h2>
      
      {!isWalletConnected ? (
        // No wallet connected
        <div className="tech-panel text-center p-6">
          <p className="mb-4 text-gray-400">
            Для совершения покупок необходимо подключить кошелек TON.
          </p>
          <button className="cyber-btn">
            {t('auth.connectWallet')}
          </button>
        </div>
      ) : (
        <>
          {/* Credits balance */}
          <div className="tech-panel mb-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-400">Баланс:</div>
              <div className="text-xl font-bold font-mono text-primary">
                {playerState.resources.credits} TON
              </div>
            </div>
          </div>
          
          {/* Category tabs */}
          <div className="flex border-b border-primary/30 mb-4 overflow-x-auto">
            <button
              className={`py-2 px-4 font-medium whitespace-nowrap ${
                activeCategory === 'resources' 
                  ? 'text-primary border-b-2 border-primary' 
                  : 'text-gray-400'
              }`}
              onClick={() => setActiveCategory('resources')}
            >
              {t('shop.resources')}
            </button>
            <button
              className={`py-2 px-4 font-medium whitespace-nowrap ${
                activeCategory === 'boosts' 
                  ? 'text-primary border-b-2 border-primary' 
                  : 'text-gray-400'
              }`}
              onClick={() => setActiveCategory('boosts')}
            >
              {t('shop.boosts')}
            </button>
            <button
              className={`py-2 px-4 font-medium whitespace-nowrap ${
                activeCategory === 'customization' 
                  ? 'text-primary border-b-2 border-primary' 
                  : 'text-gray-400'
              }`}
              onClick={() => setActiveCategory('customization')}
            >
              {t('shop.customization')}
            </button>
          </div>
          
          {/* Product grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredProducts.map(product => (
              <div key={product.id} className="tech-panel hover:border-primary transition-colors">
                <div className="flex">
                  {/* Product icon */}
                  <div className="w-12 h-12 flex items-center justify-center bg-surface rounded-lg mr-3 text-xl">
                    {product.image || '🔮'}
                  </div>
                  
                  {/* Product info */}
                  <div className="flex-1">
                    <h3 className="font-medium">{product.name}</h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {product.description}
                    </p>
                  </div>
                </div>
                
                {/* Price and purchase button */}
                <div className="mt-3 pt-3 border-t border-primary/20 flex justify-between items-center">
                  <div>
                    {product.discount ? (
                      <div className="flex items-center">
                        <span className="text-gray-500 line-through text-xs mr-2">
                          {product.price} TON
                        </span>
                        <span className="text-primary font-bold">
                          {calculatePrice(product)} TON
                        </span>
                        <span className="text-accent text-xs ml-2">
                          -{product.discount}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-primary font-bold">
                        {product.price} TON
                      </span>
                    )}
                  </div>
                  
                  <button 
                    className="cyber-btn-secondary text-xs px-3 py-1"
                    onClick={() => handlePurchase(product)}
                    disabled={playerState.resources.credits < product.price}
                  >
                    {t('shop.buy')}
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {filteredProducts.length === 0 && (
            <div className="tech-panel text-center p-6 text-gray-400">
              Нет доступных товаров в данной категории.
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ShopPage; 