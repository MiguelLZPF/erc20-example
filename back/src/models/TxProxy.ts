import { Transaction } from "ethers";
import { Ireq, Ires } from "./IReqRes";

// Send Transaction
export interface ISendTx_req extends Ireq {
  signedTx: string; // There is no SignedTransaction or similar
  type?: string;
}
export interface ISendTx_res extends Ires {
  sent: boolean;
  type?: string;
  txHash?: string;
  blockHash?: string;
}