import http from "http";
import express from "express";
/* import * as fs from 'fs';
import * as util from 'util'; */
import { applyMiddleware, applyRoutes } from "./utils";
import middleware from "./middleware";
import routes from "./services";
import { logger } from "./middleware/logger";
import * as publicIp from "public-ip";
import { Constants } from "./utils/config";
import { configProviders } from "./middleware/blockchain";
/* Error handling Block */
process.on("uncaughtException", (e) => {
  console.log(e);
  process.exit(1);
});
process.on("unhandledRejection", (e) => {
  console.log(e);
  process.exit(1);
});
/*****/

/* const readFile = util.promisify(fs.readFile);
 
const startServer = async () => {
  const { PORT = 3000 } = process.env;
  const [key, cert] = await Promise.all([
    readFile('../key.pem'),
    readFile('../certificate.pem')
  ]);

  const router = express();
  applyMiddleware(middleware, router);
  applyRoutes(routes, router);
  applyMiddleware(errorHandlers, router);

  const server = https.createServer({ key, cert }, router);
  server.listen(PORT, () =>
    console.log(`Server is running https://localhost:${PORT}...`)
  );
}

startServer(); */

const router = express();
applyMiddleware(middleware, router);
applyRoutes(routes, router);

router.set("port", Constants.PORT || 3000);
//const { PORT = 4000 } = process.env;
const server = http.createServer(router);

server.listen(Constants.PORT, async() => {
  logger.info(`Server is running http://${await publicIp.v4()}:${Constants.PORT}...`);
});

//console.log(Constants);
configProviders();

export default [server];