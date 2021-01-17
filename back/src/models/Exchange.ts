import { Bytes, PopulatedTransaction } from "ethers";
import { Ireq, Ires } from "./IReqRes";

// Deposit
export interface IDeposit_req extends Ireq {
  amount: number;
}

export interface IDeposit_res extends Ires {
  depositUnsignedTx?: PopulatedTransaction;
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
  A_approveUnsignedTx?: PopulatedTransaction;
  B_transferUnsignedTx?: PopulatedTransaction;
  toAccount?: string; // recipient
  fromAccount?: string; // sender
  spenderBalance?: number;
  recipientBalance?: number;
}