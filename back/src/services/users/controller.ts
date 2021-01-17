
// export const getMyUser = async (req: Request, res: Response) => {
//   const logInfo = logStart("users/controller.ts", "getMyUser");
//   const body = req.body as IGetMyUser_req;
//   let httpCode = 202;
//   let result: IGetMyUser_res = {
//     message: "ERROR: can't retreive your user info",
//   };

//   try {
//     /* const userDB = await ExtUser.findOne({account: body.senderAccount});
//     if (!userDB || !userDB.account) {
//       result.message = "ERROR: cannot find user with account '" + body.senderAccount + "' in database";
//       throw new Error(`cannot find user with account '${body.senderAccount}' in database`);
//     } */
//     const paap = await getPaapInstance();
//     const userAddress = (await callStatic(
//       paap,
//       "getMyAddress",
//       body.senderAccount
//     )) as string;
//     if (!userAddress) {
//       result.message =
//         "ERROR: cannot find user with account '" +
//         body.senderAccount +
//         "' in blockchain";
//       throw new Error(
//         `cannot find user with account '${body.senderAccount}' in blockchain`
//       );
//     }
//     const user = await getUser(userAddress, body.senderAccount);
//     if (!user || !user.address) {
//       throw new Error(`cannot get user info from getUser()`);
//     }
//     logger.info(
//       ` ${logInfo.instance} User '${user.username}' information retreived successfully`
//     );

//     httpCode = 200; //OK
//     result.user = user;
//     result.message = "User's info retreived successfully";
//   } catch (error) {
//     logger.error(
//       ` ${logInfo.instance} can't retreive your user unfo. ${error}`
//     );
//   } finally {
//     logClose(logInfo);
//     res.status(httpCode).send(result);
//   }
// };

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

// export const getUserInvestments = async (req: Request, res: Response) => {
//   const logInfo = logStart("users/controller.ts", "getUserInvestments");
//   const body = req.body as IGetUserInvest_req;
//   let httpCode = 202;
//   let result: IGetUserInvest_res = {
//     message: "ERROR: can't retreive your user info",
//   };

//   try {
//     /* const userDB = await ExtUser.findOne({account: body.senderAccount});
//     if (!userDB || !userDB.account) {
//       result.message = "ERROR: cannot find user with account '" + body.senderAccount + "' in database";
//       throw new Error(`cannot find user with account '${body.senderAccount}' in database`);
//     } */
//     const paap = await getPaapInstance();
//     const userAddress = (await callStatic(
//       paap,
//       "ownerToUser",
//       undefined,
//       body.senderAccount
//     )) as string;
//     if (!userAddress) {
//       result.message =
//         "ERROR: cannot find user with account '" +
//         body.senderAccount +
//         "' in blockchain";
//       throw new Error(
//         `cannot find user with account '${body.senderAccount}' in blockchain`
//       );
//     }
//     let userInstance = await getUserInstance(userAddress);
//     const basicInfo = await callStatic(userInstance, "get", userAddress);
//     if (basicInfo._rol == "investor") {
//       const userInvestments = await getInvestments(
//         userInstance,
//         body.senderAccount
//       );
//       if (!userInvestments) {
//         throw new Error(`cannot get user info from getInvestments()`);
//       }
//       logger.info(
//         ` ${logInfo.instance} Investments '${userInvestments}' information retreived successfully`
//       );

//       httpCode = 200; //OK
//       result.investment = userInvestments;
//       result.message = "User's info retreived successfully";
//     } else {
//       throw new Error(`Bad rol info retreived from blockchain`);
//     }
//   } catch (error) {
//     logger.error(
//       ` ${logInfo.instance} can't retreive your user unfo. ${error}`
//     );
//   } finally {
//     logClose(logInfo);
//     res.status(httpCode).send(result);
//   }
// };

// export const getUserLoans = async (req: Request, res: Response) => {
//   const logInfo = logStart("users/controller.ts", "getUserInvestments");
//   const body = req.body as IGetUserLoans_req;
//   let httpCode = 202;
//   let result: IGetUserLoans_res = {
//     message: "ERROR: can't retreive your user info",
//   };

//   try {
//     /* const userDB = await ExtUser.findOne({account: body.senderAccount});
//     if (!userDB || !userDB.account) {
//       result.message = "ERROR: cannot find user with account '" + body.senderAccount + "' in database";
//       throw new Error(`cannot find user with account '${body.senderAccount}' in database`);
//     } */
//     const paap = await getPaapInstance();
//     const userAddress = (await callStatic(
//       paap,
//       "getMyAddress",
//       body.senderAccount
//     )) as string;
//     if (!userAddress) {
//       result.message =
//         "ERROR: cannot find user with account '" +
//         body.senderAccount +
//         "' in blockchain";
//       throw new Error(
//         `cannot find user with account '${body.senderAccount}' in blockchain`
//       );
//     }
//     let userInstance = await getUserInstance(userAddress);
//     const basicInfo = await callStatic(userInstance, "get", userAddress);
//     if (basicInfo._rol == "borrower") {
//       const userLoans = await getLoans(userInstance, body.senderAccount);
//       if (!userLoans) {
//         throw new Error(`cannot get user info from getLoans()`);
//       }
//       logger.info(
//         ` ${logInfo.instance} Loans '${userLoans}' information retreived successfully`
//       );

