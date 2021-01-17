// import { Request, Response, NextFunction } from "express";
// import { logger, logStart, logClose } from "../../middleware/logger";
// import { IGetUserBy_res, IGetUserBy_req } from "../../models/User";
// import { isAddress } from "ethers/lib/utils";
// import { ethers } from "ethers";

// export const check_getUserBy = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const logInfo = await logStart(
//     "authentication/checks.ts",
//     "check_getUserBy",
//     "trace"
//   );
//   let httpCode = 400;
//   let result: IGetUserBy_res = {
//     message: "PARAM ERROR: cannot get user with given parameters",
//   };

//   try {
//     if (!req.body.senderAccount) {
//       result.message = result.message.concat(". Cannot find account in token");
//       throw new Error(`senderAccount not given by auth middleware`);
//     }
//     if (!req.params.param) {
//       result.message = result.message.concat(
//         ". No param specified in route. You can get User by username or address '/users/usernameoraddress'"
//       );
//       throw new Error(`no param specified in route`);
//     }
//     // check if param is address or username
//     if (ethers.utils.isHexString(req.params.param,20) && isAddress(ethers.utils.getAddress(req.params.param.toLowerCase()))) {
//       req.body.address = ethers.utils.getAddress(req.params.param.toLowerCase());
//     } else {
//       req.body.username = req.params.param;
//     }
//     logger.debug(` ${logInfo.instance} All parameters checked correctly`);
//     next();
//   } catch (error) {
//     logger.error(` ${logInfo.instance} PARAM: ${error.stack}`);
//     res.status(httpCode).send(result);
//   } finally {
//     logClose(logInfo);
//   }
// };

// export const check_updateUser = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const logInfo = await logStart(
//     "authentication/checks.ts",
//     "check_getUserBy",
//     "trace"
//   );
//   let httpCode = 400;
//   let result: IGetUserBy_res = {
//     message: "PARAM ERROR: cannot get user with given parameters",
//   };

//   try {
//     if (!req.body.senderAccount) {
//       result.message = result.message.concat(". Cannot find account in token");
//       throw new Error(`senderAccount not given by auth middleware`);
//     }
//     if (!req.params.param) {
//       result.message = result.message.concat(
//         ". No param specified in route. You can get User by username or address '/users/username'"
//       );
//       throw new Error(`no param specified in route`);
//     }
//     if (!ethers.utils.isHexString(req.params.param,20) && !isAddress(ethers.utils.getAddress(req.params.param.toLowerCase()))) {
//       result.message = result.message.concat(
//         ". The param is not an address'"
//       );
//       throw new Error(`The param is not an account`);
//     }
//     req.body.userAddress = ethers.utils.getAddress(req.params.param.toLowerCase());
//     if (!req.body.nombre) {
//       result.message = result.message.concat(
//         ". The param nombre is not in body."
//       );
//       throw new Error(`The param nombre is not in body`);
//     }
//     if (!req.body.apellidos) {
//       result.message = result.message.concat(
//         ". The param apellidos is not in body."
//       );
//       throw new Error(`The param nombre is not in body`);
//     }
//     if (!req.body.direccion) {
//       result.message = result.message.concat(
//         ". The param direccion is not in body."
//       );
//       throw new Error(`The param direccion is not in body`);
//     }
//     if (!req.body.dni) {
//       result.message = result.message.concat(
//         ". The param dni is not in body."
//       );
//       throw new Error(`The param dni is not in body`);
//     }
//     logger.debug(` ${logInfo.instance} All parameters checked correctly`);
//     next();
//   } catch (error) {
//     logger.error(` ${logInfo.instance} PARAM: ${error.stack}`);
//     res.status(httpCode).send(result);
//   } finally {
//     logClose(logInfo);
//   }
// };

// export const check_deleteUser = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const logInfo = await logStart(
//     "authentication/checks.ts",
//     "check_getUserBy",
//     "trace"
//   );
//   let httpCode = 400;
//   let result: IGetUserBy_res = {
//     message: "PARAM ERROR: cannot get user with given parameters",
//   };

//   try {
//     if (!req.body.senderAccount) {
//       result.message = result.message.concat(". Cannot find account in token");
//       throw new Error(`senderAccount not given by auth middleware`);
//     }
//     if (!req.params.param) {
//       result.message = result.message.concat(
//         ". No param specified in route. You can get User by username or address '/users/username'"
//       );
//       throw new Error(`no param specified in route`);
//     }
//     if (!ethers.utils.isHexString(req.params.param,20) && !isAddress(ethers.utils.getAddress(req.params.param.toLowerCase()))) {
//       result.message = result.message.concat(
//         ". The param is not an address'"
//       );
//       throw new Error(`The param is not an account`);
//     }
//     req.body.userAddress = ethers.utils.getAddress(req.params.param.toLowerCase());
    
//     logger.debug(` ${logInfo.instance} All parameters checked correctly`);
//     next();
//   } catch (error) {
//     logger.error(` ${logInfo.instance} PARAM: ${error.stack}`);
//     res.status(httpCode).send(result);
//   } finally {
//     logClose(logInfo);
//   }
// };

// export const check_deleteAllUsers = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const logInfo = await logStart(
//     "authentication/checks.ts",
//     "check_getUserBy",
//     "trace"
//   );
//   let httpCode = 400;
//   let result: IGetUserBy_res = {
//     message: "PARAM ERROR: cannot get user with given parameters",
//   };

//   try {
//     if (!req.body.senderAccount) {
//       result.message = result.message.concat(". Cannot find account in token");
//       throw new Error(`senderAccount not given by auth middleware`);
//     }
//     logger.debug(` ${logInfo.instance} All parameters checked correctly`);
//     next();
//   } catch (error) {
//     logger.error(` ${logInfo.instance} PARAM: ${error.stack}`);
//     res.status(httpCode).send(result);
//   } finally {
//     logClose(logInfo);
//   }
// };
