import { Request, Response, NextFunction } from "express";
import { IAdminUpdate_res, IAddAdmin_res, IRemoveAdmin_res } from "../../models/Admin";
import { logger, logStart, logClose } from "../../middleware/logger";

export const check_addAdmin = async(
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logInfo = await logStart("admin/checks.ts", "check_addAdmin", "trace");
  let httpCode = 400;
  let result: IAddAdmin_res = {
    created: false,
    message: "PARAM ERROR: Cannot add new admin"
  }

  try {
    if(!req.body.newUsername) {
      result.message.concat(". New admin's username must be provided in the body");
      throw new Error(`. New admin's username must be provided in the body`);
    }
    if(!req.body.newPassword) {
      result.message.concat(". old password is required to change admins atributtes");
      throw new Error(`old password is required to change admins atributtes`);
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

export const check_removeAdmin = async(
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logInfo = await logStart("admin/checks.ts", "check_removeAdmin", "trace");
  let httpCode = 400;
  let result: IRemoveAdmin_res = {
    removed: false,
    message: "PARAM ERROR: Cannot remove admin"
  }

  try {
    if(!req.params.username) {
      result.message.concat(". Username must be provided in the route as admins/adminsusername");
      throw new Error(`. Username must be provided in the route as admins/adminsusername`);
    }
    req.body.username = req.params.username;
    logger.debug(` ${logInfo.instance} All parameters checked correctly`);
    next();
  } catch (error) {
    logger.error(` ${logInfo.instance} PARAM ERROR: ${error.stack}`);
    res.status(httpCode).send(result);
  } finally {
    logClose(logInfo);
  }
}

export const check_adminUpdate = async(
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logInfo = await logStart("admin/checks.ts", "check_adminUpdate", "trace");
  let httpCode = 400;
  let result: IAdminUpdate_res = {
    updated: false,
    message: "PARAM ERROR: Cannot update admin"
  }

  try {
    if(!req.params.username) {
      result.message.concat(". Username must be provided in the route as admins/myadminsusername");
      throw new Error(`Username not provided in the route as admins/myadminsusername`);
    }
    req.body.username = req.params.username;
    if(!req.body.password) {
      result.message.concat(". old password is required to change admins atributtes");
      throw new Error(`old password is required to change admins atributtes`);
    }
    // If none of this are set, it does not make sense
    if(!req.body.newUsername && !req.body.newPassword && !req.body.newAccount) {
      result.message.concat(". nothing requested to be changed");
      throw new Error(`nothing requested to be changed (no newUsername or newPassword or newAccount)`);
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