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

export const transferTx = async (req: Request, res: Response) => {
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
    if (!(body.amount < ((await toNumber(await tokenBalance))! as number))) {
      result.message = result.message.concat(
        ". Amount to transfer is higher than recipient token's balance"
      );
      throw new Error(`Amount to transfer is higher than recipient token's balance`);
    }

    ////////////////////////////////

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
    // async
    // Get user external to get balance (bank balance)
    const userDB = ExtUser.findOne({ owner: recipient }) as Promise<IExtUser>;
    const tokenBalance = myToken!.callStatic.balanceOf(recipient);

    if (!(await userDB) || !(await userDB).id) {
      throw new Error(`Cannot get user from database`);
    }
    logger.info(` ${logInfo.instance} User ${
      (await userDB).id
    } has made a deposit of ${await toNumber(amount)}.
    Updated balances:
      Bank: ${(await userDB).balance}
      Token: ${await toNumber(await tokenBalance)}`);
    return true;
  } catch (error) {
    logger.error(` ${logInfo.instance} Checking deposit. ${error.stack}`);
    return false;
  } finally {
    logClose(logInfo);
  }
};

export const transfer = async (sender: string, recipient: string, amount: BigNumber) => {
  const logInfo = logStart("exchange/controller.ts", "transfer", "info");
  try {
    // async
    // Get user external to get balance (bank balance)
    const senderDB = ExtUser.findOne({ owner: recipient }) as Promise<IExtUser>;
    const recipientDB = ExtUser.findOne({ owner: recipient }) as Promise<IExtUser>;
    const senderBalance = myToken!.callStatic.balanceOf(sender);
    const recipientBalance = myToken!.callStatic.balanceOf(recipient);

    if (!(await senderDB) || !(await senderDB).id) {
      throw new Error(`Cannot get sender from database`);
    }
    if (!(await recipientDB) || !(await recipientDB).id) {
      throw new Error(`Cannot get recipient from database`);
    }
    logger.info(` ${logInfo.instance} User ${
      (await senderDB).id
    } has made a transfer of ${await toNumber(amount)} to user ${(await recipientDB).id}.
    Updated token balances:
      Sender: ${await toNumber(await senderBalance)}
      Recipient: ${await toNumber(await recipientBalance)}`);
    return true;
  } catch (error) {
    logger.error(` ${logInfo.instance} Checking transfer. ${error.stack}`);
    return false;
  } finally {
    logClose(logInfo);
  }
};
