import { UnsignedTransaction } from "ethers";
import { Ireq, Ires } from "./IReqRes";

// Deposit
export interface IDeposit_req extends Ireq {
  amount: number;
}

export interface IDeposit_res extends Ires {
  toAccount?: string;
  fromAccount?: string;
  bankBalance?: number;
  tokenBalance?: number;
}

// Withdrawal
export interface IWithdrawal_req extends IDeposit_req {}
export interface IWithdrawal_res extends IDeposit_res {
  unsignedTx?: UnsignedTransaction;
}