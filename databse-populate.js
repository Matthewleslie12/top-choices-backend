import mysql from "mysql2";
import fs from "fs";
import {Storage} from "@google-cloud/storage";
import "dotenv/config";

async function importData() {
  const jsonData = fs.readFileSync("cuisines.json", "utf8");
  const cuisineData = JSON.parse(jsonData);

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    port: process.env.DB_PORT,
    password: process.env.DB_PASSWORD,
    database: process.env.DB,
  });

  const storage = new Storage();
  const bucketName = "imageserver1";

  for (const cuisine of cuisineData) {
    const {label} = cuisine;
    const query =
      "INSERT INTO cuisines (name,  create_time) VALUES (?,  NOW())";

    const imageUrl = `https://storage.googleapis.com/${bucketName}/images/${label}.jpg`;

    await connection.execute(query, [label]);

    const updateQuery = "UPDATE cuisines SET image_url = ? WHERE name = ?";
    await connection.execute(updateQuery, [imageUrl, label]);
  }

  connection.end();
  console.log("Data imported with image URLs");
}

importData();
