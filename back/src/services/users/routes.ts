import { Constants } from "../../utils/config";
import { auth } from "../../middleware/auth";
import { getMyUser, getUsers, getUserBy, getUserInvestments, getUserLoans, updateUser, deleteUser, deleteAllUsers } from "./controller";
import { check_getUserBy, check_updateUser, check_deleteUser, check_deleteAllUsers } from "./checks";

const ROOT = `${Constants.ROOT}/users`;

export default [
  // TODO: updatePassword
  {
    path: `${ROOT}/me`,
    method: "get",
    handler: [auth, getMyUser],
  },
  {
    path: `${ROOT}`,
    method: "get",
    handler: [auth, getUsers],
  },
  {
    path: `${ROOT}/:param`,
    method: "get",
    handler: [auth, check_getUserBy, getUserBy],
  },
  {
    path: `${ROOT}/:username/investments`,
    method: "get",
    handler: [auth, check_getUserBy, getUserInvestments],
  },
  {
    path: `${ROOT}/:username/loans`,
    method: "get",
    handler: [auth, check_getUserBy, getUserLoans],
  },
  {
    path: `${ROOT}/:param`,
    method: "put",
    handler: [auth, check_updateUser, updateUser],
  },
  {
    path: `${ROOT}/:param`,
    method: "delete",
    handler: [auth, check_deleteUser, deleteUser],
  },
  {
    path: `${ROOT}/delete/all`,
    method: "delete",
    handler: [auth, check_deleteAllUsers, deleteAllUsers],
  }
];
