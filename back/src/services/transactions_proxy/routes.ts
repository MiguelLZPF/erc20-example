import { auth } from "../../middleware/auth";
import { Constants } from "../../utils/config";


const ROOT = `${Constants.ROOT}/tx-proxy`

export default [
  {
    path: `${ROOT}/send`,
    method: "post",
    handler: [auth, check_sendTx, sendTx],
  }
];
