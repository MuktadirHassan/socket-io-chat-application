import express from "express";
import session from "express-session";
import { handleGlobalError } from "./utils/Error";
import catchAsync from "./utils/catchAsync";
import db from "./config/db";
import bcrypt from "bcrypt";

/**
 * HTTP server
 * Purpose: serve the API
 */
const app = express();

app.use(express.json());
app.use(
  session({
    secret: "my-secret-key",
    resave: false,
    saveUninitialized: false,
    store: new session.MemoryStore(),
    name: "sid",
    cookie: {
      maxAge: 1000 * 60 * 60 * 2,
      sameSite: true,
      secure: false,
    },
  })
);

declare module "express-session" {
  interface Session {
    userId: number;
  }
}

app.get("/health", (req, res) => {
  res.send("OK").status(200);
});

app.get(
  "/threads",
  catchAsync(async (req, res) => {})
);

app.post(
  "/threads",
  catchAsync(async (req, res) => {})
);

app.delete(
  "/threads/:id",
  catchAsync(async (req, res) => {})
);

app.post(
  "/register",
  catchAsync(async (req, res) => {
    const { username, password, email } = req.body;
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = await db.user.create({
      data: {
        username,
        password: hashedPassword,
        email,
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
    res.status(200).json({ data: user, message: "Login successful" });
  })
);

app.use(handleGlobalError);

export default app;
