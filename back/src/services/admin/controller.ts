import { Request, Response } from "express";
import * as fs from "async-file";
import axios, { AxiosResponse } from "axios";
import Admin, {
  IAdminUpdate_req,
  IAdminUpdate_res,
  IDeployPAAP_req,
  IDeployPAAP_res,
  IInitialize_res,
  IAddAdmin_req,
  IAddAdmin_res,
  IRemoveAdmin_req,
  IRemoveAdmin_res,
  IAdmin,
  IInitialize_req,
} from "../../models/Admin";
import { isAdmin } from "../authentication/controller";
import { isAddress } from "ethers/lib/utils";
import { Contract } from "ethers";
import {
  hash,
  encryptHash,
  decrypt,
  generateRandom,
} from "../../middleware/auth";
import {
  newAccount,
  unlockAccount,
  getPaapInstance,
  deployTokenContract,
  deployPAAPContract,
  checkEventInBlock,
  provider,
  sendMethod,
  TransactionReceipt,
  isDelegateAcc,
} from "../../middleware/blockchain";
import { logStart, logClose, logger, logObject } from "../../middleware/logger";
import ExtUser from "../../models/ExtUser";
import { IAdminLogin_req, IAdminLogin_res } from "../../models/Auth";
import { DocumentQuery } from "mongoose";
import { Constants, Variables } from "../../utils/config";

export const initialize = async (req: Request, res: Response) => {
  const logInfo = logStart("admin/controller.ts", "initialize");
  let body = req.body as IInitialize_req;
  let httpCode = 202;
  let result: IInitialize_res = {
    initialized: false,
    message: "ERROR: couldn't initialice the DB",
  };
  try {
    // get admin that alrready in
    let oldAdmin:
      | DocumentQuery<IAdmin | null, IAdmin, {}>
      | IAdmin
      | null = Admin.findOne({ account: body.account });
    const encPass = encryptHash("admin");
    // rand password to unlock account
    const randPass = await generateRandom("random1234");
    const hashRandPass = hash(randPass);
    const encRandPass = encryptHash(randPass);
    let account: string | Promise<string | undefined>;
    // If account in body, use it, else create new
    oldAdmin = await oldAdmin;
    let initAdmin;
    if (
      body.account &&
      isAddress(body.account) &&
      oldAdmin &&
      (await isDelegateAcc(body.account))
    ) {
      // account in body, found in DB and in blockchain
      logger.debug(
        ` ${logInfo.instance} admin found from given account, keeping admin '${oldAdmin.username}'`
      );
      // Insert previous admin user in mongo DB
      //initAdmin = oldAdmin;
      initAdmin = new Admin({
        username: oldAdmin.username,
        password: oldAdmin.password,
        account: oldAdmin.account,
        accPass: oldAdmin.accPass,
      });
    } else {
      account = newAccount(await hashRandPass);
      // Insert default admin user in mongo DB
      initAdmin = new Admin({
        username: Constants.DEFAULT_ADMIN,
        password: await encPass,
        account: await account,
        accPass: await encRandPass,
      });
    }
    // Delete admins in DB
    logger.debug(
      ` ${logInfo.instance} Deleting all admin DB instances: ${logObject(
        await Admin.deleteMany({})
      )}`
    );
    // Delete users in DB
    logger.debug(
      ` ${logInfo.instance} Deleting all users DB instances: ${logObject(
        await ExtUser.deleteMany({})
      )}`
    );
    // create new admin in DB
    const admin = (await initAdmin.save())!;
    logger.info(` ${logInfo.instance} Initial Administrator saved in DB: ${admin.username}`);
    if (!admin || !admin.account) {
      result.message = "ERROR: admin not saved in DB";
      throw new Error(`admin not saved in DB`);
    }

    Variables.TOKEN_ADDRESS = "";
    Variables.PAAP_ADDRESS = "";

    httpCode = 201; // Created
    result = {
      initialized: true,
      adminUsername: admin!.username,
      message:
        "Database correctly initializated. You should change the " +
        "default Admin password using Update admin: PUT /paap/admins/:username",
    };
  } catch (error) {
    logger.error(` ${logInfo.instance} ERROR initializating: ${error.trace}`);
    logger.debug(
      ` ${logInfo.instance} Deleting all admin DB instances: ${logObject(
        await Admin.deleteMany({})
      )}`
    );
    // Users not nedded
  } finally {
    logClose(logInfo);
    res.status(httpCode).send(result);
  }
};

