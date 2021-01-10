import { isAddress } from "ethers/lib/utils";
import { Request, Response, NextFunction } from "express";
import { logger, logStart, logClose } from "../../middleware/logger";
import { IAdminLogin_res, ISignUp_req, ILogin_res, ISignUp_res } from "../../models/Auth";

export const check_adminLogin = async(
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logInfo = logStart("authentication/checks.ts", "check_adminLogin", "trace");
  let httpCode = 400;
  let result: IAdminLogin_res = {
    login: false,
    message: "PARAM ERROR: Cannot login admin"
  }

  try {
    if(!req.body.username) {
      result.message = result.message.concat(". Username must be provided in request's body");
      throw new Error(`Username not provided in body.username`);
    }
    if(!req.body.password) {
      result.message = result.message.concat(". Password is required to login");
      throw new Error(`Password is required to login`);
    }
    logger.debug(` ${logInfo.instance} All parameters checked correctly`);
    next();
  } catch (error) {
    logger.error(` ${logInfo.instance} PARAM ERROR: ${error.stack}`);
    res.status(httpCode).send(result);
  } finally {
    logClose(logInfo);
  }
}

export const check_signUp = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logInfo = logStart("authentication/checks.ts", "check_signUp", "trace");
  let httpCode = 400;
  const body = req.body as ISignUp_req;
  let result: ISignUp_res = {
    generated: false,
    message: "PARAM ERROR: cannot create new user with given parameters"
  }

  try {
    if(!body.username) {
      result.message = result.message.concat(". Username must be provided in request's body");
      throw new Error(`username not provided in body.username`);
    }
    if(!body.password) {
      result.message = result.message.concat(". Password must be provided in request's body");
      throw new Error(`password not provided in body.password`);
    }
    if(body.from && !isAddress(body.from)) {
      result.message = result.message.concat(". From account must be a valid address");
      throw new Error(`from account not valid in body.from`);
    }
    logger.debug(` ${logInfo.instance} All parameters checked correctly`);
    next();
  } catch (error) {
    logger.error(` ${logInfo.instance} PARAM ERROR: ${error.stack}`);
    res.status(httpCode).send(result);
  } finally {
    logClose(logInfo);
  }
}

export const check_login = async(
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logInfo = logStart("authentication/checks.ts", "check_login", "trace");
  let httpCode = 400;
  let result: ILogin_res = {
    login: false,
    message: "PARAM ERROR: Cannot login"
  }

  try {
    if(!req.body.username) {
      result.message = result.message.concat(". Username must be provided in request's body");
      throw new Error(`Username not provided in body.username`);
    }
    if(!req.body.password) {
      result.message = result.message.concat(". Password is required to login");
      throw new Error(`Password is required to login`);
    }
    logger.debug(` ${logInfo.instance} All parameters checked correctly`);
    next();
  } catch (error) {
    logger.error(` ${logInfo.instance} PARAM ERROR: ${error.stack}`);
    res.status(httpCode).send(result);
  } finally {
    logClose(logInfo);
  }
}