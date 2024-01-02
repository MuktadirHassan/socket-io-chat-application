import express from "express";
import session from "express-session";
import { handleGlobalError } from "./utils/Error";
import catchAsync from "./utils/catchAsync";
import db from "./config/db";
import bcrypt from "bcrypt";
import cors from "cors";
import sqlite from "better-sqlite3";
import { logger } from "./config/logger";

/**
 * HTTP server
 * Purpose: serve the API
 */
const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

const SqliteStore = require("better-sqlite3-session-store")(session);
const sessionDB = new sqlite("sessions.db");
export const sessionMiddleware = session({
  secret: "my-secret-key",
  resave: false,
  saveUninitialized: false,
  store: new SqliteStore({
    client: sessionDB,
    expired: {
      clear: true,
      intervalMs: 900000, //ms = 15min
    },
  }),
  name: "sid",
  cookie: {
    maxAge: 1000 * 60 * 60 * 2,
    secure: false,
  },
});

app.use(sessionMiddleware);

app.use((req, res, next) => {
  // log http request
  logger.debug(`${req.method} ${req.url}`);
  next();
});

declare module "express-session" {
  interface Session {
    userId: number;
  }
}

app.get(
  "/threads",
  catchAsync(async (req, res) => {
    const userId = req.session.userId;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const threads = await db.thread.findMany({
      where: {
        OR: [
          {
            creatorId: userId,
          },
          {
            ThreadMember: {
              some: {
                userId,
              },
            },
          },
        ],
      },
      select: {
        id: true,
        title: true,
        secret: false,
      },
    });

    res.status(200).json({ data: threads });
  })
);

app.post(
  "/threads",
  catchAsync(async (req, res) => {
    const userId = req.session.userId;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { title, secret } = req.body;

    const thread = await db.thread.create({
      data: {
        title,
        secret,
        creator: {
          connect: {
            id: userId,
          },
        },
      },
    });

    const JoinThread = await db.threadMember.create({
      data: {
        threadId: thread.id,
        userId,
      },
    });

    res.status(201).json({ data: thread });
  })
);

app.post(
  "/threads/:id/join",
  catchAsync(async (req, res) => {
    const userId = req.session.userId;
    const secret = req.body.secret;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { id } = req.params;

    const thread = await db.thread.findUnique({
      where: {
        id: Number(id),
      },
    });

    if (!thread) {
      res.status(404).json({ message: "Thread not found" });
      return;
    }

    if (thread.secret !== secret) {
      res.status(401).json({ message: "Invalid secret" });
      return;
    }

    const threadMember = await db.threadMember.findFirst({
      where: {
        threadId: Number(id),
        userId,
      },
    });

    if (threadMember) {
      res.status(409).json({ message: "Already joined" });
      return;
    }

    const JoinThread = await db.threadMember.create({
      data: {
        threadId: Number(id),
        userId,
      },
    });

    res.status(201).json({ data: JoinThread });
  })
);

app.get("/threads/:id/messages", async (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const { id } = req.params;

  const thread = await db.thread.findUnique({
    where: {
      id: Number(id),
    },
  });

  if (!thread) {
    res.status(404).json({ message: "Thread not found" });
    return;
  }

  const threadMember = await db.threadMember.findFirst({
    where: {
      threadId: Number(id),
      userId,
    },
  });

  if (!threadMember) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const messages = await db.message.findMany({
    where: {
      threadId: Number(id),
    },
    select: {
      id: true,
      content: true,
      timestamp: true,
      sender: {
        select: {
          id: true,
          username: true,
        },
      },
    },
    orderBy: {
      timestamp: "asc",
    },
  });

  res.status(200).json({ data: messages });
});

app.post(
  "/register",
  catchAsync(async (req, res) => {
    const { username, password } = req.body;
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = await db.user.create({
      data: {
        username,
        password: hashedPassword,
      },
    });

    res.status(201).json({ user, message: "User created" });
  })
);

app.post(
  "/login",
  catchAsync(async (req, res) => {
    const { username, password } = req.body;
    const user = await db.user.findUnique({
      where: {
        username,
      },
    });

    if (!user) {
      res.status(401).json({ message: "Invalid username or password" });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      res.status(401).json({ message: "Invalid username or password" });
      return;
    }

    req.session.userId = user.id;

    res.status(200).json({
      data: {
        username: user.username,
        id: user.id,
      },
      message: "Login successful",
    });
  })
);

app.use("*", (req, res) => {
  res.status(404).json({ message: "Invalid Endpoint" });
});

app.use(handleGlobalError);

export const createMessage = async ({
  content,
  timestamp,
  threadId,
  userId,
}: {
  content: string;
  timestamp: string;
  threadId: number;
  userId: number;
}) => {
  const message = await db.message.create({
    data: {
      content: content,
      timestamp: timestamp,
      threadId: threadId,
      senderId: userId,
    },
    select: {
      id: true,
      content: true,
      timestamp: true,
      sender: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });

  return message;
};

export default app;