export const deployPaap = async (req: Request, res: Response) => {
  const logInfo = logStart("admin/controller.ts", "deployPaap");
  const body: IDeployPAAP_req = req.body;
  let httpCode = 202;
  let result: IDeployPAAP_res = {
    deployed: false,
    message: "ERROR: cannot deploy the PAAP Smart Contract",
  };

  try {
    // check if admin is valid and retreive it
    // @notice isAdmin() also checks that account address is ok
    const adminRes = await isAdmin(body.senderAccount);
    if (!adminRes || !adminRes.isAdmin || !adminRes.admin) {
      result.message =
        "ERROR: account address is not admin. Must be admin to deploy PAAP";
      throw new Error(
        `account address is not admin. Must be admin to deploy PAAP`
      );
    }
    let admin = adminRes.admin;
    const nonce = provider.getSigner(admin.account).getTransactionCount();
    // Unlocks admin's account
    const unlockRes = await unlockAccount(
      admin.account,
      await decrypt(admin.accPass)
    );
    if (!unlockRes || !unlockRes.unlocked) {
      result.message =
        "ERROR: cannot unlock the admin account... So wierd.. check DB??";
      throw new Error(
        "cannot unlock the admin account... So wierd.. check DB??"
      );
    }
    logger.info(
      ` ${logInfo.instance} Account ${admin.account} successfully unlocked`
    );
    // deploy PaapToken.sol and PAAP.sol
    // -- are deployed as admin, so the response is a Contract
    let token = deployTokenContract(admin.account) as Promise<Contract>;
    // -- added nonce offset to avoid async nonce problems
    let paap = deployPAAPContract(admin.account) as Promise<Contract>;
    // init PaapToken.sol and PAAP.sol
    const initTokenReceipt = sendMethod(
      await token,
      "initialize",
      admin.account,
      undefined,
      (await nonce) + 2
    ) as Promise<TransactionReceipt>;
    const initPAAPReceipt = sendMethod(
      await paap,
      "initialize",
      admin.account,
      [(await token).address],
      (await nonce) + 3
    ) as Promise<TransactionReceipt>;

    // check if the initialization event is present in tx block
    const tokenInitialized = checkEventInBlock(
      await token,
      "TokenInitialized",
      [(await token).address, admin.account],
      (await initTokenReceipt).blockNumber,
      (await initTokenReceipt).blockNumber
    );
    const paapInitialized = checkEventInBlock(
      await paap,
      "PAAPInitialized",
      [(await paap).address, admin.account, (await token).address],
      (await initPAAPReceipt).blockNumber,
      (await initPAAPReceipt).blockNumber
    );
    if (!(await tokenInitialized)) {
      result.message = "ERROR: token initialization failed";
      throw new Error(`token initialization failed, cannot find init event`);
    }
    if (!(await paapInitialized)) {
      result.message = "ERROR: paap initialization failed";
      throw new Error(`paap initialization failed, cannot find init event`);
    }
    logger.info(` ${
      logInfo.instance
    } Paap Token and Main Contracts deployed at addresses:
      Token: ${(await token).address}  
      PAAP: ${(await paap).address}`);

    Variables.TOKEN_ADDRESS = (await token).address;
    Variables.PAAP_ADDRESS = (await paap).address;

    logger.info(` ${logInfo.instance} Token and PAAP addresses variables set:
      Token: ${Variables.TOKEN_ADDRESS}  
      PAAP: ${Variables.TOKEN_ADDRESS}`);

    // store addresses in .persistent.json
    await fs.writeFile(
      "./.persistent.json",
      `{"TOKEN_ADDRESS": ${JSON.stringify(
        Variables.TOKEN_ADDRESS
      )}, "PAAP_ADDRESS": ${JSON.stringify(Variables.PAAP_ADDRESS)}}`
    );

    // TODO: Check if inits OK (EVENTS??)
    result = {
      deployed: true,
      message: "PAAP Smart Contract successfully deployed",
      tokenAddress: (await token).address,
      paapAddress: (await paap).address,
    };
    httpCode = 201; // Created
    logger.info(
      ` ${logInfo.instance} PAAP Smart Contract succesfully ` +
        `deployed on address: ${(await paap).address}`
    );
  } catch (error) {
    logger.error(
      ` ${logInfo.instance} ERROR deploying PAAP Smart Contract: ${error.stack}`
    );
  } finally {
    logClose(logInfo);
    res.status(httpCode).send(result);
  }
};

