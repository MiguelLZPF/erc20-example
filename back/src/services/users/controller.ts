import { Request, Response, NextFunction } from "express";
import { exampleManager, myToken, toDate, toNumber } from "../../middleware/blockchain";
import { logClose, logger, logStart } from "../../middleware/logger";
import ExtUser from "../../models/ExtUser";
import IUser, { IGetMyUser_req, IGetMyUser_res } from "../../models/User";

export const getMyUser = async (req: Request, res: Response) => {
  const logInfo = logStart("users/controller.ts", "getMyUser");
  const body = req.body as IGetMyUser_req;
  let httpCode = 202;
  let result: IGetMyUser_res = {
    message: "ERROR: can't retreive your user info",
  };

  try {

    const userBC = exampleManager!.callStatic.getMyUser({from: body.senderAccount});
    const tokenBalance = myToken!.callStatic.balanceOf(body.senderAccount);
    // -- check user in DB
    const userDB = ExtUser.findOne({ owner: body.senderAccount });

    const user: IUser = {
      owner: (await userBC).owner,
      id: (await userBC).id,
      name: (await userBC).name,
      password: (await userBC).password,
      dateCreated: (await toDate((await userBC).dateCreated)) as Date,
      dateModified: (await toDate((await userBC).dateModified)) as Date,
      balance: (await userDB)!.balance,
      tokenBalance: (await toNumber(await tokenBalance)) as number,
    }
    
    logger.info(
      ` ${logInfo.instance} User '${user.name}' information retreived successfully`
    );

    httpCode = 200; //OK
    result.user = user;
    result.message = "User's info retreived successfully";
  } catch (error) {
    logger.error(
      ` ${logInfo.instance} can't retreive your user unfo. ${error}`
    );
  } finally {
    logClose(logInfo);
    res.status(httpCode).send(result);
  }
};

// export const getUsers = async (req: Request, res: Response) => {
//   const logInfo = logStart("users/controller.ts", "getUsers");
//   const body: IGetUsers_req = req.body;
//   let httpCode = 202;
//   const result: IGetUsers_res = {
//     message: "ERROR: Something went wrong retrieving the Users list",
//   };

//   try {
//     let paap: Promise<Contract> | Contract = getPaapInstance();

//     const adminRes = await isAdmin(body.senderAccount);
//     if (!adminRes || !adminRes.admin) {
//       result.message =
//         "ERROR: account provided is not admin. " + "Only admin can see Users";
//       throw new Error(
//         `account '${body.senderAccount}' is not admin. Only admin can see Users`
//       );
//     }
//     // Sender is admin
//     const admin = adminRes.admin;
//     // Get all the external users data from DB
//     const usersDB = ExtUser.find();
//     // Get all the user addresses from BC

//     paap = await paap;
//     const userAddresses: Promise<string[]> = callStatic(
//       paap,
//       "getUsers",
//       body.senderAccount
//     );
//     if ((await usersDB).length != (await userAddresses).length) {
//       logger.warn(
//         ` ${logInfo.instance} Length of users from DB and BC does not Match!`
//       );
//     }
//     logger.info(
//       ` ${logInfo.instance} ${
//         (await userAddresses).length
//       } user addresses found`
//     );

//     // For each user address get user details
//     // Each query is done async and resolve in one Promise
//     let users: Promise<IUser | undefined>[] = [];
//     (await userAddresses).forEach((address) => {
//       users.push(getUser(address, admin.account));
//     });
//     result.userAddresses = await userAddresses;
//     result.users = await Promise.all(users);
//     result.usersLength = users.length;
//     result.message = "All users retrieved successfully";
//     httpCode = 200; //OK
//   } catch (error) {
//     logger.error(
//       ` ${logInfo.instance} ERROR: Something went wrong retrieving the Users list ${error}`
//     );
//   } finally {
//     logClose(logInfo);
//     res.status(httpCode).send(result);
//   }
// };

// export const getUserBy = async (req: Request, res: Response) => {
//   const logInfo = logStart("users/controller.ts", "getUserBy");
//   const body = req.body as IGetUserBy_req;
//   let httpCode = 202;
//   let result: IGetUserBy_res = {
//     message: "ERROR: Something went wrong retrieving user",
//   };

//   try {
//     /* cheking if admin while retrieving the user from DB
//       and getting the PAAP inspance */

//     let userAddress: string | undefined;
//     if (body.address) {
//       userAddress = body.address;
//     } else if (body.username) {
//       userAddress = (await callStatic(
//         await getPaapInstance(),
//         "getUserByName",
//         body.senderAccount,
//         body.username
//       ))._userAddress;
//     } else {
//       result.message =
//         "PARAM ERROR: cannot find username or address in body: " + body;
//       throw new Error(
//         `cannot find username or address in body: ${logObject(body)}`
//       );
//     }
//     if (!userAddress) {
//       result.message = "PARAM ERROR: cannot find useraddress in blockchain";
//       throw new Error(
//         `cannot find useraddress in blockchain: ${logObject(body)}`
//       );
//     }
//     // now we have user SC address to get the user
//     const user = await getUser(userAddress, body.senderAccount);
//     if (!user || !user.address) {
//       result.message =
//         "ERROR: cannot find User in blockchain with address '" +
//         userAddress +
//         "'";
//       throw new Error(
//         `cannot find User in blockchain with address '${userAddress}'`
//       );
//     }
//     logger.info(
//       ` ${logInfo.instance} user ${user.address} retrieved successfully from Blockchain`
//     );
//     httpCode = 200; //OK
//     result.user = user;
//     result.message =
//       "User '" + user.address + "' retrieved from blockchain successfully";
//   } catch (error) {
//     logger.error(
//       ` ${logInfo.instance} Something went wrong retrieving the User details`
//     );
//   } finally {
//     res.status(httpCode).send(result);
//     logClose(logInfo);
//   }
// };

// Non HTTP methods
