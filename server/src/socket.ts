import { Server, Socket } from "socket.io";
import { logger } from "./config/logger";
import app, { createMessage, sessionMiddleware } from "./http";
const { createServer } = require("http");

/**
 * Websocket server
 * Purpose: real-time communication
 */
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
  cookie: true,
});

io.engine.use(sessionMiddleware);

interface User {
  id: string;
  username: string;
  threadId: string;
}

const onlineUsers: User[] = [];

const REALTIME_EVENTS = {
  join: "join",
  message: "message",
  leave: "leave",
} as const;

io.on("connection", (socket: Socket) => {
  logger.trace(`Socket connected: ${socket.id}`);

  // get info from cookie
  const session = socket.request.session;

  // Join a threadId
  socket.on(REALTIME_EVENTS.join, (threadId: string) => {
    socket.join(threadId);
    io.to(threadId).emit(REALTIME_EVENTS.message, "User joined the thread");
  });

  // Leave the threadId
  socket.on(REALTIME_EVENTS.leave, (threadId: string) => {
    socket.leave(threadId);
    io.to(session.threadId).emit(
      REALTIME_EVENTS.message,
      "User left the thread"
    );
  });

  // Send a message to threadId
  socket.on(
    REALTIME_EVENTS.message,
    (message: { content: string; timestamp: string; threadId: number }) => {
      // save message to database
      const data = createMessage({
        content: message.content,
        timestamp: message.timestamp,
        threadId: Number(message.threadId),
        userId: Number(session.userId),
      });
      io.to(session.threadId).emit(REALTIME_EVENTS.message, data);
    }
  );
});

io.on("error", (err) => {
  logger.error(err, "Socket error");
});

export default httpServer;
