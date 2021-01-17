import { Constants } from "../../utils/config";
import { depositTx, transferTx } from "./controller";
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
    handler: [auth, transferTx],
  }
];
