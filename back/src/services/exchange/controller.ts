import { BigNumber } from "ethers";
import { Request, Response } from "express";
import {
  GAS_OPT,
  iobManager,
  myToken,
  retrieveWallet,
  toBigNum,
  toNumber,
} from "../../middleware/blockchain";
import { logClose, logger, logStart } from "../../middleware/logger";
import { IDeposit_req, IDeposit_res } from "../../models/Exchange";
import ExtUser, { IExtUser } from "../../models/ExtUser";
import { Constants } from "../../utils/config";

/**
 * @title Exchange Simulator.
 */
/**
 * @title Deposit
 * @dev   Function that makes a transfer of amount paap from the account 0 to account and removes
 *        the same amount from the balance of the bank account. Should have enough balance in the
 *        external bank account to make the transfer.
 */
export const depositTx = async (req: Request, res: Response) => {
  const logInfo = logStart("exchange/constroller.ts", "deposit");
  const body: IDeposit_req = req.body;
  let httpCode = 202;
  let result: IDeposit_res = {
    message: "ERROR: can't complete requested deposit",
  };
  try {
    // async
    // Get admin Wallet
    const admin = retrieveWallet(Constants.ADMIN_PATH, Constants.ADMIN_PASSWORD);
    // Get user external to get balance (bank balance)
    const userDB = ExtUser.findOne({ owner: body.senderAccount }) as Promise<IExtUser>;
    const tokenBalance = myToken!.callStatic.balanceOf(body.senderAccount);

    const iobManagerAdmin = iobManager!.connect((await admin)!);
    const userBC = await iobManagerAdmin.callStatic.getUserByOwner(body.senderAccount);
    if (!userBC || !userBC.id) {
      result.message = result.message.concat(". Cannot find user for this account");
      throw new Error(`User not found in blockchain for this owner account`);
    }
    if (!(await userDB) || !(await userDB)?.id) {
      result.message = result.message.concat(". Cannot find user for this account");
      throw new Error(`User not found in database for this owner account`);
    }
    // user found and OK
    if (!((await userDB).balance > body.amount)) {
      result.message = result.message.concat(". Amount to deposit is lower than bank's balance");
      throw new Error(`Amount to deposit is lower than bank's balance`);
    }

    const depositUnsTx = await iobManagerAdmin.populateTransaction.deposit(
      userBC.id,
      await toBigNum(body.amount),
      GAS_OPT
    );
    // check
    if (!depositUnsTx || depositUnsTx.data) {
      result.message = result.message.concat(". Error creating unsigned transaction");
      throw new Error(`Creating deposit unsigned transaction`);
    }
    //OK
    logger.info(` ${logInfo.instance} Deposit unsigned transaction created successfully`);

    result.depositUnsignedTx = depositUnsTx;
    result.toAccount = userBC.owner;
    result.fromAccount = iobManager?.address;
    result.bankBalance = (await userDB).balance;
    result.tokenBalance = (await toNumber(await tokenBalance)) as number;
    result.message = `Deposit unsigned transaction created successfully.
    WARNING: balances are current values before the transaction is executed.
    WARNING: you need to send the signed Transaction using POST /tx-proxy/send route.`;
    httpCode = 200;
  } catch (error) {
    logger.error(
      ` ${logInfo.instance} Something happened when trying to deposit ${body.amount}. ${error.stack}`
    );
  } finally {
    logClose(logInfo);
    res.send(result).status(httpCode);
  }
};

// NON HTTP Methods
export const deposit = async (recipient: string, amount: BigNumber) => {
  const logInfo = logStart("exchange/controller.ts", "deposit", "info");
  try {

    
    /////////////////////////////////
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