import { PopulatedTransaction } from "ethers";
import { IAdmin } from "./Admin";
import { Ires, Ireq } from "./IReqRes";

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
export interface ISignUp_req extends Ireq {
  username: string;
  password: string;
}

export interface ISignUp_res extends Ires {
  generated: boolean;
  unsignedTx?: PopulatedTransaction,
  userId?: string
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
// Admin Login
export interface IAdminLogin_req {
  username: string;
  password: string;
}

export interface IAdminLogin_res extends Ires {
  login: boolean;
  token?: IToken;
}
// is Admin
export interface IisAdmin_res extends Ires {
  isAdmin: boolean;
  admin?: IAdmin;
}
