import { UnsignedTransaction } from "ethers";
//Interfaces used to define and understand Loan related data structures

import { Ireq, Ires } from "./IReqRes";

export type State =
  | "draft"
  | "cancelled"
  | "published"
  | "invested"
  | "accepted"
  | "refunded";

export const isState = async (state: string) => {
  if (
    state == "draft" ||
    state == "cancelled" ||
    state == "published" ||
    state == "invested" ||
    state == "accepted" ||
    state == "refunded"
  ) {
    return true;
  } else {
    return false;
  }
};

export default interface ILoan {
  owner?: string;
  address: string;
  quantity: number;
  state: State;
  risk: number;
  minInterest: number;
  maxInterest: number;
  deadLine: Date;
  refundTime: number;
  investedTotal?: number;
  creationDate?: Date;
  invested?: IInvest[];
  payPlan?: IPayPlan;
}

export interface IInvest {
  investorAddress: string;
  investorAccount: string;
  amount: number;
  percentQuantity: number; // unused
  interest: number;
  date: Date;
}

export interface IPayPlan {
  amounts: number[]; // [month] [invest]
  // Percent that indicates the amount corresponding to each investor in percWEI (10**6)
  // Example: 25% = 0.25 --> [250000] stored
  percents: number[];
  dates: Date[];
  lastPaidMonth: number;
  debt: number;
  penalties: number;
}
// Get all Loans
export interface IGetLoans_req extends Ireq {
  maxQuantity?: number;
  minQuantity?: number;
  fromDate?: Date;
  toDate?: Date;
  state?: State;
  risk?: number;
}
export interface IGetLoans_res extends Ires {
  loanAddresses?: string[];
  loans?: ILoan[];
  loansLength?: number;
}
// Get Loan
export interface IGetLoan_req extends Ireq {
  loanAddress?: string;
  state?: State;
  risk?: number;
}
export interface IGetLoan_res extends Ires {
  loan?: ILoan;
}
// Create Loan
export interface ICreateLoan_req extends Ireq {
  quantity: number;
  minInterest: number;
  maxInterest: number;
  deadLine: Date;
  refundTime: number; //months
}
export interface ICreateLoan_res extends Ires {
  created: boolean;
  loanAddress?: string;
  unsignedTx?: UnsignedTransaction;
}

// Get payPlan
export interface IGetPayPlan_req extends Ireq {
  loanAddress: string;
}
export interface IGetPayPlan_res extends Ires {
  payPlan?: IPayPlan;
}

// Publish Loan
export interface IPublishLoan_req extends Ireq {}
export interface IPublishLoan_res extends Ires {
  loans?: ILoan[];
}
// Get invests
export interface IGetInvests_req extends Ireq {
  loanAddress: string;
}
export interface IGetInvests_res extends Ires {
  invested?: IInvest[];
}
// Make invest
export interface IMakeInvest_req extends Ireq {}
export interface IMakeInvest_res extends Ires {
  invested: boolean;
}

// Cancel Loan
export interface ICancelLoan_req extends Ireq {}
export interface ICancelLoan_res extends Ires {
  cancelled: boolean;
}

// Acept Loan
export interface IAcceptLoan_req extends Ireq {
  address: string;
}
export interface IAcceptLoan_res extends Ires {
  acepted: boolean;
}
