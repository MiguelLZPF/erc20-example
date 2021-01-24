import { Bytes, PopulatedTransaction } from "ethers";
import { TransactionReceipt } from "../middleware/blockchain";
import { Ireq, Ires } from "./IReqRes";

// Deposit
export interface IDeposit_req extends Ireq {
  amount: number;
}

export interface IDeposit_res extends Ires {
  toAccount?: string; // sender account
  fromAccount?: string; // manager SC
  bankBalance?: number; // simulated
  tokenBalance?: number;
}

// Transfer
export interface ITransfer_req extends Ireq {
  amount: number;
  recipientId?: string | Bytes;
  recipientAccount?: string;
}

export interface ITransfer_res extends Ires {
  txHash?: string;
  A_approveUnsignedTx?: PopulatedTransaction;
  B_transferSignedTx?: string;
  toAccount?: string; // recipient
  fromAccount?: string; // sender
  spenderBalance?: number;
  recipientBalance?: number;
}