import { Request, Response } from "express";
import ILoan, {
  ICreateLoan_res,
  IGetLoans_res,
  IPayPlan,
  IGetLoans_req,
  IGetLoan_req,
  IGetLoan_res,
  ICreateLoan_req,
  IGetPayPlan_req,
  IGetPayPlan_res,
  IInvest,
  IGetInvests_res,
  IGetInvests_req,
  IPublishLoan_res,
  IMakeInvest_res,
  ICancelLoan_res,
  IAcceptLoan_res,
  IAcceptLoan_req,
} from "../../models/Loan";
import {
  getPaapInstance,
  sendMethod,
  getLoanInstance,
  unlockAccount,
  callStatic,
  getUserInstance,
  deployLoanContract,
  IUnlockRes,
  checkEventInBlock,
  sendMethodTx,
  toNumber,
  toBigNum,
  toDate,
  getTokenInstance,
  ZERO_ADDRESS,
  provider,
} from "../../middleware/blockchain";
import ExtUser from "../../models/ExtUser";
import { decrypt } from "../../middleware/auth";
import { logClose, logger, logStart, logObject } from "../../middleware/logger";
import { Rol } from "../../models/User";
import Admin, { IAdmin } from "../../models/Admin";

import { isAdmin } from "../authentication/controller";
import { Constants } from "../../utils/config";

export const getLoan = async (req: Request, res: Response) => {
  
  const logInfo = logStart("loans/controller.ts", "getLoan");
  const body: IGetLoan_req = req.body;
  // redirect to getLoans
  if (body.risk || body.state) {
    getLoans(req, res);
    return;
  }
  let httpCode = 202;
  let result: IGetLoan_res = {
    message: `ERROR: can't retreive loan`,
  };

  try {
    const loan = await getLoanInt(body.loanAddress!, body.senderAccount);
    if (!loan) {
      result.message = "ERROR: cannot get loan from Blockchain";
      throw new Error(`Cannot get loan from Blockchain`);
    }
    logger.info(` ${logInfo.instance} ${body.loanAddress} loan found`);
    // OK
    result.message = "Loans retreived successfully";
    result.loan = loan;
    httpCode = 200;
  } catch (error) {
    logger.error(` ${logInfo.instance} cannot retreive loan. ${error.stack}`);
  } finally {
    logClose(logInfo);
    res.status(httpCode).send(result);
  }
};

export const getLoans = async (req: Request, res: Response) => {
  const logInfo = logStart("loans/controller.ts", "getLoans");
  const body: IGetLoans_req = req.body;
  let httpCode = 202;
  let result: IGetLoans_res = {
    message: `ERROR: can't retreive loans`,
  };

  try {
    let addresses: string[];
    // choose call based on params
    if (body.minQuantity || body.maxQuantity) {
      addresses = await callStatic(
        await getPaapInstance(),
        "getLoansByQuantity",
        req.body.senderAccount,
        body.minQuantity ? await toBigNum(body.minQuantity) : 0,
        body.maxQuantity ? await toBigNum(body.maxQuantity) : 0
      );
    } else if (body.fromDate || body.toDate) {
      addresses = await callStatic(
        await getPaapInstance(),
        "getLoansByDate",
        req.body.senderAccount,
        body.fromDate ? body.fromDate.valueOf() / 1000 : 0,
        body.toDate ? body.toDate.valueOf() / 1000 : 0
      );
    } else if (body.risk) {
      addresses = await callStatic(
        await getPaapInstance(),
        "getLoansByRisk",
        req.body.senderAccount,
        body.risk
      );
    } else if (body.state) {
      addresses = await callStatic(
        await getPaapInstance(),
        "getLoansByState",
        req.body.senderAccount,
        body.state
      );
    } else {
      addresses = await callStatic(await getPaapInstance(), "getLoans");
    }
    if (!addresses) {
      result.message = "ERROR: cannot get loan addresses from PAAP contract";
      throw new Error(`Cannot get loan addresses from PAAP contract`);
    }
    const loans = await getLoansInt(addresses, body.senderAccount);
    if (!loans) {
      result.message = "ERROR: cannot get loans from Blockchain";
      throw new Error(`Cannot get loans from Blockchain`);
    }
    logger.info(` ${logInfo.instance} ${addresses.length} loans found`);
    // OK
    if(addresses[0] != ZERO_ADDRESS){
      result.message = "Loans retreived successfully";
      result.loanAddresses = addresses;
      result.loans = loans;
      result.loansLength = addresses.length;
    }else{
      result.message = "Cannot find any loan with given param.";
    }
    httpCode = 200;
  } catch (error) {
    logger.error(` ${logInfo.instance} cannot retreive loans. ${error.stack}`);
  } finally {
    logClose(logInfo);
    res.status(httpCode).send(result);
  }
};