export const addAdmin = async (req: Request, res: Response) => {
  const logInfo = logStart("admin/controller.ts", "addAdmin");
  const body: IAddAdmin_req = req.body;
  let httpCode = 202;
  let result: IAddAdmin_res = {
    created: false,
    message: "ERROR: couldn't create the new admin user",
  };
  let leftovers: any = {
    need: undefined,
  };

  try {
    //async Flow
    const paap = getPaapInstance();
    const hashedPass = hash(body.newPassword);
    const encHashPass = encryptHash(body.newPassword);

    // check if sender is admin
    const adminRes = isAdmin(body.senderAccount);
    const alreadyAdmin = Admin.findOne({ username: body.newUsername });
    if (
      !(await adminRes) ||
      !(await adminRes).isAdmin ||
      !(await adminRes).admin
    ) {
      result.message = "ERROR: sender's account is not admin";
      throw new Error(`sender's account is not admin`);
    }
    if ((await alreadyAdmin) || (await alreadyAdmin)?.account) {
      result.message = "ERROR: new username is already an admin";
      throw new Error(`username not available, already an admin`);
    }
    leftovers.need = true; // if fails rm trash
    const sender = (await adminRes).admin!;
    const senderPass = await decrypt(sender.accPass);
    await unlockAccount(sender.account, senderPass);
    leftovers.sender = sender;
    const newAccAddr = await newAccount(await hashedPass);
    leftovers.newAccAddr = newAccAddr;
    if (!newAccAddr) {
      result.message = "ERROR: cannot create new account";
      throw new Error(`cannot create new account`);
    }
    const receiptTx = await sendMethod(await paap, "addAdmin", sender.account, [
      newAccAddr,
    ]);
    let newAdmin = new Admin({
      username: body.newUsername,
      password: await encHashPass,
      account: newAccAddr,
      accPass: await encHashPass,
    });
    leftovers.newAdmin = newAdmin;
    if (!receiptTx) {
      result.message = "ERROR: sending addAdmin Tx to blockchain";
      throw new Error(`send addAdmin tx failed, bad receiptTx`);
    }
    const adminAdded = checkEventInBlock(
      await paap,
      "AdminAdded",
      [newAccAddr, sender.account],
      receiptTx.blockNumber,
      receiptTx.blockNumber
    );
    newAdmin = (await newAdmin.save())!;
    if (!(await adminAdded)) {
      result.message = "ERROR: adding admin in blockchain";
      throw new Error(`adding admin in blockchain`);
    }
    if (!newAdmin || !newAdmin._id) {
      result.message = "ERROR: adding admin in database";
      throw new Error(`adding admin in database`);
    }

    //OK
    httpCode = 201;
    result.created = true;
    result.message = "Admin user created successfully";
    result.username = newAdmin.username;
    result.account = newAdmin.account;
  } catch (error) {
    logger.error(
      ` ${logInfo.instance} ERROR creating new Admin User. ${error.stack}`
    );
    // Remove leftovers
    if (leftovers && leftovers.need) {
      if (leftovers.paap && leftovers.sender && leftovers.newAccAddr) {
        logger.warn(` ${logInfo.instance} Removing Blockchain's leftovers...`);
        const receiptTx = (await sendMethod(
          await leftovers.paap,
          "removeAdmin",
          leftovers.sender.account,
          [leftovers.newAccAddr]
        )) as TransactionReceipt;
        logger.warn(
          ` ${logInfo.instance} ... removed: ${checkEventInBlock(
            await leftovers.paap,
            "AdminRemoved",
            [leftovers.newAccAddr, leftovers.sender.account],
            receiptTx.blockNumber,
            receiptTx.blockNumber
          )}`
        );
      }
      if (leftovers.newAdmin) {
        logger.warn(
          ` ${logInfo.instance} Removing DB leftovers ${logObject(
            await Admin.deleteOne({
              account: leftovers.newAdmin.account,
            })
          )}`
        );
      }
    }
  } finally {
    logClose(logInfo);
    res.status(httpCode).send(result);
  }
};

export const removeAdmin = async (req: Request, res: Response) => {
  const logInfo = logStart("admin/controller.ts", "removeAdmin");
  const body: IRemoveAdmin_req = req.body;
  let httpCode = 202;
  let result: IRemoveAdmin_res = {
    removed: false,
    message: "ERROR: couldn't remove the admin user",
  };

  try {
    //async Flow
    const paap = getPaapInstance();
    let adminToRm:
      | DocumentQuery<IAdmin | null, IAdmin, {}>
      | IAdmin = Admin.findOne({ username: body.username });

    const adminRes = await isAdmin(body.senderAccount);
    if (!adminRes || !adminRes.isAdmin || !adminRes.admin) {
      result.message = "ERROR: sender's account is not admin";
      throw new Error(`sender's account is not admin`);
    }
    const sender = adminRes.admin;
    const senderAccPass = decrypt(sender.accPass);
    if (!(await adminToRm) || !(await adminToRm)?._id) {
      result.message = "ERROR: cannot find admin to remove";
      throw new Error(`cannot find admin to remove`);
    }
    adminToRm = (await adminToRm)!;
    if (sender.account == adminToRm.account) {
      result.message = "ERROR: account to rm is the same as sender's account";
      throw new Error(`account to rm is the same as sender's account`);
    }
    const unlocked = await unlockAccount(sender.account, await senderAccPass);
    if (!unlocked) {
      result.message = "ERROR: cannot unlock senders account";
      throw new Error(`cannot unlock senders account`);
    }
    // Call PAAP.removeAdmin()
    const receiptTx = (await sendMethod(
      await paap,
      "removeAdmin",
      sender.account,
      [adminToRm.account]
    )) as TransactionReceipt;

    const adminRemoved = checkEventInBlock(
      await paap,
      "AdminRemoved",
      [adminToRm.account, sender.account],
      receiptTx.blockNumber,
      receiptTx.blockNumber
    );
    if (!(await adminRemoved)) {
      result.message = "ERROR: removing admin in blockchain";
      throw new Error(`removing admin in blockchain`);
    }
    await Admin.findByIdAndDelete(adminToRm._id);
    const adminFound = await Admin.findById(adminToRm._id);
    if (adminFound && adminFound._id) {
      result.message = "ERROR: admin not removed from database";
      throw new Error(`admin not removed from database`);
    }

    // OK
    httpCode = 200;
    result.removed = true;
    result.message = "Admin user removed successfully";
    result.username = adminToRm.username;
  } catch (error) {
    logger.error(` ${logInfo.instance} ERROR removing Admin User. ${error}`);
  } finally {
    logClose(logInfo);
    res.status(httpCode).send(result);
  }
};

