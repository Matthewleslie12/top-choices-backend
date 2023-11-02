import express from "express";
import mysql from "mysql2";
import cors from "cors";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const app = express();

const jwtSecret = process.env.JWT_SECRET || "ngjisdbiugrewmsopg,merwposg";

const URL = process.env.URL || "http://localhost:5173";
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: [URL],
    methods: ["GET", "POST"],
    credentials: true,
  })
);

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  port: 3306,
  password: "password",
  database: "signup",
});

app.post("/register", (req, res) => {
  const {name, email, password} = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({Message: "All fields are required"});
  }

  const checkEmailQuery = "SELECT * FROM Users WHERE email = ?";
  db.query(checkEmailQuery, [email], (checkErr, checkData) => {
    if (checkErr) {
      console.error(checkErr);
      return res.status(500).json({Message: "Server side error"});
    }

    if (checkData.length > 0) {
      return res.status(400).json({Message: "Email already in use"});
    }

    bcrypt.hash(password, 10, (hashErr, hashedPassword) => {
      if (hashErr) {
        console.error(hashErr);
        return res.status(500).json({Message: "Server side error"});
      }

      const insertUserQuery =
        "INSERT INTO Users (name, email, password, create_time) VALUES (?, ?, ?, NOW())";
      db.query(
        insertUserQuery,
        [name, email, hashedPassword],
        (insertErr, insertResult) => {
          if (insertErr) {
            console.error(insertErr);
            return res.status(500).json({Message: "Server side error"});
          }

          const token = jwt.sign({name}, jwtSecret, {
            expiresIn: "1d",
          });

          res.cookie("token", token);
          res.json({Status: "Success"});
        }
      );
    });
  });
});

export default app;