export const createLoan = async (req: Request, res: Response) => {
  const logInfo = logStart("loans/controller.ts", "createLoan");
  const body: ICreateLoan_req = req.body;
  console.log("RISK " + body);
  let httpCode = 202;
  let result: ICreateLoan_res = {
    created: false,
    message: `ERROR: cannot create Loan`,
  };

  try {
    // async flows
    const userAddress = callStatic(
      await getPaapInstance(),
      "getMyAddress",
      body.senderAccount
    );
    let unlockRes: Promise<IUnlockRes> | IUnlockRes = unlockAccount(
      body.senderAccount
    );
    // get the admin user in case is external to deploy SC
    const getAdminAndUnlock = async () => {
      const admin = await Admin.findOne({});
      const password = await decrypt(admin!.accPass);
      await unlockAccount(admin!.account, password);
      return admin as IAdmin;
    };
    const admin = getAdminAndUnlock();

    // get Sender's user instance and check if is a borrower user
    if (!userAddress) {
      throw new Error(`user address not found in Blockchain.`);
    }
    const userInstance = await getUserInstance(await userAddress);
    const rol: Rol = await callStatic(
      userInstance,
      "getRol",
      body.senderAccount
    );
    if (rol != "borrower") {
      result.message = "ERROR: user must be borrower to create loans";
      throw new Error(`rol is not borrower. Only borrowers can create loans`);
    }
    unlockRes = await unlockRes;
    if (unlockRes.unlocked) {
      // Sender is delegated and unlocked
      const loanInstance = await deployLoanContract(body.senderAccount);
      if (!loanInstance) {
        result.message = "ERROR: deploying the loan contract";
        throw new Error(`cannot deploy the loan contract`);
      }
      const receiptTx = await sendMethod(
        loanInstance,
        "initialize",
        body.senderAccount,
        [
          await userAddress,
          await toBigNum(body.quantity),
          body.minInterest,
          body.maxInterest,
          // From ISO to Unix epoch Time in secs
          new Date(body.deadLine).valueOf() / 1000,
          body.refundTime, // Months
        ]
      );
      if (!receiptTx) {
        result.message = "ERROR: initializing loan contract";
        throw new Error(`cannot initialize loan contract`);
      }
      const initialized = checkEventInBlock(loanInstance, "LoanInitialized", [
        loanInstance.address,
        body.senderAccount,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ]);
      if (!initialized) {
        result.message = "ERROR: initializing loan contract";
        throw new Error(`cannot find LoanInitializated event in block`);
      }
      // OK
      result.loanAddress = loanInstance.address;
      result.message = "Loan contract deployed and initialized correctly";
      httpCode = 201;
    } else if (unlockRes.delegated == false) {
      // External account
      const loanInstance = await deployLoanContract((await admin).account);
      if (!loanInstance) {
        result.message = "ERROR: deploying the loan contract";
        throw new Error(`cannot deploy the loan contract`);
      }
      console.log(new Date(body.deadLine).valueOf());
      const unsTx = await sendMethodTx(
        loanInstance,
        "initialize",
        body.senderAccount,
        [
          await toBigNum(body.quantity),
          body.minInterest,
          body.maxInterest,
          // From ISO to Unix epoch Time
          new Date(body.deadLine).valueOf(),
          body.refundTime, // Months
        ]
      );
      if (!unsTx) {
        result.message =
          "ERROR: getting initialize transaction for loan contract";
        throw new Error(`cannot get initialize Tx for loan contract`);
      }
      // OK
      result.loanAddress = loanInstance.address;
      result.unsignedTx = unsTx;
      result.message =
        "Contract deployed, initialize transaction created. " +
        "Sign this transaction and call 'sendTx()' to initialize the loan";
      httpCode = 200;
    } else {
      result.message = "ERROR: cannot unlock account or check account type";
      throw new Error(`cannot unlock account or check account type`);
    }
    result.created = true;
  } catch (error) {
    logger.error(` ${logInfo.instance} cannot create new loan. ${error.stack}`);
  } finally {
    logClose(logInfo);
    res.status(httpCode).send(result);
  }
};

