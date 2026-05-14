import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// const prisma = new PrismaClient();
const mockUsers: any[] = []; // Mock DB

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Basic matchmaking state
const lobby: any[] = [];
const activeGames: any[] = [];

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinLobby', async (data) => {
    const { walletAddress } = data;
    console.log('User joined lobby:', walletAddress);
    
    // Create or update user in Mock DB
    try {
      let user = mockUsers.find(u => u.walletAddress === walletAddress);
      if (!user) {
        user = { id: Math.random().toString(), walletAddress, wins: 0 };
        mockUsers.push(user);
      }

      const existing = lobby.find(u => u.walletAddress === walletAddress);
      if (!existing) {
        lobby.push({ socketId: socket.id, walletAddress, userId: user.id });
      }

      io.emit('lobbyUpdate', { lobby, activeGames });
    } catch (error) {
      console.error('Error joining lobby:', error);
    }
  });

  socket.on('gameCreated', (gameData) => {
    // gameData: { gameId, creator, side, amount }
    activeGames.push(gameData);
    io.emit('lobbyUpdate', { lobby, activeGames });
  });

  socket.on('gameJoined', (data) => {
    const { gameId, participant } = data;
    const gameIndex = activeGames.findIndex(g => g.gameId === gameId);
    if (gameIndex !== -1) {
      activeGames[gameIndex].status = 'matched';
      activeGames[gameIndex].participant = participant;
      io.emit('gameMatched', activeGames[gameIndex]);
      
      // Remove from active games list after some time or when settled
      setTimeout(() => {
        activeGames.splice(gameIndex, 1);
        io.emit('lobbyUpdate', { lobby, activeGames });
      }, 5000);
    }
  });

  socket.on('disconnect', () => {
    const index = lobby.findIndex(u => u.socketId === socket.id);
    if (index !== -1) {
      lobby.splice(index, 1);
      io.emit('lobbyUpdate', { lobby, activeGames });
    }
  });
});

app.get('/health', (req, res) => {
  res.send('FlipRush Backend is running');
});

// Stats API
app.get('/leaderboard', (req, res) => {
  const topUsers = [...mockUsers].sort((a, b) => b.wins - a.wins).slice(0, 10);
  res.json(topUsers);
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
