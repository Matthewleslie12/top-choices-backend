import express from "express";
import bcrypt from "bcrypt";
import mysql from "mysql2";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();
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

const jwtSecret = process.env.JWT_SECRET || "ngjisdbiugrewmsopg,merwposg";

app.post("/login", (req, res) => {
  const {email, password} = req.body;

  if (!email || !password) {
    return res.status(400).json({error: "Email and password are required"});
  }

  const checkEmailQuery = "SELECT * FROM Users WHERE email = ?";
  db.query(checkEmailQuery, [email], (checkErr, checkData) => {
    if (checkErr) {
      console.error(checkErr);
      return res.status(500).json({error: "Server side error"});
    }

    if (checkData.length === 0) {
      return res.status(401).json({error: "Email not found"});
    }

    const hashedPassword = checkData[0].password;

    bcrypt.compare(password, hashedPassword, (compareErr, isMatch) => {
      if (compareErr) {
        console.error(compareErr);
        return res.status(500).json({error: "Server side error"});
      }

      if (!isMatch) {
        return res.status(401).json({error: "Invalid password"});
      }

      const name = checkData[0].name;
      const token = jwt.sign({name}, jwtSecret, {
        expiresIn: "1d",
      });

      res.cookie("token", token);
      res.json({Status: "Success"});
    });
  });
});

export default app;
