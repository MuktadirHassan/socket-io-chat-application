import { Server, Socket } from "socket.io";
import { logger } from "./config/logger";
const { createServer } = require("http");

/**
 * Websocket server
 * Purpose: real-time communication
 */
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
  allowEIO3: true,
});

interface User {
  id: string;
  username: string;
  threadId: string;
}

const onlineUsers: User[] = [];

io.on("connection", (socket: Socket) => {
  logger.trace(`A user connected: ${socket.id}`);

  // Join a threadId
  socket.on("join", (username: string, threadId: string) => {
    logger.trace(`User ${username} joined ${threadId}`);
    socket.join(threadId);
    // io.to(threadId).emit("userJoined", user);
  });

  // Send chat message
  socket.on("chatMessage", (message: string) => {
    console.log(message);
  });

  // Leave the threadId
  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

io.on("error", (err) => {
  logger.error(err, "Socket error");
});

httpServer.listen(5001, () => {
  logger.info("Socket server running at 5001");
});
