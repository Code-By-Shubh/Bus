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
import cookieParser from "cookie-parser";
const saltRounds=10;

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

app.use(cookieParser());

app.get('/', (req, res) => {
  res.sendFile(__dirname+"/public/map.html");
})

app.get("/register",(req,res)=>{
  res.sendFile(__dirname+"/public/register.html");
})
app.get("/login",(req,res)=>{
  res.sendFile(__dirname+"/public/login.html");
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
    const { busNumber,routeId, latitude, longitude } = data;
    if (!busNumber||!routeId || !latitude || !longitude) return;

    try {
      // Save to DB
      await db.query(
        "INSERT INTO driver (busno,routeno,latitude, longitude) VALUES ($1, $2, $3, $4)",
        [busNumber,routeId, latitude, longitude]
      );

      // Broadcast to all dashboards
      io.emit("locationUpdate", {busNumber ,routeId , latitude, longitude });
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


app.post("/registered",async (req,res)=>{
  const {email,fullName,password,country}=req.body;
  try {
    const resultCheck=await db.query("SELECT * FROM users WHERE email=$1",[email,]);
    if(resultCheck.rows.length>0){
      res.json({error:"Email already exists. Try logging in."});
    }
    else{
      //hashing begins
      bcrypt.hash(password,saltRounds,async (err,hash)=>{
        if(err){
          console.log("error hashing password ",err);
          res.json({error:err})
        }
        else{
          await db.query("INSERT INTO users (name,email,password,country) VALUES ($1,$2,$3,$4)",
            [fullName,email,hash,country]);
          const result=await db.query("SELECT id FROM users WHERE email=$1",[email]);
          const {id}=result.rows[0];
          const token=jwt.sign({id,fullName,email},process.env.JWT_SECRET);
          res.cookie('token',token,{
            httpOnly:true,
            secure:true,
            sameSite:true,
            maxAge:60*60*1000
          })
          res.json({error:null})
        }
      });
    }
  } catch (error) {
    res.json({error:error});
  }
})



app.post("/loggined",async (req,res)=>{
  const {email,password}=req.body;
  try {
    const result=await db.query("SELECT * FROM users WHERE email=$1",[email]);
  if(result.rows.length>0){
    const user=result.rows[0];
    const storedPassword=user.password;
    const id=user.id;
    const fullName=user.name;
    
    bcrypt.compare(password,storedPassword,(err,result)=>{
      if(err){
        res.json({error:"Error comparig passwords"})
      }
      else{
        if(result){
          const token=jwt.sign({fullName,id,email},process.env.JWT_SECRET);
          res.cookie('token',token,{
            httpOnly:true,
            secure:true,
            sameSite:true,
            maxAge:60*60*1000
          })
        res.json({error:null});
        }
        else{
        res.json({error:"Incorrect Password! Try logging in again."})
        }
      }
      
    })
  }
  else{
    res.json({error:"User not found"});
  }
  } catch (error) {
    res.json({error:error});
  }
  
})

app.get("/forget",(req,res)=>{
  res.render("forgot-password.ejs");
});

app.post("/forgot-password", async (req, res) => {
  const { email, new_password } = req.body;
  try {
    // Check if user exists
    const userRes = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    console.log(email);
    if (userRes.rows.length === 0) {
      return res.send("No user with that email exists.");
    }
    const user=userRes.rows[0];
    // Hash the new password
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Update the password in database
    await db.query("UPDATE users SET password = $1 WHERE email = $2", [hashedPassword, email]);

    const token=jwt.sign({fullName:user.name,id:user.id,email:user.email},process.env.JWT_SECRET);
          res.cookie('token',token,{
            httpOnly:true,
            secure:true,
            sameSite:true,
            maxAge:60*60*1000
          })
    res.redirect("/dashboard");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error occurred.");
  }
});

app.get("/logout",(req,res)=>{
  res.clearCookie('token');
  res.redirect("login");
})
function verifyJWT(req,res,next){
  const token=req.cookies.token;
  try {
    const userPayload=jwt.verify(token,process.env.JWT_SECRET);
    req.user=userPayload;
    next();
  } catch (error) {
    res.status(403).json({ message: 'Invalid or expired token' });
  }
}

app.use(verifyJWT);


// ------------------------------
// Start Server
// ------------------------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚍 Bus tracking server running on port ${PORT}`);
});