export const publishLoan = async (req: Request, res: Response) => {
  let httpCode = 202;
  let result: IPublishLoan_res = {
    message: "ERROR: cannot publish loan",
  };

  try {
    let BCLoan = getLoanInstance(req.body.address);
    const loanAddress = req.body.address;
    if (isAdmin(req.body.senderAccount)) {
      const adminRes = await isAdmin(req.body.senderAccount);
      if (!adminRes || !adminRes.isAdmin || !adminRes.admin) {
        result.message =
          "ERROR: account address is not admin. Must be admin to deploy PAAP";
        throw new Error(
          `account address is not admin. Must be admin to deploy PAAP`
        );
      }
      let admin = adminRes.admin;
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
      const tx = await sendMethod(await BCLoan, "publish", admin.account, [
        req.body.risk,
        req.body.minInterest ? req.body.minInterest : 0,
        req.body.maxInterest ? req.body.maxInterest : 0,
        req.body.quantity ? await toNumber(req.body.minInterest) : 0,
      ]);
      if (tx) {
        httpCode = 201; // Created
        console.log(tx);
        result = {
          message: "Loan published successfully",
        };
        console.log(`Loan published successfully`);
      } else {
        result.message = "ERROR: cannot published the loan in Blockchain";
        console.error(`ERROR: cannot published the loan in Blockchain`);
      }
    } else {
      result.message = "can't find the provided account un DB";
      console.error("can't find the provided account un DB");
    }
  } catch (error) {
    console.error(`ERROR: cannot publish the loan. ${error}`);
  }
  res.status(httpCode).send(result);
};

export const makeInvest = async (req: Request, res: Response) => {
  let httpCode = 202;
  let result: IMakeInvest_res = {
    invested: false,
    message: "ERROR: cannot make new invest",
  };

  try {
    let BCLoan = getLoanInstance(req.body.address);
    const userAddress = callStatic(
      await getPaapInstance(),
      "getMyAddress",
      req.body.senderAccount
    );
    let unlockRes: Promise<IUnlockRes> | IUnlockRes = unlockAccount(
      req.body.senderAccount
    );
    // get the admin user in case is external to deploy SC
    const getAdminAndUnlock = async () => {
      const admin = await Admin.findOne({});
      const password = await decrypt(admin!.accPass);
      await unlockAccount(admin!.account, password);
      return admin as IAdmin;
    };
    const admin = getAdminAndUnlock();
    // get Sender's user instance and check if is a borrower user
    if (!userAddress) {
      throw new Error(`user address not found in Blockchain.`);
    }
    const userInstance = await getUserInstance(await userAddress);
    console.log(await callStatic(userInstance, "getRol"));
    const rol: Rol = await callStatic(
      userInstance,
      "getRol",
      req.body.senderAccount
    );
    if (rol != "investor") {
      result.message = "ERROR: user must be investor to invest loans";
      throw new Error(`rol is not investor. Only investors can invest loans`);
    }
    unlockRes = await unlockRes;
    if (unlockRes.unlocked) {
      const tx1 = await sendMethod(
        await getTokenInstance(),
        "approve",
        req.body.senderAccount,
        [req.body.address, await toBigNum(req.body.amount)]
    );  
      const tx = await sendMethod(
        await BCLoan,
        "invest",
        req.body.senderAccount,
        [await toBigNum(req.body.amount), req.body.interest]
      );
      console.log("TX " + tx);
      if (tx) {
        httpCode = 201; // Created
        console.log(tx);
        result = {
          invested: true,
          message: "Loan invested successfully",
        };
        console.log(`Loan invested successfully`);

        //console.log(`Loan '${tx.events.NewLoan[0].returnValues.loanAddress}' created successfully`);
      } else {
        result.message = "ERROR: cannot invest loan in Blockchain";
        console.error(`ERROR: cannot invest the loan in Blockchain`);
      }
    } else {
      result.message = "can't find the provided account un DB";
      console.error("can't find the provided account un DB");
    }
  } catch (error) {
    console.error(`ERROR: cannot create new Invest. ${error}`);
  }

  res.status(httpCode).send(result);
};

