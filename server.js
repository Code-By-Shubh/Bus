// ------------------------------
// server.js (ESM Version)
// ------------------------------

import express from "express";
import http from "http";
import { Server } from "socket.io";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from './database.js';
import dotenv from "dotenv";

dotenv.config();

// ------------------------------
// Setup Express + HTTP Server
// ------------------------------
const app = express();
const server = http.createServer(app);

// Socket.IO
const io = new Server(server, {
  cors: { origin: "*" }, // allow frontend & app to connect
});

// Middleware
// app.use(bodyParser.json());

// ------------------------------
// PostgreSQL Database Connection
// ------------------------------


// ------------------------------
// REST API Endpoints
// ------------------------------

// POST /location -> save driver location
// app.use(cookieParser());
// app.use(bodyParser.urlencoded({extended:true}));
app.use(express.json());//to parse json object
app.use(express.static('public'));

import { dirname } from "path";
import { fileURLToPath } from "url";
const __dirname=dirname(fileURLToPath(import.meta.url));

app.get('/', (req, res) => {
  res.sendFile(__dirname+"/public/map.html");
})
app.post("/location", async (req, res) => {
  try {
    const { userId, latitude, longitude } = req.body;

    if (!userId || !latitude || !longitude) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Insert into DB
    await db.query(
      "INSERT INTO locations (user_id, latitude, longitude, created_at) VALUES ($1, $2, $3, NOW())",
      [userId, latitude, longitude]
    );

    // Notify live dashboards
    io.emit("locationUpdate", { userId, latitude, longitude });

    res.json({ message: "Location saved successfully" });
  } catch (err) {
    console.error("Error saving location:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /locations/:userId -> fetch latest location of a bus
app.get("/locations/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await db.query(
      "SELECT latitude, longitude, created_at FROM locations WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No location found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching location:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ------------------------------
// Socket.IO for Live Tracking
// ------------------------------
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("sendLocation", async (data) => {
    const { userId, latitude, longitude } = data;
    if (!userId || !latitude || !longitude) return;

    try {
      // Save to DB
      // await db.query(
      //   "INSERT INTO locations (user_id, latitude, longitude, created_at) VALUES ($1, $2, $3, NOW())",
      //   [userId, latitude, longitude]
      // );

      // Broadcast to all dashboards
      io.emit("locationUpdate", { userId, latitude, longitude });
    } catch (err) {
      console.error("Socket DB error:", err);
    }
  });
  app.post("/nearest-stop", async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: "Missing location" });
    }

    const query = `
      SELECT id, name, latitude, longitude,
        (6371 * acos(
          cos(radians($1)) * cos(radians(latitude)) *
          cos(radians(longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(latitude))
        )) AS distance_km
      FROM bus_stops
      ORDER BY distance_km
      LIMIT 1;
    `;

    const result = await db.query(query, [latitude, longitude]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error finding nearest stop:", err);
    res.status(500).json({ error: "Server error" });
  }
});

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// ------------------------------
// Start Server
// ------------------------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚍 Bus tracking server running on port ${PORT}`);
});
