import { Request, Response, NextFunction } from "express";
import { logger, logStart, logClose } from "../../middleware/logger";
import { isAddress } from "ethers/lib/utils";
import { ethers } from "ethers";
import { IGetUserBy_res } from "../../models/User";

export const check_getUserBy = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logInfo = logStart(
    "authentication/checks.ts",
    "check_getUserBy",
    "trace"
  );
  let httpCode = 400;
  let result: IGetUserBy_res = {
    message: "PARAM ERROR: cannot get user with given parameters",
  };

  try {
    if (!req.body.senderAccount) {
      result.message = result.message.concat(". Cannot find account in token");
      throw new Error(`senderAccount not given by auth middleware`);
    }
    if (!req.params.param) {
      result.message = result.message.concat(
        ". No param specified in route. You can get User by username or address '/users/usernameoraddress'"
      );
      throw new Error(`no param specified in route`);
    }
    // check if param is address or username
    if (ethers.utils.isHexString(req.params.param,20) && isAddress(ethers.utils.getAddress(req.params.param.toLowerCase()))) {
      req.body.address = ethers.utils.getAddress(req.params.param.toLowerCase());
    } else {
      req.body.username = req.params.param;
    }
    logger.debug(` ${logInfo.instance} All parameters checked correctly`);
    next();
  } catch (error) {
    logger.error(` ${logInfo.instance} PARAM: ${error.stack}`);
    res.status(httpCode).send(result);
  } finally {
    logClose(logInfo);
  }
};
