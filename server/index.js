const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose'); // MongoDB se baat karne wala package
const sessionRoutes = require('./routes/sessionRoutes');
const contractRoutes = require('./routes/contractRoutes');
const planRoutes = require('./routes/planRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const authRoutes = require('./routes/authRoutes');
const sectionRoutes = require("./routes/sectionRoutes");
const socialRoutes = require('./routes/socialRoutes');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

dotenv.config();

const app = express();

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    const err = new Error(`Missing required environment variable: ${name}`);
    err.statusCode = 500;
    throw err;
  }
  return v;
}

function getMongoUri() {
  return process.env.MONGO_URI || process.env.MONGODB_URI || '';
}

//middlewares
app.use(
  cors({
    origin: '*',
  })
); // frontend ko allow karo
app.use(express.json()); // incoming data ko JS object mein badlo

// Lightweight request logging for production debugging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const status = res.statusCode;
    if (status >= 500) {
      console.error(`[${status}] ${req.method} ${req.originalUrl} - ${ms}ms`);
    } else if (process.env.NODE_ENV !== 'production') {
      console.log(`[${status}] ${req.method} ${req.originalUrl} - ${ms}ms`);
    }
  });
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/plan', planRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use("/api/sections", sectionRoutes);
app.use('/api', socialRoutes);

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    env: process.env.NODE_ENV || 'development',
    dbState: mongoose.connection.readyState, // 1 = connected
  });
});

app.get('/', (req, res) => {
  res.send('Hello World');
});

// 404 + error handler
app.use(notFound);
app.use(errorHandler);

async function start() {
  // ENV validation (fail fast on Render)
  const mongoUri = getMongoUri();
  if (!mongoUri) requireEnv('MONGO_URI'); // throws with clear message
  requireEnv('JWT_SECRET');

  if (!process.env.GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY is not set – roadmap generation will use fallback.');
  }

  // DB connect before server listens
  try {
    await mongoose.connect(mongoUri);
    console.log('Database connected');
  } catch (err) {
    console.error('DB ERROR:', err?.message || err);
    throw err;
  }

  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}


process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
