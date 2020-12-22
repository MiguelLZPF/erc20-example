import * as mongoose from "mongoose";
/*===================== Mongo =========================*/

export interface IExtUser extends mongoose.Document {
  username: string;
  account: string;
  accPass?: string;
  userAddress: string;
  balance: number;
  nombre: string;
  apellidos: string;
  direccion: string;
  dni: string;
}

export const ExtUserSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true, dropDups: true },
  account: { type: String, unique: true, required: true, dropDups: true },
  accPass: { type: String, required: false },
  userAddress: { type: String, unique: true, required: true, dropDups: true },
  balance: { type: Number, required: true },
  nombre: { type: String, required: false },
  apellidos: { type: String, required: false },
  direccion: { type: String, required: false },
  dni: { type: String, required: false },
});

const ExtUser = mongoose.model<IExtUser>("ExtUser", ExtUserSchema, "ExtUser");
export default ExtUser;

//mongoose.disconnect();
/*===================== Mongo =========================*/
