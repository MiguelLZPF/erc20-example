import ILoan from "./Loan";
import { Ireq, Ires } from "./IReqRes";

//Interfaces used to define and understand User related data structures

export type Rol = "borrower" | "investor";

export default interface IUser {
  owner?: string;
  address: string;
  username: string;
  password?: string;
  rol: Rol;
  nombre?:string, 
  apellidos?: string, 
  dni?: string, 
  direccion?: string,
  creationDate?: Date;
  loans?: ILoan[];
  investments?: IInvestment[];
  balance?:number;
  tokenBalance?:number;
}

export interface IInvestment {
  loanAddress: string;
  amount: number;
  interest: number;
  date: Date;
}

// Get My User
export interface IGetMyUser_req extends Ireq {}
export interface IGetMyUser_res extends Ires {
  user?: IUser;
}

// Get Users
export interface IGetUsers_req extends Ireq {}
export interface IGetUsers_res extends Ires {
  userAddresses?: string[];
  users?: (IUser | undefined)[];
  usersLength?: number;
}

// Get Users
export interface IGetUserByAccount_res extends Ires {
  username?: string;
  nombre?:string;
  apellidos?: string; 
  dni?: string;
  direccion?: string;
}
// Get User By
export interface IGetUserBy_req extends Ireq {
  username?: string;
  address?: string;
}
export interface IGetUserBy_res extends Ires {
  user?: IUser;
}

// Get Users Investment
export interface IGetUserInvest_req extends Ireq {}
export interface IGetUserInvest_res extends Ires {
  investment?: IInvestment[];
}

// Get Users Loans
export interface IGetUserLoans_req extends Ireq {}
export interface IGetUserLoans_res extends Ires {
  loans?: ILoan[];
}

// update user
export interface IUpdateUser_req extends Ireq {
  userAddress: string;
  nombre?:string;
  apellidos?: string; 
  dni?: string;
  direccion?: string;
}
export interface IUpdateUser_res extends Ires {}

// delete user
export interface IDeleteUser_req extends Ireq {
  userAddress: string;
}
export interface IDeleteUser_res extends Ires {
}
