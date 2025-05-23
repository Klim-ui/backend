require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for Railway and other cloud providers
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(limiter);
app.use(cors());
app.use(express.json());

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'LIRA Exchange Backend API',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// API routes
app.get('/api/health', (req, res) => {
  res.json({ 
    api: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Mock exchange rate (оба пути для совместимости)
app.get('/api/rates', (req, res) => {
  res.json({
    TRY_RUB: {
      rate: 3.42,
      timestamp: new Date().toISOString(),
      source: 'mock'
    }
  });
});

app.get('/api/exchange/rates', (req, res) => {
  res.json({
    TRY_RUB: {
      rate: 3.42,
      timestamp: new Date().toISOString(),
      source: 'mock'
    }
  });
});

// Mock user authentication routes
app.post('/api/users/login', (req, res) => {
  const { email, password } = req.body;
  
  // Mock успешный логин для тестирования
  if (email && password) {
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: 1,
        email: email,
        name: 'Test User',
        role: 'user'
      },
      token: 'mock-jwt-token-12345'
    });
  } else {
    res.status(400).json({
      success: false,
      message: 'Email and password are required'
    });
  }
});

app.post('/api/users/register', (req, res) => {
  const { email, password, name } = req.body;
  
  if (email && password && name) {
    res.json({
      success: true,
      message: 'Registration successful',
      user: {
        id: 2,
        email: email,
        name: name,
        role: 'user'
      }
    });
  } else {
    res.status(400).json({
      success: false,
      message: 'Email, password and name are required'
    });
  }
});

// Mock user profile
app.get('/api/users/profile', (req, res) => {
  res.json({
    success: true,
    user: {
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      balance: {
        TRY: 1000,
        RUB: 3420
      }
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 LIRA Exchange Backend running on port ${PORT}`);
  console.log(`📅 Started at: ${new Date().toISOString()}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
}); 