export const getPayPlan = async (req: Request, res: Response) => {
  const logInfo = logStart("loans/controller.ts", "getPayPlan");
  const body: IGetPayPlan_req = req.body;
  let httpCode = 202;
  let result: IGetPayPlan_res = {
    message: "ERROR: can't retreive payment plan",
  };

  try {
    const loanInstance = getLoanInstance(body.loanAddress);
    const payPlan = getPayPlanInt(body.loanAddress, body.senderAccount);
    const state = await callStatic(
      await loanInstance,
      "state",
      body.senderAccount
    );
    if (state == "accepted" || state == "refunded") {
      result.payPlan = await payPlan;
      result.message =
        "Payplan retreived successfully for loan '" + body.loanAddress + "'";
    } else {
      result.message =
        "Loan '" +
        body.loanAddress +
        "' is not invested yet, cannot have a Paymentes plan";
    }
    httpCode = 200;
  } catch (error) {
    logger.error(
      ` ${logInfo.instance} can't retreive payment plan. ${error.stack}`
    );
  } finally {
    logClose(logInfo);
    res.status(httpCode).send(result);
  }
};

export const getInvests = async (req: Request, res: Response) => {
  const logInfo = logStart("loans/controller.ts", "getInvests");
  const body: IGetInvests_req = req.body;
  let httpCode = 202;
  let result: IGetInvests_res = {
    message: "ERROR: can't retreive invests",
  };

  try {
    const loanInstance = getLoanInstance(body.loanAddress);
    const invested = getInvestsInt(body.loanAddress, body.senderAccount);
    const state = await callStatic(
      await loanInstance,
      "state",
      body.senderAccount
    );
    if (
      state == "published" ||
      state == "invested" ||
      state == "accepted" ||
      state == "refunded"
    ) {
      result.invested = await invested;
      result.message =
        "Invests retreived successfully for loan '" + body.loanAddress + "'";
    } else {
      result.message =
        "Loan '" +
        body.loanAddress +
        "' is not published yet, cannot have any invests";
    }
    httpCode = 200;
  } catch (error) {
    logger.error(` ${logInfo.instance} can't retreive invests. ${error.stack}`);
  } finally {
    logClose(logInfo);
    res.status(httpCode).send(result);
  }
};

export const cancelLoan = async (req: Request, res: Response) => {
  let httpCode = 202;
  let result: IAcceptLoan_res = {
    acepted: false,
    message: "ERROR: cannot accept loan",
  };

  try {
    let BCLoan = getLoanInstance(req.body.address);
    const loanAddress = req.body.address;
    // async flows
    const userAddress = callStatic(
      await getPaapInstance(),
      "getMyAddress",
      req.body.senderAccount
    );
    let unlockRes: Promise<IUnlockRes> | IUnlockRes = unlockAccount(
      req.body.senderAccount
    );
    // get the admin user in case is external to deploy SC
    const getAdminAndUnlock = async () => {
      const admin = await Admin.findOne({});
      const password = await decrypt(admin!.accPass);
      await unlockAccount(admin!.account, password);
      return admin as IAdmin;
    };
    const admin = getAdminAndUnlock();
    // get Sender's user instance and check if is a borrower user
    if (!userAddress) {
      throw new Error(`user address not found in Blockchain.`);
    }
    const userInstance = await getUserInstance(await userAddress);
    console.log(await callStatic(userInstance, "getRol"));
    const rol: Rol = await callStatic(
      userInstance,
      "getRol",
      req.body.senderAccount
    );
    if (rol != "borrower") {
      result.message = "ERROR: user must be borrower to create loans";
      throw new Error(`rol is not borrower. Only borrowers can cancel loans`);
    }
    unlockRes = await unlockRes;
    if (unlockRes.unlocked) {
      const tx1 = await sendMethod(
        await getTokenInstance(),
        "approve",
        req.body.senderAccount,
        [req.body.address, await toBigNum(req.body.amount)]
      );  
      const tx = await sendMethod(
        await BCLoan,
        "cancel",
        req.body.senderAccount,
        []
      );
      if (tx) {
        httpCode = 201; // Created
        result = {
          acepted: true,
          message: "Loan cancelled successfully",
        };
        console.log(`Loan cancelled successfully`);
        //console.log(`Loan '${tx.events.NewLoan[0].returnValues.loanAddress}' created successfully`);
      } else {
        result.message = "ERROR: cannot cancel loan.";
        console.error(`ERROR: cannot cancel loan.`);
      }
    } else {
      result.message = "can't find the provided account un DB";
      console.error("can't find the provided account un DB");
    }
  } catch (error) {
    console.error(`ERROR: cannot accept loan. ${error}`);
  }
  res.status(httpCode).send(result);
};

