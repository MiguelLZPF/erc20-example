import { encryptHash } from "../../middleware/auth";
import { iobManager, GAS_OPT } from "../../middleware/blockchain";
import { logStart, logger, logClose } from "../../middleware/logger";
import { ISignUp_res } from "../../models/Auth";
import ExtUser, { IExtUser } from "../../models/ExtUser";
import { ISendTx_req } from "../../models/TxProxy";

export const sendTx = async (req: Request, res: Response) => {
  const logInfo = logStart("authentication/controller.ts", "signUp");
  const body = req.body as ISendTx_req;
  let httpCode = 202;
  let result: ISignUp_res = {
    created: false,
    message: `ERROR: cannot create new User: ${body.username}`,
  };

  try {
    // async flows
    // -- encrypt(hash("password"))
    const encHashPass = encryptHash(body.password);
    // -- end
    // user DB object
    const userDB = await ExtUser.findOne({ username: body.username });
    if (userDB) {
      // User already created in DB
      // -- check if created in blockchain as well
      const userBC = await iobManager?.callStatic.getMyUser(GAS_OPT);
      if (!userBC || !userBC.id) {
        result.message = "ERROR: user is registered in DB but not in Blockchain";
        throw new Error("User is registered in DB but not in Blockchain");
      }
      // -- user created in Blockchian and DB
      logger.info(
        ` ${logInfo.instance} User '${userDB.username}' already created in blockchain and database`
      );
      if (userBC.id != userDB.id) {
        result.message = "ERROR: user SC address missmatch from DB and Blockchain";
        throw new Error("user SC address missmatch from DB and Blockchain");
      }
      httpCode = 200;
      result = {
        created: true,
        message: "WARN: User '" + body.username + "' alrready created",
        userId: userBC.id,
      };
      // -- END
    } else {
      // if no user, create new
      logger.info(
        ` ${logInfo.instance} User '${body.username}' not found in database, creating new one`
      );
      // No user in DB, create a new one
      // New User in BC and save in DB
      logger.debug(` ${logInfo.instance} Creating new user...`);
      // -- generate new user unsigned transaction
      const newUserUnsTx = await iobManager?.populateTransaction.newUser(
        body.username,
        await encHashPass
      );
      if (!newUserUnsTx) {
        result.message = "ERROR: bad unsigned TX creation";
        throw new Error(`Unsigned TX is undefined. Bad unsigned TX creation`);
      }
      newUserUnsTx.from = body.senderAccount;
      // -- Data Base wihout BC ID
      const extUser = new ExtUser({
        owner: body.senderAccount,
        username: body.username,
        balance: 10000, // TEST environment
      });
      await extUser.save();
      // check user saved in database
      const userDB = (await ExtUser.findOne({ username: extUser.username })) as IExtUser;
      if (!userDB || !userDB.username) {
        result.message = "ERROR: user not saved in DB";
        throw new Error(`Cannot find user in database. Bad user creation in DB`);
      }
      logger.debug(` ${logInfo.instance} User saved in database`);
      // -- END
      httpCode = 201;
      result = {
        created: true,
        message:
          "User registered successfully in the systems DB. WARNING: ypu need to send the signed Transaction using /tx-proxy/send/newUser route",
        unsignedTx: newUserUnsTx,
      };
    }
  } catch (error) {
    logger.error(` ${logInfo.instance} ERROR Creating new User "${body.username}". ${error.stack}`);
  } finally {
    logClose(logInfo);
    res.status(httpCode).send(result);
  }
};