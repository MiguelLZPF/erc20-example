import { Request, Response } from "express";
import { provider, sendTransaction } from "../../middleware/blockchain";
import { logStart, logger, logClose } from "../../middleware/logger";
import { ISendTx_req, ISendTx_res } from "../../models/TxProxy";

const types = ["generic", "new-user", "update-user"] as const;

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

    receipt.logs[0].

    // asign one type
    if (!body.type || !(body.type in types)) {
      body.type = "generic";
    }
    // check for a type in tx events
    if (body.type == "generic") {
      await checkEventType();
    }

    // -- END
    httpCode = 201;
    result = {
      sent: true,
      message:
        "User registered successfully in the systems DB. WARNING: ypu need to send the signed Transaction using /tx-proxy/send/newUser route",
    };
  } catch (error) {
    logger.error(` ${logInfo.instance} ERROR Sending signed transaction. ${error.stack}`);
  } finally {
    logClose(logInfo);
    res.status(httpCode).send(result);
  }
};

// NON HTTP METHODS
const checkEventType = async (txHash: string) => {
  
};
