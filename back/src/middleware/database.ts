import { Mongoose } from "mongoose";
import { Constants } from "../utils/config";
import { logStart, logger, logClose } from "./logger";

const mongoose = require('mongoose');
const options = {
  user: "myUser",
  pass: "Contrasenna_1234",
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
  const logInfo = logStart("database.ts", "mongoConnect", "trace");
  try {
    mongo = await mongoose.connect(Constants.MONGO_URI, options);
    logger.info(` ${logInfo.instance} Mongo Database connected: ${Constants.MONGO_URI}`);
  } catch (error) {
    logger.error(`Connecting to Mongo DB. ${error.stack}`);
  }
  logClose(logInfo);
  return mongo;
}