import { Constants } from "../../utils/config";
import { deployPaap, adminUpdate, initialize, addAdmin, removeAdmin } from "./controller";
import { auth } from "../../middleware/auth";
import { check_adminUpdate, check_addAdmin, check_removeAdmin } from "./checks";

const ROOT = `${Constants.ROOT}/admins`

export default [
  {
    path: `${Constants.ROOT}/initialize`,
    method: "post",
    handler: [
      initialize
    ]
  },
  {
    path: `${ROOT}`,
    method: "post",
    handler: [
      auth,
      check_addAdmin,
      addAdmin
    ]
  },
  {
    path: `${ROOT}/:username`,
    method: "put",
    handler: [
      check_adminUpdate,
      adminUpdate
    ]
  },
  {
    path: `${ROOT}/:username`,
    method: "delete",
    handler: [
      auth,
      check_removeAdmin,
      removeAdmin
    ]
  },
  {
    path: `${ROOT}/contracts`,
    method: "post",
    handler: [
        auth,
        deployPaap
    ]
  },
  /* { // TODO: IMPLEMENT AT THE END
    path: `${global.Constants.ROOT}/contract`,
    method: "put",
    handler: [
    ]
  }, */
  
]