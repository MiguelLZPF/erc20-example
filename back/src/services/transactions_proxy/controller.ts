import { Request, Response } from "express";
import { sendTransaction } from "../../middleware/blockchain";
import { logStart, logger, logClose } from "../../middleware/logger";
import { ISendTx_req, ISendTx_res } from "../../models/TxProxy";


export const sendTx = async (req: Request, res: Response) => {
  const logInfo = logStart("transactions_proxy/controller.ts", "sendTx");
  const body = req.body as ISendTx_req;
  let httpCode = 202;
  let result: ISendTx_res = {
    sent: false,
    message: `ERROR: cannot send the requested transaction`,
  };

  try {
    // Send the transaction
    const receipt = await (await sendTransaction(body.signedTx))!.wait();
    if (!receipt || !receipt.transactionHash) {
      result.message = result.message.concat(". Signed Transaction cannot be sent");
      throw new Error(`Signed Transaction not processed correctly by the blockchain`);
    }
    logger.info(` ${logInfo.instance} Signed Transaction sent with hash: ${receipt.transactionHash}`);
    httpCode = 200;
    result = {
      sent: true,
      message: "Signed Transaction sent successfully",
      receipt: receipt,
      txHash: receipt.transactionHash,
      blockHash: receipt.blockHash
    };
  } catch (error) {
    logger.error(` ${logInfo.instance} ERROR Sending signed transaction. ${error.stack}`);
  } finally {
    logClose(logInfo);
    res.status(httpCode).send(result);
  }
};