export const adminUpdate = async (req: Request, res: Response) => {
  const logInfo = logStart("admin/controller.ts", "adminUpdate");
  const body: IAdminUpdate_req = req.body;
  let httpCode = 202;
  let result: IAdminUpdate_res = {
    updated: false,
    message: "ERROR: couldn't update the admin user",
  };

  try {
    // async flows
    const hashedPassword = hash(body.password);
    let newHashedPass,
      newEncHasPass: Promise<string> | undefined = undefined;
    if (body.newPassword) {
      newEncHasPass = encryptHash(body.newPassword);
      newHashedPass = hash(body.newPassword);
    }

    const actualAdmin = await Admin.findOne({ username: body.username });
    if (!actualAdmin) {
      result.message = "ERROR: admin not found";
      throw new Error("admin not found");
    }
    logger.debug(
      ` ${logInfo.instance} Admin found in database, sending login request to ${req.protocol}://${req.headers.host}${Constants.ROOT}/admins/login...`
    );
    //Admin login. Re-use the admin login functionality
    let loginRes = (
      await axios.post<IAdminLogin_req, AxiosResponse<IAdminLogin_res>>(
        `${req.protocol}://${req.headers.host}${Constants.ROOT}/admins/login`,
        { username: body.username, password: body.password }
      )
    ).data;
    if (!loginRes || !loginRes.login) {
      result.message = loginRes.message;
      throw new Error(`login error. ${loginRes.message}`);
    }
    logger.debug(
      ` ${logInfo.instance} Admin login successfull, saving changes in database...`
    );
    // check if wants a new account
    let account: string | undefined;
    if (body.newAccount) {
      account = body.newPassword
        ? await newAccount((await newHashedPass)!)
        : await newAccount(await hashedPassword);
      logger.info(
        ` ${logInfo.instance} New account generated for admin "${body.username}" : ${account}`
      );
      result.message =
        "New account generated for admin '" + body.username + "'";
    } else {
      logger.info(
        ` ${logInfo.instance} Using the previous account, only change the username and/or pass`
      );
      result.message =
        "Using the previous account, only changed the username and/or pass";
    }
    // Update Database
    await Admin.findByIdAndUpdate(actualAdmin._id, {
      username: body.newUsername ? body.newUsername : actualAdmin.username,
      password: body.newPassword
        ? (await newEncHasPass)!
        : actualAdmin.password,
      account: body.newAccount ? account! : actualAdmin.account,
      accPass: body.newAccount ? (await newEncHasPass)! : actualAdmin.accPass,
    });
    const newAdmin = await Admin.findById(actualAdmin._id);
    // Check if Admin is updated in DB
    if (!newAdmin || !newAdmin._id) {
      result.message = "ERROR: bad databse write in Admin";
      throw new Error(`bad database write in Admin`);
    }
    logger.debug(
      ` ${logInfo.instance} Admin updated successfully, sending response...`
    );
    logger.info(
      ` ${logInfo.instance} Admin Update request received, updated successfully :-)`
    );
    // sending successfull result response
    httpCode = 200; // OK
    result.updated = true;
    result.username = newAdmin.username;
    result.account = newAdmin.account;
    result.message = result.message.concat(". Admin user sucessfully updated");
    logger.trace(
      ` ${logInfo.instance}
      Request.body: 
      ${logObject(body)}
      Result: 
      ${logObject(result)}`
    );
  } catch (error) {
    logger.error(
      ` ${logInfo.instance} ERROR updating Admin User. ${error.stack}`
    );
  }
  logClose(logInfo);
  res.status(httpCode).send(result);
};

// TODO: IMPLEMENT AT THE END
export const updatePaap = async () => {};
