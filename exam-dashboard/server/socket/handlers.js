const activeRooms = new Map()

function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id)

    socket.on('join_run', (runId) => {
      socket.join(`run:${runId}`)
      console.log(`Socket ${socket.id} joined run:${runId}`)
    })

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id)
    })
  })
}

// Called by pipeline controller to broadcast agent events to all clients watching a run
function emitToRun(io, runId, event, data) {
  io.to(`run:${runId}`).emit(event, { runId, ...data })
}

module.exports = { registerSocketHandlers, emitToRun }
