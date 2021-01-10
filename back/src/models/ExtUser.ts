import { Bytes } from "ethers";
import * as mongoose from "mongoose";
/*===================== Mongo =========================*/

export interface IExtUser extends mongoose.Document {
  id: string | Bytes;
  owner: string;
  username: string;
  balance: number;
}

export const ExtUserSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: false, dropDups: true },
  owner: { type: String, unique: true, required: true, dropDups: true },
  username: { type: String, unique: true, required: true, dropDups: true },
  balance: { type: Number, required: true },
});

const ExtUser = mongoose.model<IExtUser>("ExtUser", ExtUserSchema, "ExtUser");
export default ExtUser;

//mongoose.disconnect();
/*===================== Mongo =========================*/
