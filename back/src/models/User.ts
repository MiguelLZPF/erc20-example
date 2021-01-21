import { Ireq, Ires } from "./IReqRes";

//Interfaces used to define and understand User related data structures

export type Rol = "borrower" | "investor";

export default interface IUser {
  owner?: string;
  id: string;
  name: string;
  password?: string;
  dateCreated?: Date;
  dateModified?: Date;
  balance?:number;
  tokenBalance?:number;
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
