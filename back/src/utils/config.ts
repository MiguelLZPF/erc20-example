import * as dotenv from "dotenv";

type LogLevel = "info"|"debug"|"trace";
type Web3Protocol = "RPC" | "WS";
interface Constants {
  APP_NAME: string;
  ROOT: string;
  LOG_LEVEL: LogLevel;
  PORT: number | string;
  MONGO_URI: string;
  // Sensitive Constants should not be on env
  JWT_SECRET: string;
  CRYPTO_KEY: string;
  ADMIN_PATH: string;
  ADMIN_PASSWORD: string;
  DEFAULT_ADMIN: string;
  WEB3_PROTOCOL: Web3Protocol;
  WEB3_IP: string;
  WEB3_PORT: string | number;
  WEB3_ROUTE: string;
  GANACHE_URI_RPC: string;
  GANACHE_URI_WS: string;
  ALASTRIA_URI_RPC: string;
  ALASTRIA_URI_WS: string;
}

dotenv.config();
let path;
switch (process.env.NODE_ENV) {
  case "trace":
    process.env.LOG_LEVEL = "trace";
    path = `${__dirname}/../../.env.development`;
    break;
  case "development":
    path = `${__dirname}/../../.env.development`;
    break;
  case "production":
    path = `${__dirname}/../../.env.production`;
    break;
  default:
    path = `${__dirname}/../../.env.development`;
}
dotenv.config({ path: path });

export const Constants: Constants = {
  APP_NAME: process.env.APP_NAME ? process.env.APP_NAME : "IoBTest",
  ROOT: process.env.ROOT ? process.env.ROOT : "/iobtest",
  LOG_LEVEL: process.env.LOG_LEVEL ? process.env.LOG_LEVEL as LogLevel : "info",
  PORT: process.env.PORT ? process.env.PORT : 3000,
  MONGO_URI: process.env.MONGO_URI ? process.env.MONGO_URI : "mongodb://127.0.0.1:27017/iobtest",
  // Sensitive Constants should not be on env
  JWT_SECRET: "secret",
  CRYPTO_KEY: "password",
  ADMIN_PATH: "./keystore/admin.json",
  ADMIN_PASSWORD: "password",
  DEFAULT_ADMIN: "Izertis",
  WEB3_PROTOCOL: process.env.WEB3_PROTOCOL ? process.env.WEB3_PROTOCOL as Web3Protocol : "RPC",
  WEB3_IP: process.env.WEB3_IP ? process.env.WEB3_IP : "127.0.0.1",
  WEB3_PORT: process.env.WEB3_PORT ? process.env.WEB3_PORT : "8545",
  WEB3_ROUTE: process.env.WEB3_ROUTE ? process.env.WEB3_ROUTE : "",
  // DEPRECATED
  GANACHE_URI_RPC: process.env.GANACHE_URI_HTTP ? process.env.GANACHE_URI_HTTP : "http://127.0.0.1:8545",
  GANACHE_URI_WS: process.env.GANACHE_URI_WS ? process.env.GANACHE_URI_WS : "ws://127.0.0.1:8545",
  ALASTRIA_URI_RPC: process.env.ALASTRIA_URI_RPC ? process.env.ALASTRIA_URI_RPC : "http://34.249.142.75/rpc",
  ALASTRIA_URI_WS: process.env.ALASTRIA_URI_WS ? process.env.ALASTRIA_URI_WS : "ws://34.249.142.75:8546"
};
export let Variables = {
  PROXY_ADMIN: process.env.PROXY_ADMIN ? process.env.PROXY_ADMIN : undefined,
  CONTRACT_REGISTRY: process.env.CONTRACT_REGISTRY ? process.env.CONTRACT_REGISTRY : undefined,
  IOB_MANAGER: process.env.IOB_MANAGER ? process.env.IOB_MANAGER: undefined,
  MY_TOKEN: process.env.MY_TOKEN ? process.env.MY_TOKEN: undefined,
  USERS: process.env.USERS ? process.env.USERS: undefined
};
