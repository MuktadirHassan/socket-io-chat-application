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
    logger.trace(`User ${session.userId} joined thread ${threadId}`);
  });

  // Leave the threadId
  socket.on(REALTIME_EVENTS.leave, (threadId: string) => {
    socket.leave(threadId);
    logger.trace(`User ${session.userId} left thread ${threadId}`);
  });

  // Send a message to threadId
  socket.on(
    REALTIME_EVENTS.message,
    async (message: {
      content: string;
      timestamp: string;
      threadId: string;
    }) => {
      console.log(message, "Recieved message");

      // save message to database
      const data = await createMessage({
        content: message.content,
        timestamp: message.timestamp,
        threadId: Number(message.threadId),
        userId: Number(session.userId),
      });

      console.log(data, "Broadcasting message");

      io.to(message.threadId).emit(REALTIME_EVENTS.message, {
        ...data,
        type: "text",
      });
    }
  );
});

io.on("error", (err) => {
  logger.error(err, "Socket error");
});

export default httpServer;