export const acceptLoan = async (req: Request, res: Response) => {
  //let body = req.body as IAcceptLoan_req;
  let httpCode = 202;
  let result: IAcceptLoan_res = {
    acepted: false,
    message: "ERROR: cannot accept loan",
  };

  try {
    // async flows
    let loanInstance = getLoanInstance(req.body.address);
    const userBC = callStatic(
      await getPaapInstance(),
      "getMyUser",
      req.body.senderAccount
    );
    let unlockRes: Promise<IUnlockRes> | IUnlockRes = unlockAccount(
      req.body.senderAccount
    );
    const loanBC = callStatic(
      await loanInstance,
      "get",
      req.body.senderAccount
    );

    // get Sender's user instance and check if is a borrower user
    if ((await userBC) && !(await userBC)._userAddress) {
      throw new Error(`user not found in Blockchain.`);
    }
    if ((await loanInstance) && !(await loanInstance).address) {
      throw new Error(`loan not found in Blockchain.`);
    }
    if ((await userBC)._rol != "borrower") {
      result.message = "ERROR: user must be borrower to create loans";
      throw new Error(`rol is not borrower. Only borrowers can accept loans`);
    }
    unlockRes = await unlockRes;
    if (unlockRes.unlocked) {
      await toBigNum((await loanBC)._quantity)
      // logger.debug(` ${logInfo} ${unlockRes} `);
      logger.debug(` ${logObject(unlockRes)} `);
      const tx1 = await sendMethod(
        await getTokenInstance(),
        "approve",
        req.body.senderAccount,
        [req.body.address, await toBigNum((await loanBC)._quantity)]
      );  
      const tx = await sendMethod(
        await loanInstance,
        "accept",
        req.body.senderAccount,
        []
      );
      if (tx) {
        httpCode = 201; // Created
        result = {
          acepted: true,
          message: "Loan accepted successfully",
        };
        console.log(`Loan accepted successfully`);
        //console.log(`Loan '${tx.events.NewLoan[0].returnValues.loanAddress}' created successfully`);
      } else {
        result.message = "ERROR: cannot accept loan.";
        console.error(`ERROR: cannot accept loan.`);
      }
    } else {
      result.message = "can't find the provided account un DB";
      console.error("can't find the provided account un DB");
    }
  } catch (error) {
    console.error(`ERROR: cannot accept loan. ${error.stack}`);
  }
  res.status(httpCode).send(result);
};

// No HTTP methods ("Int" = "internal") to name it different

export const getLoansInt = async (addresses: string[], from?: string) => {
  const logInfo = logStart("loans/controller.ts", "getLoansInt");
  try {
    let loans: Promise<ILoan>[] = [];
    addresses.forEach(async (address) => {
      if(address != ZERO_ADDRESS){
        loans.push(getLoanInt(address, from) as Promise<ILoan>);
      }
    });
    return await Promise.all(loans);
  } catch (error) {
    logger.error(` ${logInfo.instance} cannot get loans. ${error}`);
  } finally {
    logClose(logInfo);
  }
};

const getLoanInt = async (address: string, from?: string) => {
  const logInfo = logStart("loans/controller.ts", "getLoanInt");

  try {
    let loan: Promise<ILoan> | ILoan = getLoanDetails(address, from);
    if (from) {
      const payPlan = getPayPlanInt(address, from);
      console.log("payplan " + logObject(await payPlan));
      const invested = getInvestsInt(address, from);
      console.log("invested " + logObject(await invested));
      loan = await loan;
      if (
        loan.state == "published" ||
        loan.state == "invested" ||
        loan.state == "accepted" ||
        loan.state == "refunded"
      ) {
        loan.invested = await invested;
      }
      if (loan.state == "accepted" || loan.state == "refunded") {
        loan.payPlan = await payPlan;
      }
      return loan;
    } else {
      return await loan;
    }
  } catch (error) {
    logger.error(` ${logInfo.instance} can't retreive loan.  ${error.stack}`);
  } finally {
    logClose(logInfo);
  }
};

const getLoanDetails = async (address: string, from?: string) => {
  const BCLoan = await getLoanInstance(address);
  const basicInfo = await callStatic(BCLoan, "get", from);
  console.log(basicInfo);
  return {
    owner: basicInfo._owner,
    address: basicInfo._loanAddress,
    quantity: await toNumber(basicInfo._quantity),
    state: basicInfo._state,
    risk: basicInfo._risk,
    minInterest: basicInfo._minInterest,
    maxInterest: basicInfo._maxInterest,
    deadLine: new Date(basicInfo._deadLine * 1000),
    refundTime: basicInfo._refundTime,
    investedTotal: await toNumber(basicInfo._investedTotal),
    // false because are seconds
    creationDate: new Date(basicInfo._creationDate * 1000),
  } as ILoan;
};

