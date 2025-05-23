require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for Railway and other cloud providers
app.set('trust proxy', 1);

// Middleware
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://frontend-production-d182.up.railway.app',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// MongoDB connection
let db;
let users;
let transactions;

const connectDB = async () => {
  try {
    const client = new MongoClient(process.env.MONGODB_URI || process.env.MONGO_URL, {
      useUnifiedTopology: true,
    });
    
    await client.connect();
    db = client.db('lira_exchange');
    users = db.collection('users');
    transactions = db.collection('transactions');
    
    console.log('✅ MongoDB connected successfully');
    
    // Create indexes
    await users.createIndex({ email: 1 }, { unique: true });
    await transactions.createIndex({ userId: 1 });
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('🔄 Starting without database...');
  }
};

// JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret', (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'LIRA Exchange Backend API',
    status: 'running',
    database: db ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    database: db ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Authentication routes
app.post('/api/users/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required'
      });
    }

    if (!users) {
      return res.status(503).json({
        success: false,
        message: 'Database unavailable'
      });
    }

    // Check if user exists
    const existingUser = await users.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const newUser = {
      email,
      password: hashedPassword,
      name,
      role: 'user',
      balance: { TRY: 0, RUB: 0 },
      twoFactorEnabled: false,
      createdAt: new Date()
    };

    const result = await users.insertOne(newUser);
    
    // Generate JWT
    const token = jwt.sign(
      { userId: result.insertedId, email, role: 'user' },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: result.insertedId,
        email,
        name,
        role: 'user'
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});

app.post('/api/users/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 Login attempt:', { email, hasPassword: !!password });

    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    if (!users) {
      console.log('❌ Database unavailable');
      return res.status(503).json({
        success: false,
        message: 'Database unavailable'
      });
    }

    // Find user
    console.log('🔍 Looking for user:', email);
    const user = await users.findOne({ email });
    
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    console.log('✅ User found:', { id: user._id, email: user.email, hasPassword: !!user.password });

    // Check password
    console.log('🔑 Checking password...');
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log('🔑 Password check result:', isValidPassword);
    
    if (!isValidPassword) {
      console.log('❌ Invalid password for user:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT
    console.log('🎫 Generating JWT token...');
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    console.log('✅ Login successful for:', email);
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled
      }
    });

  } catch (error) {
    console.error('💥 Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

app.get('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    if (!users) {
      return res.status(503).json({
        success: false,
        message: 'Database unavailable'
      });
    }

    const user = await users.findOne(
      { _id: req.user.userId },
      { projection: { password: 0 } }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        balance: user.balance || { TRY: 0, RUB: 0 },
        twoFactorEnabled: user.twoFactorEnabled || false
      }
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
});

// Exchange rates
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

// Debug route - remove in production
app.get('/api/debug/users', async (req, res) => {
  try {
    if (!users) {
      return res.status(503).json({
        success: false,
        message: 'Database unavailable'
      });
    }

    const allUsers = await users.find({}, { 
      projection: { password: 0 } // Don't show passwords
    }).toArray();

    res.json({
      success: true,
      count: allUsers.length,
      users: allUsers
    });

  } catch (error) {
    console.error('Debug users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Start server
const startServer = async () => {
  await connectDB();
  
  app.listen(PORT, () => {
    console.log(`🚀 LIRA Exchange Backend running on port ${PORT}`);
    console.log(`📅 Started at: ${new Date().toISOString()}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`💾 Database: ${db ? 'Connected' : 'Disconnected'}`);
  });
};

startServer(); 