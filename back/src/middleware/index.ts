import {
  handleCors,
  handleBodyRequestParsing,
  handleCompression,
  handleCookies
} from "./common";
import { handleAPIDocs } from "./apiDocs";
import { mongoConnect } from "./database";

export default [
  handleCors,
  handleBodyRequestParsing,
  handleCompression,
  handleAPIDocs,
  handleCookies,
  mongoConnect
];