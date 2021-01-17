import { Constants } from "../../utils/config";
import { signUp, login,} from "./controller";
import { check_signUp, check_login } from "./checks";

export default [
  {
    path: `${Constants.ROOT}/users`,
    method: "post",
    handler: [check_signUp, signUp],
  },
  {
    path: `${Constants.ROOT}/login`,
    method: "post",
    handler: [check_login, login],
  },

];
