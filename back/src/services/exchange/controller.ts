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
import { IDeposit_req, IDeposit_res, ITransfer_req, ITransfer_res } from "../../models/Exchange";
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
  const body: ITransfer_req = req.body;
  let httpCode = 202;
  let result: ITransfer_res = {
    message: "ERROR: can't complete requested transfer",
  };
  try {
    // Get admin Wallet
    const admin = await retrieveWallet(Constants.ADMIN_PATH, Constants.ADMIN_PASSWORD);
    const iobManagerAdmin = iobManager!.connect(admin!);
    const spenderBC = iobManagerAdmin.callStatic.getUserByOwner(body.senderAccount);
    let recipientBC:
      | Promise<
          [string, string, string, string, BigNumber, BigNumber] & {
            id: string;
            owner: string;
            name: string;
            password: string;
            dateCreated: BigNumber;
            dateModified: BigNumber;
          }
        >
      | undefined;
    if (body.recipientAccount) {
      recipientBC = iobManagerAdmin.callStatic.getUserByOwner(body.recipientAccount);
    } else if (body.recipientId) {
      recipientBC = iobManagerAdmin.callStatic.getUser(body.recipientId);
    } else {
      result.message = result.message.concat(". Cannot find recipient id or account");
      throw new Error(`No reference to the recipient in the request`);
    }

    const spenderBalance = myToken!.callStatic.balanceOf(body.senderAccount);
    const recipientBalance = myToken!.callStatic.balanceOf(
      body.recipientAccount ? body.recipientAccount : (await recipientBC).owner
    );
    const allowance = myToken!.callStatic.allowance(
      body.senderAccount,
      body.recipientAccount ? body.recipientAccount : (await recipientBC).owner
    );

    if (!spenderBC || !(await spenderBC).id) {
      result.message = result.message.concat(". Cannot find spender user for this account");
      throw new Error(`Spender user not found in blockchain for this owner account`);
    }
    if (!recipientBC || !(await recipientBC).id) {
      result.message = result.message.concat(". Cannot find recipient user for this account");
      throw new Error(`Recipient user not found in blockchain for this owner account`);
    }
    // user found and OK
    // Check if amount exceed sender's balance
    if (!(body.amount < ((await toNumber(await spenderBalance))! as number))) {
      result.message = result.message.concat(
        ". Amount to transfer is higher than recipient token's balance"
      );
      throw new Error(`Amount to transfer is higher than recipient token's balance`);
    }
    // OK
    if (((await toNumber(await allowance)) as number) > body.amount ) {
      // allawance already setted, only transfer Tx needed
      const transferUnsTx = await iobManagerAdmin.populateTransaction.transfer(
        (await spenderBC).id,
        (await recipientBC).id,
        await toBigNum(body.amount),
        GAS_OPT
      );
      result.A_approveUnsignedTx = undefined;
      result.B_transferUnsignedTx = transferUnsTx;
    } else {
      // allawance not setted yet need two Tx
      const approveUnsTx = await myToken?.populateTransaction.approve(
        (await recipientBC).owner,
        await toBigNum(body.amount),
        GAS_OPT
      );
      const transferUnsTx = await iobManagerAdmin.populateTransaction.transfer(
        (await spenderBC).id,
        (await recipientBC).id,
        await toBigNum(body.amount),
        GAS_OPT
      );
      result.A_approveUnsignedTx = approveUnsTx;
      result.B_transferUnsignedTx = transferUnsTx;
    }
    //OK
    logger.info(` ${logInfo.instance} Transfer unsigned transaction created successfully`);

    result.toAccount = (await recipientBC).id;
    result.fromAccount = (await spenderBC).id;
    result.spenderBalance = (await toNumber(await spenderBalance)) as number;
    result.recipientBalance = (await toNumber(await recipientBalance)) as number;
    result.message = `Transfer unsigned transaction created successfully.
    WARNING: balances are current values before the transaction is executed.
    WARNING: you need to send the signed Transaction/Transactions using POST /tx-proxy/send route.
    first A and then B`;
    httpCode = 200;
  } catch (error) {
    logger.error(
      ` ${logInfo.instance} Something happened when trying to Transfer ${body.amount}. ${error.stack}`
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

export const transfer = async (spender: string, recipient: string, amount: BigNumber) => {
  const logInfo = logStart("exchange/controller.ts", "transfer", "info");
  try {
    // async
    // Get user external to get balance (bank balance)
    const spenderDB = ExtUser.findOne({ owner: recipient }) as Promise<IExtUser>;
    const recipientDB = ExtUser.findOne({ owner: recipient }) as Promise<IExtUser>;
    const spenderBalance = myToken!.callStatic.balanceOf(spender);
    const recipientBalance = myToken!.callStatic.balanceOf(recipient);

    if (!(await spenderDB) || !(await spenderDB).id) {
      throw new Error(`Cannot get spender from database`);
    }
    if (!(await recipientDB) || !(await recipientDB).id) {
      throw new Error(`Cannot get recipient from database`);
    }
    logger.info(` ${logInfo.instance} User ${
      (await spenderDB).id
    } has made a transfer of ${await toNumber(amount)} to user ${(await recipientDB).id}.
    Updated token balances:
      Spender: ${await toNumber(await spenderBalance)}
      Recipient: ${await toNumber(await recipientBalance)}`);
    return true;
  } catch (error) {
    logger.error(` ${logInfo.instance} Checking transfer. ${error.stack}`);
    return false;
  } finally {
    logClose(logInfo);
  }
};
