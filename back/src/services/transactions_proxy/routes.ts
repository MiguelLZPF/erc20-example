import { auth } from "../../middleware/auth";
import { Constants } from "../../utils/config";
import { check_sendTx } from "./checks";
import { sendTx } from "./controller";


const ROOT = `${Constants.ROOT}/tx-proxy`

export default [
  {
    path: `${ROOT}/send`,
    method: "post",
    handler: [check_sendTx, sendTx],
  }
];
