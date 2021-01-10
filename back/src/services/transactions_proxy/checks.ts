import { Request, Response, NextFunction } from "express";
import { logger, logStart, logClose } from "../../middleware/logger";
import { ISendTx_req, ISendTx_res } from "../../models/TxProxy";

export const check_sendTx = async (req: Request, res: Response, next: NextFunction) => {
  const logInfo = logStart("transaction-proxy/checks.ts", "check_sendTx", "trace");
  let httpCode = 400;
  let body = req.body as ISendTx_req;
  let result: ISendTx_res = {
    sent: false,
    message: "PARAM ERROR: Cannot send transaction",
  };

  try {
    if (!body.signedTx) {
      result.message = result.message.concat(
        ". Signed Transaction must be provided in request's body"
      );
      throw new Error(`Signed Transaction not provided in body.signedTx`);
    }
    logger.debug(` ${logInfo.instance} All parameters checked correctly`);
    next();
  } catch (error) {
    logger.error(` ${logInfo.instance} PARAM ERROR: ${error.stack}`);
    res.status(httpCode).send(result);
  } finally {
    logClose(logInfo);
  }
};
