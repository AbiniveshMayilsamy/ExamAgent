const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const mongoose = require('mongoose')
const cors = require('cors')
const path = require('path')
require('dotenv').config()

const memoryStore = require('./models/memoryStore')
const { getDbReady, setDbReady } = require('./dbState')

const pipelineRoutes = require('./routes/pipeline')
const runRoutes = require('./routes/runs')
const settingsRoutes = require('./routes/settings')
const { registerSocketHandlers } = require('./socket/handlers')

const app = express()
const server = http.createServer(app)

// Robust CORS origin resolution for production & deployment
const parseAllowedOrigins = () => {
  const defaults = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:5173',
    'https://abiniveshmayilsamy.github.io'
  ]
  if (!process.env.CLIENT_URL || process.env.CLIENT_URL === '*') {
    return '*'
  }
  const configured = process.env.CLIENT_URL.split(',')
    .map(url => url.trim().replace(/\/$/, ''))
    .filter(Boolean)
  
  return Array.from(new Set([...configured, ...defaults]))
}

const origins = parseAllowedOrigins()

const corsOriginHandler = (origin, callback) => {
  if (!origin || origins === '*') return callback(null, true)
  const normalizedOrigin = origin.replace(/\/$/, '')
  if (origins.includes(normalizedOrigin)) {
    return callback(null, true)
  }
  console.warn(`[CORS Warning] Request origin "${origin}" not explicitly in CLIENT_URL list:`, origins)
  return callback(null, true)
}

const corsOptions = {
  origin: origins === '*' ? '*' : corsOriginHandler,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}

const io = new Server(server, {
  cors: corsOptions,
  transports: ['polling', 'websocket'],
  allowEIO3: true,
})

app.use(cors(corsOptions))
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Attach io to every request so controllers can emit
app.use((req, _res, next) => { req.io = io; next() })

app.use('/api/pipeline', pipelineRoutes)
app.use('/api/runs', runRoutes)
app.use('/api/settings', settingsRoutes)

registerSocketHandlers(io)

const PORT = process.env.PORT || 5000
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/examschedule'

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected')
    setDbReady(true)
    server.listen(PORT, '0.0.0.0', () =>
      console.log(`Server running on port ${PORT}`)
    )
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err)
    console.log('⚠️  Using in-memory storage (data will be lost on restart)')
    setDbReady(false)
    server.listen(PORT, '0.0.0.0', () =>
      console.log(`Server running on port ${PORT} (in-memory mode)`)
    )
  })

