const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const alertRoutes = require('./routes/alerts');
const employeeRoutes = require('./routes/employees');
const collusionRoutes = require('./routes/collusion');
const chatRoutes = require('./routes/chat');
const complianceRoutes = require('./routes/compliance');
const pipelineRoutes = require('./routes/pipeline');
const { startAlertEmitter } = require('./services/socketService');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: 'http://localhost:5173', methods: ['GET', 'POST', 'PATCH'] }
});

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/collusion', collusionRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/pipeline', pipelineRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// Socket.io
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

startAlertEmitter(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`SurakshaAI Server running on http://localhost:${PORT}`);
});
