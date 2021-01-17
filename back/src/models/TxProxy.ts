import { TransactionReceipt } from "../middleware/blockchain";
import { Ireq, Ires } from "./IReqRes";

// Send Transaction
export interface ISendTx_req {
  signedTx: string; // There is no SignedTransaction or similar
}
export interface ISendTx_res extends Ires {
  sent: boolean;
  receipt?: TransactionReceipt;
  txHash?: string;
  blockHash?: string;
}