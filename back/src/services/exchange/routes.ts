import { Constants } from "../../utils/config";
import { deposit } from "./controller";
import { auth } from "../../middleware/auth";

const ROOT = `${Constants.ROOT}/exchange`;

export default [
  {
    path: `${ROOT}/deposit`,
    method: "put",
    handler: [auth, depositTx],
  },
  {
    path: `${ROOT}/transfer`,
    method: "put",
    handler: [auth, transfer],
  }
];
