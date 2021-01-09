import { UnsignedTransaction } from "ethers";
import { Request, Response, NextFunction } from "express";
import { provider } from "../../middleware/blockchain";
import { logger, logStart, logClose } from "../../middleware/logger";
import { ISendTx_req, ISendTx_res } from "../../models/TxProxy";

export const check_sendTx = async(
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logInfo = logStart("transaction-proxy/checks.ts", "check_sendTx", "trace");
  let httpCode = 400;
  let body = req.body as ISendTx_req;
  let result: ISendTx_res = {
    sent: false,
    message: "PARAM ERROR: Cannot send transaction"
  }

  try {
    (await provider.getSigner(0).signTransaction(body.unsignedTx))
    if(!body.unsignedTx) {
      result.message = result.message.concat(". Unsigned Transaction must be provided in request's body");
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