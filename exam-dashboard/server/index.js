const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const mongoose = require('mongoose')
const cors = require('cors')
const path = require('path')
require('dotenv').config()

const pipelineRoutes = require('./routes/pipeline')
const runRoutes = require('./routes/runs')
const settingsRoutes = require('./routes/settings')
const { registerSocketHandlers } = require('./socket/handlers')

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: { origin: 'http://localhost:3000', methods: ['GET', 'POST'] },
})

app.use(cors({ origin: 'http://localhost:3000' }))
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Attach io to every request so controllers can emit
app.use((req, _res, next) => { req.io = io; next() })

app.use('/api/pipeline', pipelineRoutes)
app.use('/api/runs', runRoutes)
app.use('/api/settings', settingsRoutes)

registerSocketHandlers(io)

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected')
    server.listen(process.env.PORT, () =>
      console.log(`Server running on http://localhost:${process.env.PORT}`)
    )
  })
  .catch((err) => console.error('MongoDB error:', err))
