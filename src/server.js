import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";

import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chat.js";
import { initSocket } from "./socket.js";
import profileRoutes from "./routes/profile.js";

const app = express();
const server = http.createServer(app);

// ✅ Allowed Origins
const allowedOrigins = [
  "http://localhost:5173",
    "http://localhost:5174",

  "https://baatcheet-frontend-v9mk.vercel.app",
  "https://baatcheet-beryl.vercel.app",
  "https://rabta-app.netlify.app",
  "https://baat-cheet-chat-app.vercel.app",
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// ✅ Database connect
connectDB();

// ✅ Static uploads
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/profile", profileRoutes);

// ✅ Socket
const io = initSocket(server, allowedOrigins);

// ✅ Port setup (env → fallback 5000)
const PORT = process.env.PORT || 5000;

// ✅ Error-safe listen
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Handle "EADDRINUSE" gracefully
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} already in use. Try another port.`);
    process.exit(1);
  } else {
    console.error("❌ Server error:", err);
  }
});
