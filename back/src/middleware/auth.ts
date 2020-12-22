import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import { Constants } from "../utils/config";
import { ITokenData, IJWToken } from "../models/Auth";
import CryptoJS from "crypto-js";
import { logger, logStart, logClose } from "./logger";

/**
 * @title Authentication Middleware
 * Checks that all request that needs authentication comes with a token
 * inside a cookie. The tokes should have an account encrypted.
 * TODO: look inside authentication header too + others
 * @param req HTTP request object
 * @param res (not used)
 * @param next next function to run.
 */

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  const logInfo = logStart("auth.ts", "auth");
  let httpCode = 400;
  let result = {
    message: "AUTH ERROR: getting account from token",
  };
  try {
    if (req.body.senderAccount) {
      logger.warn(` ${logInfo.instance} someone tried to send an account in body.
                  account: ${req.body.account}. Removing`);
      req.body.senderAccount = "nice try";
    }

    let token: string;
    if (req.body.token) {
      logger.debug(` ${logInfo.instance} Token found in body...`);
      token = req.body.token;
    } else if (req.headers.authorization) {
      logger.debug(` ${logInfo.instance} Token found in Auth header...`);
      token = req.headers.authorization;
    } else if (req.cookies && req.cookies.Authorization) {
      logger.debug(` ${logInfo.instance} Token found in cookie...`);
      token = req.cookies.Authorization;
    } else {
      result.message.concat(". No token found anywhere");
      throw new Error(` ${logInfo.instance} No token found anywhere`);
    }
    // Token found in one place
    const verifyRes = jwt.verify(token, Constants.JWT_SECRET) as IJWToken;
    if (!verifyRes || !verifyRes.data) {
      result.message.concat(". Wrong Authorization Token");
      throw new Error(` ${logInfo.instance} Wrong Authorization Token. ${verifyRes}`);
    }
    const data = JSON.parse(await decrypt(verifyRes.data)) as ITokenData;
    if (!data || !data.account) {
      result.message.concat(". Wrong Authorization Token");
      throw new Error(` ${logInfo.instance} Wrong Authorization Token. Cannot decrypt data. ${data}`);
    }
    logger.info(` ${logInfo.instance} Account "${data.account}" found in token :-)`);
    req.body.senderAccount = data.account;
    next();
  } catch (error) {
    logger.error(` ${logInfo.instance} AUTH: ${error.stack}`);
    res.status(httpCode).send(result);
  } finally {
    logClose(logInfo);
  }
};
/**
 * @title Crypto Functions
 * @dev used for password secure storage and retrieve
 */
export const encryptHash = async (value: string) => {
  const shaValue = CryptoJS.SHA256(value).toString();
  return CryptoJS.AES.encrypt(shaValue, Constants.CRYPTO_KEY).toString();
};
export const hash = async (value: string) => {
  return CryptoJS.SHA256(value).toString();
};
export const encrypt = async (value: string) => {
  return CryptoJS.AES.encrypt(value, Constants.CRYPTO_KEY).toString();
};
export const decrypt = async (value: string) => {
  return CryptoJS.AES.decrypt(value, Constants.CRYPTO_KEY).toString(
    CryptoJS.enc.Utf8
  );
};
export const generateRandom = async (salt?: string) => {
  return salt ? encrypt(salt) : encrypt("password");
};
