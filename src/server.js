import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import express from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';

import { connectDB } from "./config/db.js";
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import { initSocket } from './socket.js';
import profileRoutes from './routes/profile.js';


const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  "http://localhost:5173",
  "https://baatcheet-frontend-v9mk.vercel.app",
  "https://baatcheet-beryl.vercel.app"
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));


app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
connectDB();

// static uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/profile', profileRoutes);   // 👈 yeh line add karo


const io = initSocket(server, allowedOrigins);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log('Server listening on', PORT));
