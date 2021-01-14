import { PopulatedTransaction, UnsignedTransaction } from "ethers";
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