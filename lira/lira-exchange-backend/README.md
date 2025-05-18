# TRY-RUB Exchange Platform

A currency exchange platform for Turkish Lira (TRY) to Russian Rubles (RUB) using TON (Telegram Open Network) cryptocurrency as a bridge.

## Features

- User registration and authentication with JWT
- KYC verification process
- Bank account management for TRY and RUB
- TON wallet integration via Telegram
- Currency exchange rate management with markup
- Transaction history and reporting
- Admin dashboard for monitoring and approving transactions
- Secure wallet management

## Technical Stack

- **Backend**: Node.js, Express
- **Database**: MongoDB
- **Authentication**: JWT
- **Cryptocurrency**: TON (Telegram Open Network)
- **Frontend**: React (not included in this repo)

## Project Structure

```
lira-rub-exchange/
├── models/              # Database models
│   ├── User.js          # User model with KYC and bank accounts
│   ├── Wallet.js        # Crypto wallet model
│   ├── Exchange.js      # Exchange transaction model
│   └── Rate.js          # Currency rate model
├── routes/              # API routes
│   ├── users.js         # User management routes
│   ├── exchange.js      # Exchange operations routes
│   └── wallets.js       # Wallet management routes
├── middleware/          # Express middleware
│   └── auth.js          # Authentication middleware
├── logs/                # Application logs
├── .env.example         # Environment variables example
├── package.json         # Project dependencies
└── server.js            # Main application file
```

## Setup Instructions

1. **Clone the repository**
   ```
   git clone https://github.com/yourusername/lira-rub-exchange.git
   cd lira-rub-exchange
   ```

2. **Install dependencies**
   ```
   npm install
   ```

3. **Configure environment variables**
   ```
   cp .env.example .env
   ```
   Edit the `.env` file with your specific configuration

4. **Set up MongoDB**
   - Install MongoDB
   - Start MongoDB service
   - The application will connect to the database specified in your `.env` file

5. **Run the application**
   ```
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/users/register` - Register a new user
- `POST /api/users/login` - Login and get JWT token

### User Management
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/bank-account` - Add a bank account
- `DELETE /api/users/bank-account/:id` - Delete a bank account
- `POST /api/users/kyc` - Submit KYC documents
- `PUT /api/users/verify-kyc/:id` - Verify user KYC (admin only)
- `GET /api/users` - Get all users (admin only)

### Wallet Management
- `GET /api/wallets` - Get all user wallets
- `POST /api/wallets` - Create new wallet
- `GET /api/wallets/:id` - Get wallet by ID
- `POST /api/wallets/transfer` - Transfer funds from wallet
- `PUT /api/wallets/:id/deactivate` - Deactivate wallet
- `GET /api/wallets/admin/all` - Get all wallets (admin only)

### Exchange Operations
- `GET /api/exchange/rates` - Get current exchange rates
- `POST /api/exchange/calculate` - Calculate potential exchange
- `POST /api/exchange/start` - Start a new exchange
- `PUT /api/exchange/confirm-source/:id` - Confirm source funds received (admin only)
- `PUT /api/exchange/complete/:id` - Complete exchange (admin only)
- `GET /api/exchange/my-exchanges` - Get user exchanges
- `GET /api/exchange` - Get all exchanges (admin only)

## Necessary Bank Accounts and Cards

### For TRY Operations (Turkey)
1. **Turkish Bank Account** - For receiving TRY from customers
   - Options: Ziraat Bankası, İş Bankası, Garanti BBVA
   - Required for direct bank transfers

2. **Electronic Wallets** - Alternative to bank accounts
   - Options: Papara, Payfix, INinal
   - Good for P2P operations

### For RUB Operations (Russia)
1. **Russian Bank Account** - For sending RUB to customers
   - Options: Tinkoff, Sberbank, Alfa-Bank
   - Required for direct bank transfers

2. **Electronic Wallets** - Alternative for smaller transactions
   - Options: YooMoney, QIWI, WebMoney

### For Cryptocurrency Operations
1. **TON Wallet** - For TON cryptocurrency operations
   - Telegram Wallet (integrated with Telegram)
   - Tonkeeper or other external TON wallets

2. **Exchange Accounts** - For converting between cryptocurrencies and fiat
   - Binance - For TRY to TON/USDT
   - Bybit/Garantex - For TON/USDT to RUB

## Security Considerations

- All private keys and mnemonics should be encrypted in production
- Use cold storage for large cryptocurrency holdings
- Implement proper KYC/AML procedures to comply with regulations
- Regularly backup database and wallet information
- Use hardware security modules (HSMs) for production deployment

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This application is provided for educational purposes only. Using this for currency exchange operations may be subject to legal and regulatory requirements in your jurisdiction. Always consult with legal and financial experts before deploying such a system in production. 