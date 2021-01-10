import { Constants } from "../../utils/config";
import { signUp, login, adminLogin, test } from "./controller";
import { auth } from "../../middleware/auth";
import { check_adminLogin, check_signUp, check_login } from "./checks";

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
  {
    path: `${Constants.ROOT}/admins/login`,
    method: "post",
    handler: [check_adminLogin, adminLogin],
  },
  {
    path: `${Constants.ROOT}/test`,
    method: "post",
    handler: [test],
  }
];
