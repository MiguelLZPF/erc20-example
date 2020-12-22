import { Request, Response } from "express";
import * as jwt from "jsonwebtoken";
import { Constants, Variables } from "../../utils/config";
import Admin, { IAdmin } from "../../models/Admin";
import {
  getPaapInstance,
  callStatic,
  newAccount,
  getUserInstance,
  deployUserContract,
  unlockAccount,
  ZERO_ADDRESS,
  checkEventInBlock,
  sendMethod,
  TransactionReceipt,
} from "../../middleware/blockchain";
import {
  IToken,
  ITokenData,
  IisAdmin_res,
  ISignUp_req,
  ISignUp_res,
  ILogin_req,
  ILogin_res,
  IAdminLogin_req,
  IAdminLogin_res,
  ITokenPayload,
} from "../../models/Auth";
import ExtUser, { IExtUser } from "../../models/ExtUser";
import { Contract } from "ethers";
import { hash, encryptHash, decrypt, encrypt } from "../../middleware/auth";
import { isAddress } from "ethers/lib/utils";
import { logger, logStart, logClose, logObject } from "../../middleware/logger";

export const signUp = async (req: Request, res: Response) => {
  const logInfo = logStart("authentication/controller.ts", "signUp");
  const body: ISignUp_req = req.body;
  let httpCode = 202;
  let result: ISignUp_res = {
    created: false,
    message: `ERROR: cannot create new User: ${body.username}`,
  };
  let leftovers: any = {
    need: undefined,
  };

  try {
    // async flows
    // -- encrypt(hash("password"))
    const encHashPass = encryptHash(body.password);
    const hashedPass = hash(body.password);
    // -- check if admin and returns admin DB object
    const adminRes = isAdmin(body.senderAccount);
    let paap = getPaapInstance();
    // -- end
    // user DB object
    const userDB = await ExtUser.findOne({ username: body.username });
    if (userDB) {
      // User already created in DB
      // -- check if created in blockchain as well
      const userAddr: string = await callStatic(
        await paap,
        "getMyAddress",
        userDB.account
      );
      if (!userAddr || userAddr == ZERO_ADDRESS) {
        result.message =
          "ERROR: user is registered in DB but not in Blockchain";
        throw new Error("User is registered in DB but not in Blockchain");
      }
      // -- user created in Blockchian and DB
      logger.info(
        ` ${logInfo.instance} User '${userDB.username}' already created in blockchain and database`
      );
      if (userAddr != userDB.userAddress) {
        result.message =
          "ERROR: user SC address missmatch from DB and Blockchain";
        throw new Error("user SC address missmatch from DB and Blockchain");
      }
      httpCode = 200;
      result = {
        created: true,
        message: "WARN: User '" + body.username + "' alrready created",
        userAddress: userAddr,
      };
      // -- END
    } else {
      if (!(await adminRes) || !(await adminRes).isAdmin) {
        result.message = "ERROR: You are no admin, you cannot create new users";
        throw new Error("Sender is not admin, cannot create new users");
      }
      logger.info(
        ` ${logInfo.instance} User '${body.username}' not found in databse`
      );
      const admin = (await adminRes).admin!;
      // async decrypt
      const adminAccPass = decrypt(admin.accPass);
      // No user in DB, create a new one
      // -- DB definition
      let extUser: IExtUser;
      if (body.account) {
        // Account already created externally
        extUser = new ExtUser({
          username: body.username,
          account: body.account,
          nombre: body.nombre,
          apellidos: body.apellidos,
          direccion: body.direccion,
          dni: body.dni,
          balance: 10000, // TEST environment
        });
      } else {
        // Need to create a new delegate account
        body.account = await newAccount(await hashedPass);
        if (!body.account) {
          result.message = "ERROR Creating Account with web3";
          throw new Error("Creating Account with web3");
        }
        extUser = new ExtUser({
          username: body.username,
          account: body.account,
          nombre: body.nombre,
          apellidos: body.apellidos,
          direccion: body.direccion,
          dni: body.dni,
          accPass: await encHashPass,
          balance: 10000, // TEST environment
        });
      }
      // Deploy User SC and save in DB same time
      // -- unlock admin's account
      const unlocked = await unlockAccount(admin.account, await adminAccPass);
      if (!unlocked) {
        result.message = "ERROR unlocking admin's account";
        throw new Error("Cannot unlock admin's account");
      }
      // To know that is nedded to remove leftovers
      // if something goes wrong
      leftovers.need = true;
      leftovers.admin = admin;
      logger.debug(` ${logInfo.instance} Deploying user contract...`);
      // -- deploy user contract
      const userContract = deployUserContract(admin.account) as Promise<
        Contract
      >;
      leftovers.userContract = userContract;
      // -- while deploying, generate JWToken
      const JWtoken = createToken(body.account);
      // -- initiate user Contract (this is the more time consuming op.)
      let receiptTx = sendMethod(
        await userContract,
        "initialize",
        admin.account, // from
        [
          Variables.PAAP_ADDRESS,
          body.account,
          body.username,
          await encHashPass,
          body.rol,
        ]
      ) as
        | Promise<TransactionReceipt | undefined>
        | TransactionReceipt
        | undefined;
      // -- get deployed User contract's address and save
      // -- user in DB at the same time it's initializating
      logger.debug(` ${logInfo.instance} Saving user in Database...`);
      extUser.userAddress = (await userContract).address;
      await extUser.save();
      leftovers.extUser = extUser;
      // -- END
      // Check saved in blockchain and DB (async)
      // -- user registered event in PAAP contract
      receiptTx = await receiptTx;
      if (!receiptTx) {
        result.message = "ERROR sending transaction to initialize";
        throw new Error("sending transaction to initialize. RespTx not found");
      }
      const userRegistered = checkEventInBlock(
        await paap,
        "UserRegistered",
        [extUser.account, extUser.userAddress],
        receiptTx.blockNumber,
        receiptTx.blockNumber
      );
      // -- user initialized event in User contract
      const userInitialized = checkEventInBlock(
        await userContract,
        "UserInitialized",
        [extUser.account, extUser.userAddress, extUser.username, null],
        receiptTx.blockNumber,
        receiptTx.blockNumber
      );
      // -- user saved in database
      const userDB = ExtUser.findOne({ account: extUser.account });
      if (!(await userRegistered)) {
        result.message = "ERROR: creating user in blockchain";
        throw new Error(
          `"UserRegistered" event not found on init Tx. Bad user creation in Blockchain`
        );
      }
      if (!(await userInitialized)) {
        result.message = "ERROR: creating user in blockchain";
        throw new Error(
          `"UserInitilized" event not found on init Tx. Bad user creation in Blockchain`
        );
      }
      logger.debug(
        ` ${logInfo.instance} Contract Deployed at address: ${extUser.userAddress}`
      );
      if (!(await userDB) || !(await userDB)!.account) {
        result.message = "ERROR: user not saved in DB";
        throw new Error(
          `Cannot find user in database. Bad user creation in DB`
        );
      }
      logger.debug(` ${logInfo.instance} User saved in database`);
      // TODO: delete contract created if something wrong in DB
      // -- END
      httpCode = 201;
      result = {
        created: true,
        message: "User registered successfully in the system",
        userAddress: (await userContract).address,
        token: await JWtoken,
      };
    }
  } catch (error) {
    logger.error(
      ` ${logInfo.instance} ERROR Creating new User "${body.username}". ${error.stack}`
    );
    // Remove leftovers
    // -- leftovers = { need, admin, userContract, extUser }
    if (leftovers && leftovers.need) {
      const admin = leftovers.admin as IAdmin;
      const userContract = await leftovers.userContract;
      // -- remove blockchain user contract
      if (userContract && userContract instanceof Contract) {
        await sendMethod(userContract, "remove", admin.account, [
          "I KNOW WHAT I AM DOING",
        ]);
      }
      if (leftovers.extUser) {
        logger.warn(
          ` ${logInfo.instance} Removing DB leftovers ${logObject(
            await ExtUser.deleteOne({
              account: leftovers.extUser.account,
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

export const login = async (req: Request, res: Response) => {
  const logInfo = logStart("authentication/controller.ts", "login");
  const body: ILogin_req = req.body;
  let httpCode = 202;
  let result: ILogin_res = {
    login: false,
    message:
      "ERROR: something went wrong tring to login with '" + body.username + "'",
  };
  try {
    // Async stuff
    const hashPass = hash(body.password);

    const userDB = await ExtUser.findOne({ username: body.username });
    if (!userDB || !isAddress(userDB.account)) {
      result.message =
        "ERROR: user '" + body.username + "' or password does not match";
      throw new Error(
        `username '${body.username}' not found in DB or account address is not valid`
      );
    }
    const userBC = getUserInstance(userDB.userAddress);
    const token = createToken(userDB.account);

    const passBC = await decrypt(
      await callStatic(await userBC, "getPassword", userDB.account)
    );
    if ((await hashPass) != passBC) {
      result.message =
        "ERROR: user '" + body.username + "' or password does not match";
      throw new Error(`Password stored in BC and password provided does NOT match.
         ParamPass: ${await hashPass} BC Pass: ${passBC}`);
    }
    logger.info(` ${logInfo.instance} Passwords match, sending response`);
    // cookie named Authorization
    res.setHeader(
      "Set-Cookie",
      `Authorization=${(await token).JWToken};` +
        `Max-Age=${(await token).expiresIn}`
    );
    // header Authorization
    res.setHeader("Authorization", (await token).JWToken);
    httpCode = 200; // OK
    result = {
      login: true,
      message: "User '" + body.username + "' logged in successfully",
      token: await token,
    };
  } catch (error) {
    console.error(`ERROR cannot login: ${body.username}. ${error}`);
  } finally {
    logClose(logInfo);
    res.status(httpCode).send(result);
  }
};

export const adminLogin = async (req: Request, res: Response) => {
  const logInfo = logStart("admin/controller.ts", "adminLogin");
  const body: IAdminLogin_req = req.body;
  let httpCode = 202;
  let result: IAdminLogin_res = {
    login: false,
    message: "ERROR: couldn't login with the admin user",
  };

  try {
    // async flows
    const hashedPass = hash(body.password);

    const actualAdmin = await Admin.findOne({ username: body.username });
    if (!actualAdmin || !actualAdmin._id) {
      result.message = "ERROR: admin not found";
      throw new Error(`admin not found with username: ${body.username}`);
    }
    const actualHashPass = decrypt(actualAdmin.password);
    const token = createToken(actualAdmin.account);
    // @notice if found by username there is no need to check if they are equal
    if ((await hashedPass) != (await actualHashPass)) {
      result.message =
        "ERROR: actual admin's username or password does not match";
      throw new Error(
        `Actual admin's password and provided password does not match`
      );
    }
    httpCode = 200;
    res.setHeader(
      "Set-Cookie",
      `Authorization=${(await token).JWToken};` +
        `Max-Age=${(await token).expiresIn}`
    );
    result.login = true;
    result.token = await token;
    result.message = "Admin user login sucessfully";
  } catch (error) {
    logger.error(
      ` ${logInfo.instance} ERROR login with Admin User. ${error.stack}`
    );
  }
  logClose(logInfo);
  res.status(httpCode).send(result);
};

// Non HTTP methods

/**
 * @title Create Token
 * Generates a token temporally valid that stores the User's account address
 * @param account the signed up account
 * @param hours (optional) number of hours to be valid
 */
export const createToken = async (
  account: string,
  hours?: number
): Promise<IToken> => {
  // if (hours) hours, else 24h by default
  const expTime = 60 * 60 * (hours ? hours : 24);
  /**
   * @notice that JW Token payload needs to be an object, so:
   * data is an object with the account that is encrypted and
   * put in the data field of the payload wich can be signed
   * by JWT as an object.
   */
  const data = await encrypt(
    JSON.stringify({
      account: account,
    } as ITokenData)
  );
  const payload = {
    data: data,
  } as ITokenPayload;

  return {
    JWToken: jwt.sign(payload, Constants.JWT_SECRET, {
      expiresIn: expTime,
    }),
    expiresIn: expTime,
  };
};

export const isAdmin = async (account: string) => {
  let result: IisAdmin_res = {
    isAdmin: false,
    message: "ERROR: performing isAdmin check",
  };
  try {
    if (!isAddress(account)) {
      result.message = "ERROR: account provided is not a valid address";
      throw new Error("account provided is not a valid address");
    }
    // look for an admin with the given account
    const admin = await Admin.findOne({ account: account });
    // if no one is found then is not an admin, could be a normal user...
    if (!admin || !admin._id) {
      result.message =
        "ERROR: account provided is not admin. " + "Only admin can see Users";
      throw new Error(
        "account provided is not admin. " + "Only admin can see Users"
      );
    }
    result.isAdmin = true;
    result.admin = admin;
    result.message = "Account is a registered Admin user";
  } catch (error) {
    logger.error(`ERROR: account not valid or not admin. ${error}`);
  }
  return result;
};

export const test = async (req: Request, res: Response) => {
  const paap = await getPaapInstance();
  const filter = paap.filters.AdminAdded(null, null);
  paap.on(filter, async (par0, par1, par2) => {
    console.log(`¡¡¡¡¡¡event triggered!!!`);
    console.log(par0, par1, par2);
  });
  res.send("subscribed");
};
