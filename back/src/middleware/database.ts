import { Mongoose } from "mongoose";
import { Constants } from "../utils/config";
import { logStart, logger, logClose } from "./logger";

// import { MongoClient, Db } from "mongodb";
// const util = require('util');
// const {MongoClient, Db} = require('mongodb');
//import * as mongoose from "mongoose";
const mongoose = require('mongoose');
const options = {
  user: "izertis",
  pass: "Izertis_1234",
  useNewUrlParser: true,
  retryWrites: true,
  w: "majority",
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true,
  socketTimeoutMS: 30000,
  keepAlive: true,
  poolSize: 10
};
/**
 * My SQL exmple
 */
/* const mysql = require('mysql');
const pool = mysql.createPool({
  connectionLimit: 10,
  host: 'localhost',
  user: "root",
  password: "MySql5070",
  database: "my_web"
}); */

/**
 * Mongo DB database conection middleware
 */

let mongo: Mongoose;

export const mongoConnect = async(): Promise<Mongoose> => {
  const logInfo = await logStart("database.ts", "mongoConnect", "trace");
  try {
    mongo = await mongoose.connect(Constants.MONGO_URI, options);
    logger.info(` ${logInfo.instance} Mongo Database connected: ${Constants.MONGO_URI}`);
  } catch (error) {
    logger.error(`Connecting to Mongo DB. ${error.stack}`);
  }
  logClose(logInfo);
  return mongo;
}

/* // Ping database to check for common exception errors.
pool.getConnection((err: { code: string; }, connection: { release: () => void; }) => {
  if (err) {
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error('Database connection was closed.');
    }
    if (err.code === 'ER_CON_COUNT_ERROR') {
      console.error('Database has too many connections.');
    }
    if (err.code === 'ECONNREFUSED') {
      console.error('Database connection was refused.');
    }
  };

  if (connection) connection.release();

  return;
});

// Promisify for Node.js async/await.
pool.query = util.promisify(pool.query);

module.exports = pool; */