//       httpCode = 200; //OK
//       result.loans = userLoans;
//       result.message = "User's info retreived successfully";
//     } else {
//       throw new Error(`Bad rol info retreived from blockchain`);
//     }
//   } catch (error) {
//     logger.error(
//       ` ${logInfo.instance} can't retreive your user unfo. ${error}`
//     );
//   } finally {
//     logClose(logInfo);
//     res.status(httpCode).send(result);
//   }
// };

// //update user

// export const updateUser = async (req: Request, res: Response) => {
//   const logInfo = logStart("users/controller.ts", "getUsers");
//   const body: IUpdateUser_req = req.body;
//   let httpCode = 202;
//   const result: IUpdateUser_res = {
//     message: "ERROR: Something went wrong updating user",
//   };

//   try {

//     // Get all the external users data from DB
//     let user = await ExtUser.updateOne({"userAddress":body.userAddress},{$set:
//     {"nombre": body.nombre, 
//       "apellidos": body.apellidos, 
//       "direccion": body.direccion,
//       "dni": body.dni
//     }});
//     // Get all the user addresses from BC
//     if(!user){
//       logger.error(
//         ` ${logInfo.instance} ERROR: Error updating user`
//       );
//       throw new Error(
//         `account '${body.senderAccount}' Error updating user`
//       );
//     }
//     logger.info(
//       ` User updated successfully`
//     );
//     result.message = "User updated successfully";
//     httpCode = 200; //OK
//   } catch (error) {
//     logger.error(
//       ` ${logInfo.instance} ERROR: Something went wrong updating user ${error}`
//     );
//   } finally {
//     logClose(logInfo);
//     res.status(httpCode).send(result);
//   }
// };

// //delete user

// export const deleteUser = async (req: Request, res: Response) => {
//   const logInfo = logStart("users/controller.ts", "getUsers");
//   const body: IDeleteUser_req = req.body;
//   let httpCode = 202;
//   const result: IDeleteUser_res = {
//     message: "ERROR: Something went wrong deleting user",
//   };

//   try {
//     const address = body.userAddress;
//     const userInstance = getUserInstance(address);
//     if (isAdmin(req.body.senderAccount)) {
//       const adminRes = await isAdmin(req.body.senderAccount);
//       if (!adminRes || !adminRes.isAdmin || !adminRes.admin) {
//         result.message =
//           "ERROR: account address is not admin. Must be admin to deploy PAAP";
//         throw new Error(
//           `account address is not admin. Must be admin to deploy PAAP`
//         );
//       }
//       let admin = adminRes.admin;
//       // Unlocks admin's account
//       const unlockRes = await unlockAccount(
//         admin.account,
//         await decrypt(admin.accPass)
//       );
//       if (!unlockRes || !unlockRes.unlocked) {
//         result.message =
//           "ERROR: cannot unlock the admin account... So wierd.. check DB??";
//         throw new Error(
//           "cannot unlock the admin account... So wierd.. check DB??"
//         );
//       }
//       const tx = await sendMethod(await userInstance, "remove",req.body.senderAccount,["I KNOW WHAT I AM DOING"]);
//       if (tx) {
//         httpCode = 201; // Created
//         console.log(tx);
//         result.message = "User deleted successfully";
//       }
//     } else {
//       result.message = "can't find the provided account un DB";
//       console.error("can't find the provided account un DB");
//     }
//     // Get all the external users data from DB
//     let user = await ExtUser.deleteOne({ userAddress:address });
//     // Get all the user addresses from BC
//     if(!user){
//       logger.error(
//         ` ${logInfo.instance} ERROR: Only admin can delete user`
//       );
//       throw new Error(
//         `account '${body.senderAccount}' is not admin. Only admin can delete user`
//       );
//     }
//     logger.info(
//       ` User deleted successfully`
//     );
//     result.message = "User deleted successfully";
//     httpCode = 200; //OK
//   } catch (error) {
//     logger.error(
//       ` ${logInfo.instance} ERROR: Something went wrong retrieving user ${error}`
//     );
//   } finally {
//     logClose(logInfo);
//     res.status(httpCode).send(result);
//   }
// };

// //delete All users

