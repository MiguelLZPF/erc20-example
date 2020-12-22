import { Constants } from "../../utils/config";
import { deposit, withdrawal } from "./controller";
import { auth } from "../../middleware/auth";

const ROOT = `${Constants.ROOT}/exchange`;

export default [
  {
    path: `${ROOT}/deposit`,
    method: "put",
    handler: [auth, deposit],
  },
  {
    path: `${ROOT}/withdrawal`,
    method: "put",
    handler: [auth, withdrawal],
  }
];
