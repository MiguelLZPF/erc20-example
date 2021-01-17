import { Request, Response } from "express";
import * as jwt from "jsonwebtoken";
import { Constants } from "../../utils/config";
import { retrieveWallet, iobManager, GAS_OPT, provider } from "../../middleware/blockchain";
import {
  IToken,
  ITokenData,
  ISignUp_req,
  ISignUp_res,
  ILogin_req,
  ILogin_res,
  ITokenPayload,
} from "../../models/Auth";
import ExtUser, { IExtUser } from "../../models/ExtUser";
import { hash, encryptHash, decrypt, encrypt } from "../../middleware/auth";
import { Bytes, Logger } from "ethers/lib/utils";
import { logger, logStart, logClose, logObject } from "../../middleware/logger";
import { BigNumber } from "ethers";

export const signUp = async (req: Request, res: Response) => {
  const logInfo = logStart("authentication/controller.ts", "signUp");
  const body = req.body as ISignUp_req;
  let httpCode = 202;
  let result: ISignUp_res = {
    message: `ERROR: cannot create new User: ${body.username}`,
  };

  try {
    // async flows
    // -- encrypt(hash("password"))
    const encHashPass = encryptHash(body.password);
    // Get admin Wallet
    const admin = retrieveWallet(Constants.ADMIN_PATH, Constants.ADMIN_PASSWORD);
    // -- end

    // check if the username is already registered
    // check if from account has a user registered
    const checkPreviousBC = Promise.all([
      iobManager!.connect((await admin)!).getUserByName(body.username),
      body.from ? iobManager!.connect(body.from).callStatic.getMyUser() : undefined,
    ]);

    // user DB object
    const userDB = (await ExtUser.findOne({ username: body.username })) as IExtUser;
    if (userDB) {
      // User already created in DB
      // -- user created in Blockchian and DB
      logger.info(
        ` ${logInfo.instance} User '${userDB.username}' already created in blockchain and database`
      );
      // return user data
      httpCode = 200;
      result.message = "WARNING: User '" + body.username + "' alrready created";
      //result.userId = userDB.id;
      // -- END
    } else {
      // if no user, create new
      logger.info(
        ` ${logInfo.instance} User '${body.username}' not found in database, checking blockchain...`
      );

      try {
        const userBC = await checkPreviousBC;
        if (userBC[0].id) {
          result.message = result.message.concat(". Username already used");
          throw new Error(`Username already used`);
        }
        if (userBC[1] && userBC[1].id) {
          result.message = result.message.concat(". From account already have a user registered");
          throw new Error(`From account already have a user registered`);
        }
      } catch (error) {
        if (error.code == -32000) {
          logger.info(
            ` ${logInfo.instance} User '${body.username}' not found in blockchain, generating unsigned Tx...`
          );
        } else {
          error.message = result.message.concat(". Error checking user name");
          throw new Error(`Checking user name: ${error}`);
        }
      }

      // No user in DB, create a new one tx
      // -- generate new user unsigned transaction
      const iobManagerFrom = body.from ? iobManager!.connect(body.from) : iobManager!;
      const newUserUnsTx = await iobManagerFrom.populateTransaction.newUser(
        body.username,
        await encHashPass,
        GAS_OPT
      );
      if (!newUserUnsTx) {
        result.message = "ERROR: bad unsigned TX creation";
        throw new Error(`Unsigned TX is undefined. Bad unsigned TX creation`);
      }
      logger.info(` ${logInfo.instance} New User unsigned transaction created successfully`);
      httpCode = 200;
      result.message =
        "User sign up Tx generated successfully." +
        "WARNING: you need to send the signed Transaction using POST /tx-proxy/send route";
      result.unsignedTx = newUserUnsTx;
    }
  } catch (error) {
    logger.error(` ${logInfo.instance} ERROR Creating new User "${body.username}". ${error.stack}`);
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
    message: "ERROR: something went wrong tring to login with '" + body.username + "'",
  };
  try {
    // Async stuff
    // Get admin Wallet
    const admin = retrieveWallet(Constants.ADMIN_PATH, Constants.ADMIN_PASSWORD);
    const hashPass = hash(body.password);

    const userDB = (await ExtUser.findOne({ username: body.username })) as IExtUser;
    if (!userDB || !userDB.id) {
      result.message = "ERROR: user '" + body.username + "' or password does not match";
      throw new Error(`username '${body.username}' not found in DB`);
    }
    const userBC = await iobManager!
      .connect((await admin)!)
      .callStatic.getUserByName(body.username);
    const token = createToken(userBC.owner);

    const passBC = await decrypt(userBC.password);
    if ((await hashPass) != passBC) {
      result.message = "ERROR: user '" + body.username + "' or password does not match";
      throw new Error(`Password stored in BC and password provided does NOT match.
         ParamPass: ${await hashPass} BC Pass: ${passBC}`);
    }
    logger.info(` ${logInfo.instance} Passwords match, sending response`);
    // cookie named Authorization
    res.setHeader(
      "Set-Cookie",
      `Authorization=${(await token).JWToken};` + `Max-Age=${(await token).expiresIn}`
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

// Non HTTP methods

/**
 * @title Create Token
 * Generates a token temporally valid that stores the User's account address
 * @param account the signed up account
 * @param hours (optional) number of hours to be valid
 */
export const createToken = async (account: string, hours?: number): Promise<IToken> => {
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

export const registerUser = async (id: string | Bytes, name: string, password: string) => {
  const logInfo = logStart("authentication.ts", "storeUser", "info");
  try {
    // Get admin Wallet
    const admin = retrieveWallet(Constants.ADMIN_PATH, Constants.ADMIN_PASSWORD);
    let userDB = ExtUser.findOne({ id: id });
    // call the contract with the admin wallet
    const iobManagerAdmin = iobManager!.connect((await admin)!);
    const userBC = iobManagerAdmin.callStatic.getUser(id);

    if ((await userDB) as IExtUser) {
      // User registred in DB
      if (await userBC) {
        // User registered in DB and BC
        // this case should never happen because this is triggered by an UserCreated event
        throw new Error(`User already registered correctly`);
      } else {
        // User registered in DB but not in BC
        // this case should never happen because this is triggered by an UserCreated event
        await ExtUser.remove({ id: id });
        throw new Error(`User registered in DB but not in BC. Removing data from DB`);
      }
    } else {
      // User is not registered in DB
      // regular use case
      if (!(await userBC)) {
        // user not found in DB
        // this case should never happen because this is triggered by an UserCreated event
        throw new Error(`User not found in Blockchain`);
      } else {
        // regular use case --> UserCreated event, user found un BC and not in DB
        // register User in DB
        const extUser = new ExtUser({
          id: (await userBC).id,
          owner: (await userBC).owner,
          username: (await userBC).name,
          balance: 10000, // TEST environment
        });
        await extUser.save();
        // check all right
        userDB = (await ExtUser.findOne({ id: extUser.id })) as IExtUser;
        if (!userDB || !userDB.id || userDB.id != (await userBC).id) {
          throw new Error(`Cannot check if user is in database`);
        }
        logger.info(` ${logInfo.instance} User with ID: ${userDB.id} registered in database`);
        return true;
      }
    }
  } catch (error) {
    logger.error(` ${logInfo.instance} Registering user in Database. ${error.stack}`);
    return false;
  } finally {
    logClose(logInfo);
  }
};