// export const deleteAllUsers = async (req: Request, res: Response) => {
//   const logInfo = logStart("users/controller.ts", "getUsers");
//   const body: IDeleteUser_req = req.body;
//   let httpCode = 202;
//   const result: IDeleteUser_res = {
//     message: "ERROR: Something went wrong deleting user",
//   };

//   try {

//     const adminRes = await isAdmin(body.senderAccount);
//     if (!adminRes || !adminRes.admin) {
//       result.message =
//         "ERROR: account provided is not admin. " + "Only admin can delete Users";
//       throw new Error(
//         `account '${body.senderAccount}' is not admin. Only admin can delete Users`
//       );
//     }
//     // Get all the external users data from DB
//     let user = await ExtUser.deleteMany({});
//     // Get all the user addresses from BC
//     if(!user){
//       logger.error(
//         ` ${logInfo.instance} ERROR: Only admin can delete user`
//       );
//       throw new Error(
//         `account '${body.senderAccount}' is not admin. Only admin can delete user`
//       );
//     }
//     logger.info(
//       ` Users deleted successfully`
//     );
//     result.message = "Users deleted successfully";
//     httpCode = 200; //OK
//   } catch (error) {
//     logger.error(
//       ` ${logInfo.instance} ERROR: Something went wrong retrieving user ${error}`
//     );
//   } finally {
//     logClose(logInfo);
//     res.status(httpCode).send(result);
//   }
// };

// // Non HTTP methods

// const getUser = async (address: string, from: string) => {
//   const logInfo = logStart("users/controller.ts", "getUser");
//   let result: IUser | undefined;
//   try {
//     //async
//     // -- get user's contract instance
//     const userInstance = getUserInstance(address);
//     // -- check user by it's SC User address. Notice that 'from' can be Admin
//     const userDB = ExtUser.findOne({ userAddress: address });

//     if (!(await userInstance) || !(await userInstance).address) {
//       throw new Error(`User SC '${address}' cannot be found in blockchain`);
//     }
//     if (!(await userDB) || !(await userDB)!.account) {
//       throw new Error(`cannot find user with account '${from}' in database`);
//     }
    
//     const basicInfo = await callStatic(await userInstance, "get", from);
//     result = {
//       owner: basicInfo._owner,
//       address: basicInfo._userAddress,
//       username: basicInfo._username,
//       password: basicInfo._password,
//       rol: basicInfo._rol,
//       nombre: (await userDB)?.nombre,
//       apellidos: (await userDB)?.apellidos,
//       direccion: (await userDB)?.direccion,
//       dni: (await userDB)?.dni,
//       balance: (await userDB)?.balance,
//       tokenBalance: (await toNumber(basicInfo._tokenBalance)) as number,
//       creationDate: new Date(basicInfo._creationDate * 1000),
//     };
//     if (!result || !result.address) {
//       throw new Error(`Bad basic info retreived from blockchain`);
//     }
//     if (result.rol == "borrower") {
//       const loanAddress = await callStatic(
//         await userInstance,
//         "getLoans",
//         from
//       );
//       logger.trace(
//         ` ${logInfo.instance} Found ${loanAddress.length} loans in total for user with address '${address}'`
//       );
//       const loans = await getLoansInt(loanAddress, from);
//       result.loans = loans;
//     } else if (result.rol == "investor") {
//       const investments = await getInvestments(await userInstance, from);
//       result.investments = investments;
//     } else {
//       throw new Error(`Bad rol info retreived from blockchain`);
//     }
//   } catch (error) {
//     logger.error(
//       ` ${logInfo.instance} can't retreive user unfo. ${error.stack}`
//     );
//   } finally {
//     logClose(logInfo);
//     return result;
//   }
// };

// const getInvestments = async (userInstance: Contract, from: string) => {
//   try {
//     const length = await callStatic(userInstance, "getInvestmentsLength", from);
//     const investments: Promise<IInvestment>[] = [];
//     for (let index = 0; index < length; index++) {
//       investments.push(getInvestment(userInstance, index, from));
//     }
//     return await Promise.all(investments);
//   } catch (error) {
//     logger.error(`ERROR: cannot get investments. ${error}`);
//   }
// };

// const getInvestment = async (
//   userInstance: Contract,
//   id: number,
//   from: string
// ) => {
//   const investment = await callStatic(userInstance, "getInvestment", from, id);
//   return {
//     loanAddress: investment._loanAddress,
//     amount: await toNumber(investment._amount),
//     interest: investment._interest,
//     date: await toDate(investment._date),
//   } as IInvestment;
// };

// const getLoans = async (userInstance: Contract, from: string) => {
//   const addresses = await callStatic(userInstance, "getLoans", from);
//   return await getLoansInt(addresses, from);
// };
