import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { OpenAI } from 'openai';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

import Influencer from './models/influencer';
import { connectToMongo } from './connections/db';
import socketHandler from './socket';

// Import routes
import authRoute from './routes/auth';
import conversationRoute from './routes/conversation';
import messagesRoute from './routes/messages';
import userRoute from './routes/user';
import campaignRoute from './routes/campaign';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;

// Middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors({
  origin: ["https://phyo.ai", "http://localhost:3000", "http://localhost:4000"],
  credentials: true
}));

// Database connection
const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  throw new Error('MONGO_URI environment variable is required');
}

connectToMongo(mongoUri)
  .then(() => console.log("MongoDB Connected"))
  .catch((error) => console.error("MongoDB connection error:", error));

// OpenAI setup
const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

const openai = new OpenAI({
  apiKey: openaiApiKey
});

// Socket.IO setup
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: ["https://phyo.ai", "http://localhost:3000", "http://localhost:4000"],
    credentials: true
  }
});

socketHandler(io);

// Routes
app.get("/", (req, res) => {
  res.send("Home page of phyo");
});

app.use("/api/user", authRoute);
app.use("/api/conversation", conversationRoute);
app.use("/api/messages", messagesRoute);
app.use("/api/users", userRoute);
app.use("/api/campaigns", campaignRoute);

// Start server
server.listen(PORT, () => {
  console.log("Server is running on port:", PORT);
}); 