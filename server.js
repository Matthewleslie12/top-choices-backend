import express from "express";
import mysql from "mysql2";
import cors from "cors";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import "dotenv/config";
import {Storage} from "@google-cloud/storage";

const app = express();
app.use(express.static("public"));

const jwtSecret = process.env.JWT_SECRET || "ngjisdbiugrewmsopg,merwposg";
const PORT = process.env.PORT || 8081;
const URL = process.env.URL || "http://localhost:5173";

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: [URL],
    methods: ["GET", "POST", "DELETE"],
    credentials: true,
  })
);

const storage = new Storage({
  keyFilename:
    "./top-choices-404401-8d001f6e2d35.jsonServer/top-choices-404401-8d001f6e2d35.json",
});

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  port: process.env.DB_PORT,
  password: process.env.DB_PASSWORD,
  database: process.env.DB,
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
            expiresIn: "1h",
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

app.post("/form", (req, res) => {
  const {location, notes, link, rating, userId, imagePath, cuisine} = req.body;
  console.log(req.file);
  if (!location || !link || !rating) {
    return res
      .status(400)
      .json({error: "Location, Link and Rating are required!"});
  }

  const checkData =
    "INSERT INTO PLACES (location, notes, link, rating, userId, image_path, cuisine, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())";
  db.query(
    checkData,
    [location, notes, link, rating, userId, imagePath, cuisine],
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
  const userId = req.query.userId;
  const fetchDataQuery = `
  SELECT 
    p.location, p.notes, p.link, p.rating, p.image_path, p.id, p.cuisine, p.userId,
    c.image_url AS cuisineImageUrl
  FROM PLACES p
  LEFT JOIN cuisines c ON p.cuisine = c.name
  WHERE p.userId = ?
`;
  db.query(fetchDataQuery, [userId], (err, results) => {
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
    "SELECT location, notes, link, rating, image_path, cuisine, id FROM PLACES WHERE userId = ?";
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

app.delete("/places/:id", (req, res) => {
  const placeId = req.params.id;

  const deleteQuery = "DELETE FROM PLACES WHERE id = ?";
  db.query(deleteQuery, [placeId], (err, results) => {
    if (err) {
      return res.status(500).json({error: "cannot delete bc server"});
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({error: "Places not found"});
    }
    res.json({message: "deleted, good job "});
  });
});

app.get("/cuisines", (req, res) => {
  const selectCuisinesQuery =
    "SELECT name, image_url FROM cuisines ORDER BY name ASC";
  console.log(selectCuisinesQuery);

  db.query(selectCuisinesQuery, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({error: "Server side error"});
    }

    const cuisines = results;

    res.json(cuisines);
  });
});

app.post("/create-cuisine", (req, res) => {
  const {cuisineName} = req.body;
  const customName = cuisineName.charAt(0).toUpperCase() + cuisineName.slice(1);
  const insertCuisineQuery =
    "INSERT INTO cuisines (name, create_time) VALUES (?, NOW())";
  db.query(insertCuisineQuery, [customName], (err, results) => {
    if (err) {
      return res.status(500).json({error: "Server side error"});
    }
    res.json({Status: "Success"});
  });
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
