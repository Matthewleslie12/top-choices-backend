import express from "express";
import mysql from "mysql2";
import cors from "cors";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import "dotenv/config";
import multer from "multer";
import path from "path";

const app = express();
app.use(express.static("public"));

const jwtSecret = process.env.JWT_SECRET || "ngjisdbiugrewmsopg,merwposg";
const PORT = process.env.PORT || 8081;
const URL = process.env.URL || "http://localhost:5173";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./Images");
  },
  filename: (req, file, cb) => {
    const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  },
});

const upload = multer({storage: storage});

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

          const userId = insertResult.insertId;

          const token = jwt.sign({name, userId}, jwtSecret, {
            expiresIn: "1d",
          });

          res.cookie("token", token);
          res.json({Status: "Success", userId});
          console.log(userId);
        }
      );
    });
  });
});

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
      const userId = checkData[0].id;

      const token = jwt.sign({name, userId}, jwtSecret, {
        expiresIn: "1d",
      });

      res.cookie("token", token);
      res.cookie("userId", userId);
      res.json({Status: "Success", token, name, email, userId});
      console.log(userId);
    });
  });
});

app.post("/form", upload.single("image"), (req, res) => {
  const {location, notes, link, rating, userId, uniqueFilename} = req.body;

  if (!location || !link || !rating) {
    return res.status(400).json({error: "location is required"});
  }

  const imagePath = `images/${uniqueFilename}`;

  const checkData =
    "INSERT INTO PLACES (location, notes, link, rating, userId, image_path, create_time) VALUES (?, ?, ?, ?, ?, ?, NOW())";
  db.query(
    checkData,
    [location, notes, link, rating, userId, imagePath],
    (insertErr, insertResult) => {
      if (insertErr) {
        console.error(insertErr);
        return res.status(500).json({Message: "Server side error"});
      }

      res.json({Status: "Success"});
    }
  );
});

app.get("/form", (req, res) => {
  const fetchDataQuery =
    "SELECT location, notes, link, rating, image_path, id FROM PLACES";

  db.query(fetchDataQuery, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({error: "Server side error"});
    }
    const savedData = results;

    res.json({data: savedData});
  });
});

app.get("/places/:id", (req, res) => {
  const placeId = req.params.id;

  const fetchPlaceQuery =
    "SELECT location, notes, link, rating, image_path, id FROM PLACES WHERE id = ?";

  db.query(fetchPlaceQuery, [placeId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({error: "Server side error"});
    }

    if (results.length === 0) {
      return res.status(404).json({error: "Place not found"});
    }

    const placeData = results[0];

    res.json({data: placeData});
  });
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});