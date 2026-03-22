const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const publicRoutes = require("./routes/public");
const { ALLOWED_ORIGINS, NODE_ENV } = require("../config");

const app = express();

app.set("trust proxy", 1);
app.set("json spaces", 2);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      // In development, allow all origins (covers dynamic Replit dev domains)
      if (NODE_ENV !== "production") return callback(null, true);
      // In production, restrict to the configured allowed origins
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, "../public")));

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", publicRoutes);

module.exports = app;
