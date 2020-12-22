import { Request, Response } from "express";
import { Constants } from "../../utils/config";
import {
  IDeposit_req,
  IDeposit_res,
  IWithdrawal_req,
  IWithdrawal_res,
} from "../../models/Exchange";
import ExtUser, { IExtUser } from "../../models/ExtUser";
import Admin, { IAdmin } from "../../models/Admin";
import {
  sendMethod,
  unlockAccount,
  getTokenInstance,
  callStatic,
  toBigNum,
  checkEventInBlock,
  toNumber,
  sendMethodTx,
} from "../../middleware/blockchain";
import { decrypt } from "../../middleware/auth";
import { logClose, logger, logStart } from "../../middleware/logger";
import { DocumentQuery } from "mongoose";

/**
 * @title Exchange Simulator.
 * @description Simulates the operations related with a real exchange. Deposit and withdrawal
 *              are the two main functions. toPAAPWei and toUSD are for decimal representation
 *              propuses only.
 */
/**
 * @title Deposit
 * @dev   Function that makes a transfer of amount paap from the account 0 to account and removes
 *        the same amount from the balance of the bank account. Should have enough balance in the
 *        external bank account to make the transfer.
 */
export const deposit = async (req: Request, res: Response) => {
  const logInfo = logStart("exchange/constroller.ts", "deposit");
  const body: IDeposit_req = req.body;
  let httpCode = 202;
  let result: IDeposit_res = {
    message: "ERROR: can't complete requested deposit",
  };
  try {
    // async
    let userDB:
      | DocumentQuery<IExtUser | null, IExtUser, {}>
      | IExtUser
      | null = ExtUser.findOne({ account: body.senderAccount });
    let adminDB:
      | DocumentQuery<IAdmin | null, IAdmin, {}>
      | IAdmin
      | null = Admin.findOne({ username: Constants.DEFAULT_ADMIN });
    const token = getTokenInstance();

    userDB = await userDB;
    if (!userDB || !userDB?.account) {
      result.message = "ERROR: cannot find user in Database";
      throw new Error(`cannot find user in Database`);
    }
    const initBalance = userDB.balance;
    //let userPass = await decrypt(userDB.accPass);
    adminDB = await adminDB;
    if (!adminDB || !adminDB?.account) {
      result.message = "ERROR: cannot find admin in Database";
      throw new Error(`cannot find admin in Database`);
    }

    const adminPass = await decrypt(adminDB.accPass);
    const unlockRes = await unlockAccount(adminDB.account, adminPass);
    if (!unlockRes || !unlockRes.unlocked) {
      result.message = "ERROR: unlocking Admin account";
      throw new Error(`unlocking Admins address, check DB??`);
    }
    logger.info(
      ` ${logInfo.instance} Initiating deposit of ${body.amount} paap to ${body.senderAccount}`
    );
    if (!(userDB.balance >= body.amount)) {
      result.message = "ERROR: bank account's balance insufficient";
      throw new Error(
        `user's external balance is inferior than the requested amount`
      );
    }
    // async. Send transfer and (update and check) DB's balance
    const receiptTx = sendMethod(await token, "transfer", adminDB.account, [
      userDB.account,
      await toBigNum(body.amount),
    ]);
    // update DB and check it
    await ExtUser.findByIdAndUpdate(userDB._id, {
      balance: userDB.balance - body.amount,
    });
    userDB = await ExtUser.findById(userDB._id);
    if (!userDB) {
      throw new Error(`should not be null at this point...`);
    }
    // Check if balance is updated
    if (userDB.balance != initBalance - body.amount) {
      result.message = "ERROR: bank account's balance not updated";
      throw new Error(`User external account balance not updated`);
    }
    // Check receipt of transfer transaction
    if (!(await receiptTx)) {
      result.message = "ERROR: sending transfer tx to blockchain";
      throw new Error(`bad receipt from transfer transaction`);
    }
    const tokenBalance = callStatic(
      await token,
      "balanceOf",
      userDB.account,
      userDB.account
    );
    const transfered = await checkEventInBlock(
      await token,
      "Transfer",
      [adminDB.account, userDB.account, null],
      (await receiptTx)!.blockNumber,
      (await receiptTx)!.blockNumber
    );
    if (!transfered) {
      result.message = "ERROR: sending transfer tx to blockchain";
      throw new Error(`cannot find Transfer event from Token contract`);
    }
    //OK
    const successMessage = `Transfer of ${body.amount} EUR to ${body.amount} paap tokens made successfully`;
    logger.info(` ${logInfo.instance} ${successMessage}`);

    result.toAccount = userDB.account;
    result.bankBalance = userDB.balance;
    result.tokenBalance = (await toNumber(await tokenBalance)) as number;
    result.message = successMessage;
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
/**
 * @title Withdrawal
 * @dev   Function that makes a transfer of amount paap from the account 0 to account and removes
 *        the same amount from the balance of the bank account. Should have enough balance in the
 *        external bank account to make the transfer.
 * @param username string representing the 'to' username
 * @param amount number representing the amount of paap in Wei to be transfer to account
 * @param token PAAP token contract instance
 */
export const withdrawal = async (req: Request, res: Response) => {
  const logInfo = logStart("exchange/constroller.ts", "withdrawal");
  const body: IWithdrawal_req = req.body;
  let httpCode = 202;
  let result: IWithdrawal_res = {
    message: "ERROR: can't complete requested withdrawal",
  };
  try {
    // async
    let userDB:
      | DocumentQuery<IExtUser | null, IExtUser, {}>
      | IExtUser
      | null = ExtUser.findOne({ account: body.senderAccount });
    let adminDB:
      | DocumentQuery<IAdmin | null, IAdmin, {}>
      | IAdmin
      | null = Admin.findOne({ username: Constants.DEFAULT_ADMIN });
    const token = getTokenInstance();

    userDB = await userDB;
    if (!userDB || !userDB?.account) {
      result.message = "ERROR: cannot find user in Database";
      throw new Error(`cannot find user in Database`);
    }
    const initBalance = userDB.balance;
    // can be an external account
    const unlockRes = await unlockAccount(userDB.account);
    //let userPass = await decrypt(userDB.accPass);
    adminDB = await adminDB;
    if (!adminDB || !adminDB?.account) {
      result.message = "ERROR: cannot find admin in Database";
      throw new Error(`cannot find admin in Database`);
    }
    logger.info(
      ` ${logInfo.instance} Initiating deposit of ${body.amount} paap to ${body.senderAccount}`
    );

    if (!(userDB.balance >= body.amount)) {
      result.message = "ERROR: bank account's balance insufficient";
      throw new Error(
        `user's external balance is inferior than the requested amount`
      );
    }

    if (unlockRes.unlocked) {
      // async. Send transfer and (update and check) DB's balance
      const receiptTx = sendMethod(await token, "transfer", userDB.account, [
        adminDB.account,
        await toBigNum(body.amount),
      ]);
      // update DB and check it
      await ExtUser.findByIdAndUpdate(userDB._id, {
        balance: userDB.balance + body.amount,
      });
      userDB = await ExtUser.findById(userDB._id);
      if (!userDB) {
        throw new Error(`should not be null at this point...`);
      }
      // Check if balance is updated
      if (userDB.balance != initBalance + body.amount) {
        result.message = "ERROR: bank account's balance not updated";
        throw new Error(`User external account balance not updated`);
      }
      // Check receipt of transfer transaction
      if (!(await receiptTx)) {
        result.message = "ERROR: sending transfer tx to blockchain";
        throw new Error(`bad receipt from transfer transaction`);
      }
      const tokenBalance = callStatic(
        await token,
        "balanceOf",
        userDB.account,
        userDB.account
      );
      const transfered = await checkEventInBlock(
        await token,
        "Transfer",
        [userDB.account, adminDB.account, null],
        (await receiptTx)!.blockNumber,
        (await receiptTx)!.blockNumber
      );
      if (!transfered) {
        result.message = "ERROR: sending transfer tx to blockchain";
        throw new Error(`cannot find Transfer event from Token contract`);
      }
      //OK
      const successMessage = `Transfer of ${body.amount} paap tokens to ${body.amount} EUR made successfully`;
      logger.info(` ${logInfo.instance} ${successMessage}`);

      result.fromAccount = userDB.account;
      result.bankBalance = userDB.balance;
      result.tokenBalance = await tokenBalance;
      result.message = successMessage;
      httpCode = 200;
    } else if (!unlockRes.unlocked && !unlockRes.delegated) {
      const unsignedTx = await sendMethodTx(
        await token,
        "transfer",
        userDB.account,
        [adminDB.account, await toBigNum(body.amount)]
      );
      // Subscribe to transfer events to check when transaction is
      // signed, send and executed in blockchain, then update DB
      const filter = (await token).filters.Transfer([
        userDB.account,
        adminDB.account,
        null,
      ]);
      (await token).on(
        filter,
        async (from: string, to: string, amount: number) => {
          userDB = (await userDB)!;
          adminDB = (await adminDB)!;
          if (
            userDB.account == from &&
            adminDB.account == to &&
            body.amount == amount
          ) {
            // unsigned Tx has been signed and executed
            // update DB and check it
            await ExtUser.findByIdAndUpdate(userDB._id, {
              balance: userDB.balance + body.amount,
            });
            userDB = await ExtUser.findById(userDB._id);
            if (!userDB) {
              throw new Error(`should not be null at this point...`);
            }
            // Check if balance is updated
            if (userDB.balance != initBalance + body.amount) {
              result.message = "ERROR: bank account's balance not updated";
              throw new Error(`User external account balance not updated`);
            }
          }
        }
      );
      result.fromAccount = userDB.account;
      result.unsignedTx = unsignedTx;
      result.message =
        "Unsigned transaction created. Sign it and send it to /paap/sendTx";
      httpCode = 200;
    } else {
      result.message = "ERROR: unlocking user account";
      throw new Error(`user account unlock failed`);
    }
  } catch (error) {
    logger.error(
      ` ${logInfo.instance} Something happened when trying to withdrawal ${body.amount}. ${error.stack}`
    );
  } finally {
    logClose(logInfo);
    res.send(result).status(httpCode);
  }
};
