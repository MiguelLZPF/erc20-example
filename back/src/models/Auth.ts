import { PopulatedTransaction } from "ethers";
import { Ires } from "./IReqRes";

// Token
export interface ITokenData {
  account: string;
}

export interface ITokenPayload {
  data: string; // encrypted JSON.stringify(ITokenData)
}

export interface IJWToken {
  data: string; // encrypted JSON.stringify(ITokenData)
  exp?: number;
}

export interface IToken {
  JWToken: string;
  expiresIn: number;
}
// SIGNUP
export interface ISignUp_req {
  username: string;
  password: string;
  from?: string;
}

export interface ISignUp_res extends Ires {
  //generated: boolean;
  unsignedTx?: PopulatedTransaction;
  //userId?: string | Bytes
}
// LOGIN
export interface ILogin_req {
  username: string;
  password: string;
}

export interface ILogin_res extends Ires {
  login: boolean;
  token?: IToken;
}
