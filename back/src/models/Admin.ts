import * as mongoose from "mongoose";
import { Ireq, Ires } from "./IReqRes";

/*===================== Mongo =========================*/

export interface IAdmin extends mongoose.Document {
  username: string;
  password: string;
  account: string;
  accPass: string;
}

export const AdminSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true, dropDups: true },
  password: { type: String, unique: true, required: true, dropDups: true },
  account: { type: String, unique: true, required: true, dropDups: true },
  accPass: { type: String, unique: true, required: true, dropDups: true },
});

const Admin = mongoose.model<IAdmin>("Admin", AdminSchema, "Admin");
export default Admin;
/*===================== Mongo =========================*/

// Admin Initialize
export interface IInitialize_req {
  account?: string;
}

export interface IInitialize_res {
  initialized: boolean;
  adminUsername?: string;
  message: string;
}
// Add Admin
export interface IAddAdmin_req extends Ireq {
  newUsername: string;
  newPassword: string;
}

export interface IAddAdmin_res extends Ires {
  created: boolean;
  username?: string;
  account?: string;
}

// Remove Admin
export interface IRemoveAdmin_req extends Ireq {
  username: string;
}

export interface IRemoveAdmin_res extends Ires {
  removed: boolean;
  username?: string;
}

// Admin Update
export interface IAdminUpdate_req {
  username: string;
  password: string;
  newUsername?: string;
  newPassword?: string;
  newAccount?: boolean;
}

export interface IAdminUpdate_res extends Ires {
  updated: boolean;
  username?: string;
  account?: string;
}

// Deploy PAAP
export interface IDeployPAAP_req extends Ireq {
  artifact?: any;
}

export interface IDeployPAAP_res extends Ires {
  deployed: boolean;
  tokenAddress?: string;
  paapAddress?: string;
}
