import { Constants } from "../../utils/config";
import { auth } from "../../middleware/auth";
import { getMyUser } from "./controller";
/* import { getMyUser, getUsers, getUserBy } from "./controller";
import { check_getUserBy } from "./checks"; */

const ROOT = `${Constants.ROOT}/users`;

export default [
  {
    path: `${ROOT}/me`,
    method: "get",
    handler: [auth, getMyUser],
  }/* ,
  {
    path: `${ROOT}`,
    method: "get",
    handler: [auth, getUsers],
  },
  {
    path: `${ROOT}/:param`,
    method: "get",
    handler: [auth, check_getUserBy, getUserBy]
  } */
];