const getPayPlanInt = async (address: string, from: string) => {
  const BCLoan = await getLoanInstance(address);
  const loan = await callStatic(BCLoan, "getPayPlan", from);
  if (loan) {
    return {
      amounts: await toNumber(loan._amounts),
      percents: await toNumber(loan._percents),
      dates: await toDate(loan._dates),
      // exceptional convert case, is int instead of uint
      lastPaidMonth: parseInt(loan._lastPaidMonth._hex),
      debt: await toNumber(loan._debt),
      penalties: await toNumber(loan._penalties),
    } as IPayPlan;
  }
};

const getInvestsInt = async (address: string, from: string) => {
  const BCLoan = await getLoanInstance(address);
  const investedLen: number = await callStatic(
    BCLoan,
    "getInvestedLength",
    from
  );
  let invested: Promise<IInvest>[] = [];
  for (let i = 0; i < investedLen; i++) {
    invested.push(getInvestInt(address, i, from) as Promise<IInvest>);
  }
  return await Promise.all(invested);
};

const getInvestInt = async (
  address: string,
  investId: number,
  from: string
) => {
  const BCLoan = await getLoanInstance(address);
  const invest = await callStatic(BCLoan, "getInvest", from, investId);
  if (invest) {
    return {
      investorAddress: invest._investorAddress,
      investorAccount: invest._investorAccount,
      amount: await toNumber(invest._amount),
      percentQuantity: invest._percentQuantity,
      interest: invest._interest,
      date: await toDate(invest._date),
    } as IInvest;
  }
};

//Cronjob sincrono todo
const payBackCron = () => {
  var CronJob = require("cron").CronJob;
  // Patrón de cron
  // Corre todos los dias a las 10:00 AM
  // 33 16 * * * *
  new CronJob(
    " 28 * * * * ",
    async function() {
      const logInfo = logStart("loans/controller.ts", "payBackCron");
      // Código a ejecutar
      try {
        const adminAccount = await Admin.findOne({
          username: Constants.DEFAULT_ADMIN,
        });
        if (!adminAccount) {
          throw new Error(`error message with `);
        }
        let paap = await getPaapInstance();
        const addresses: string[] = await callStatic(
          paap,
          "getLoansByState",
          adminAccount.account,
          "accepted"
        );
        logger.info(` ${logInfo.instance} ${addresses.length} loans found`);
        addresses.forEach(async (address) => {
          if (address != ZERO_ADDRESS) {
            let unlockRes: Promise<IUnlockRes> | IUnlockRes = unlockAccount(
              adminAccount.account
            );
            unlockRes = await unlockRes;
            if (unlockRes.unlocked) {
              let BCLoan = getLoanInstance(address);
              const tx = await sendMethod(
                await BCLoan,
                "payBack",
                adminAccount.account
              );
              if (tx) {
                console.log(`Loan paid successfully`);
                //console.log(`Loan '${tx.events.NewLoan[0].returnValues.loanAddress}' created successfully`);
              } else {
                console.error(`ERROR: cannot pay loan.`);
              }
            }
          }
          await timeout(2000);
        });
      } catch (error) {
        logger.error(` ${logInfo.instance} cannot pay loan. ${error.stack}`);
      } finally {
        logClose(logInfo);
      }
    },
    function() {
      // Código a ejecutar cuando la tarea termina.
      // Puedes pasar null para que no haga nada
    },
    true
  );
};

//Cronjob sincrono todo
const keepAliveCron = () => {
  var CronJob = require("cron").CronJob;
  // Patrón de cron
  // Corre todos los dias a las 10:00 AM
  // 33 16 * * * *
  new CronJob(
    "*/2 * * * * ",
    async function() {
      const logInfo = logStart("loans/controller.ts", "payBackCron", "trace");
      // Código a ejecutar
      try {
        await provider.listAccounts();
        logger.debug("================= KEEP ALIVE ===================");
      } catch (error) {
        logger.error(error);
      } finally {
        logClose(logInfo);
      }
    },
    function() {
      // Código a ejecutar cuando la tarea termina.
      // Puedes pasar null para que no haga nada
    },
    true
  );
};

function timeout(ms: number): Promise<number> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

payBackCron();
keepAliveCron();