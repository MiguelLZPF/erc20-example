import { Request, Response, NextFunction } from "express";
import { logger, logStart, logClose } from "../../middleware/logger";
import {
  State,
  IPublishLoan_res,
  IGetLoan_res,
  ICreateLoan_res,
  IGetPayPlan_res,
  IGetInvests_res,
  IMakeInvest_res,
  IGetLoans_res,
  IGetLoans_req,
  IGetLoan_req,
  isState,
} from "../../models/Loan";
import { isAddress } from "ethers/lib/utils";
import { ZERO_ADDRESS } from "../../middleware/blockchain";
import { ethers } from "ethers";


export const check_getLoan = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logInfo = logStart(
    "authentication/checks.ts",
    "check_getLoan",
    "trace"
  );
  let httpCode = 400;
  let body: IGetLoan_req = req.body;
  let result: IGetLoan_res = {
    message: "PARAM ERROR: cannot get loan with given parameters",
  };

  try {
    if (!req.body.senderAccount) {
      result.message = result.message.concat(
        ". Cannot find sender account in token"
      );
      throw new Error(`senderAccount not given by auth middleware`);
    }
    if (!req.params.param) {
      // should never enter here because is a getAllLoans() call then
      // maybe if they try query params....
      result.message = result.message.concat(
        ". Cannot search if no param is given in the path"
      );
      throw new Error(`no path param found, need something to search for`);
    }
    // Main logic
    if (await isState(req.params.param)) {
      logger.debug(
        ` ${logInfo.instance} path param is a Loan State, searching loan by State...`
      );
      body.state = req.params.param as State;
    } else if (ethers.utils.isHexString(req.params.param,20) && isAddress(ethers.utils.getAddress(req.params.param.toLowerCase()))) {
      logger.debug(
        ` ${logInfo.instance} path param is a Loan address, searching loan by address...`
      );
      body.loanAddress = ethers.utils.getAddress(req.params.param.toLowerCase());
    } else if (!isNaN(+req.params.param)) {
      logger.debug(
        ` ${logInfo.instance} path param is a Loan risk, searching loan by risk...`
      );
      body.risk = +req.params.param;
    } else if ((typeof req.params.param) === "string") {
      result.message = result.message.concat(
        ". The param is not address, state or risk."
      );
      throw new Error(
        `The param is not address, state or risk.`
      );
    }

    // Put here all strange cases that mey not been taken
    if (body.loanAddress && body.loanAddress == ZERO_ADDRESS) {
      result.message = result.message.concat(
        ". Loan address is '0x000... not valid'"
      );
      throw new Error(`loanAddress is zero address why?`);
    }
    if (body.risk && (body.risk < 0 || body.risk > 200)) {
      result.message = result.message.concat(
        ". Risk range is not valid, should be integer above 0 and below 200"
      );
      throw new Error(`risk invalid range, [0, 200)`);
    }

    logger.debug(` ${logInfo.instance} All parameters checked correctly`);
    next();
  } catch (error) {
    logger.error(` ${logInfo.instance} PARAM: ${error.stack}`);
    res.status(httpCode).send(result);
  } finally {
    logClose(logInfo);
  }
};

export const check_getLoans = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logInfo = logStart(
    "authentication/checks.ts",
    "check_getLoan",
    "trace"
  );
  let httpCode = 400;
  let body: IGetLoans_req = req.body;
  let result: IGetLoans_res = {
    message: "PARAM ERROR: cannot get loans with given parameters",
  };

  try {
    // check if query params for list search and puts them in body
    body.maxQuantity = req.query.maxQuantity
      ? +req.query.maxQuantity
      : undefined;
    body.minQuantity = req.query.minQuantity
      ? +req.query.minQuantity
      : undefined;
    // Date.parse() validates string Date format
    body.fromDate = req.query.fromDate
      ? new Date(Date.parse(req.query.fromDate as string))
      : undefined;
    body.toDate = req.query.toDate
      ? new Date(Date.parse(req.query.toDate as string))
      : undefined;
    // if minQuantity is not number
    if (body.minQuantity && typeof body.minQuantity != "number") {
      result.message = result.message.concat(
        ". The param minQuantity is not a number."
      );
      throw new Error(
        `The param minQuantity is not a number. ${body.minQuantity}`
      );
    }
    // if maxQuantity is not number
    if (body.maxQuantity && typeof body.maxQuantity != "number") {
      result.message = result.message.concat(
        ". The param maxQuantity is not a number."
      );
      throw new Error(
        `The param maxQuantity is not a number. ${body.maxQuantity}`
      );
    }
    // if dates, check dates
    if (body.fromDate && !(body.fromDate instanceof Date)) {
      result.message = result.message.concat(
        ". The param fromDate is not a valid Date."
      );
      throw new Error(
        `The param fromDate is not a valid Date. ${body.fromDate}`
      );
    }
    if (body.toDate && !(body.toDate instanceof Date)) {
      result.message = result.message.concat(
        ". The param toDate is not a valid Date."
      );
      throw new Error(`The param toDate is not a valid Date. ${body.toDate}`);
    }
    logger.debug(` ${logInfo.instance} All parameters checked correctly`);
    next();
  } catch (error) {
    logger.error(` ${logInfo.instance} PARAM: ${error.stack}`);
    res.status(httpCode).send(result);
  } finally {
    logClose(logInfo);
  }
};

export const check_createLoan = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logInfo = await logStart(
    "authentication/checks.ts",
    "check_createLoan",
    "trace"
  );
  let httpCode = 400;
  let result: ICreateLoan_res = {
    created: false,
    message: "PARAM ERROR: cannot create loan with given parameters",
  };

  try {
    if (!req.body.senderAccount) {
      result.message = result.message.concat(
        ". Cannot find sender account in token"
      );
      throw new Error(`senderAccount not given by auth middleware`);
    }
    if (!req.body.quantity) {
      result.message = result.message.concat(
        ". The param quantity is not in body."
      );
      throw new Error(`The param quantity is not in body`);
    }
    if (typeof req.body.quantity != "number") {
      result.message = result.message.concat(
        ". The param quantity is not a number."
      );
      throw new Error(`The param quantity is not a number`);
    }
    if (!req.body.minInterest) {
      result.message = result.message.concat(
        ". The param minInterest is not in body."
      );
      throw new Error(`The param minInterest is not in body`);
    }
    if (typeof req.body.minInterest != "number") {
      result.message = result.message.concat(
        ". The param minInterest is not a number."
      );
      throw new Error(`The param minInterest is not a number`);
    }
    if (!req.body.maxInterest) {
      result.message = result.message.concat(
        ". The param maxInterest is not in body."
      );
      throw new Error(`The param maxInterest is not in body`);
    }
    if (typeof req.body.maxInterest != "number") {
      result.message = result.message.concat(
        ". The param maxInterest is not a number."
      );
      throw new Error(`The param maxInterest is not a number`);
    }
    if (!req.body.deadLine) {
      result.message = result.message.concat(
        ". The param deadLine is not in body."
      );
      throw new Error(`The param deadLine is not in body`);
    }
    if (typeof req.body.deadLine != "string") {
      result.message = result.message.concat(
        ". The param deadLine is not a string."
      );
      throw new Error(`The param deadLine is not a string`);
    }
    if (!req.body.refundTime) {
      result.message = result.message.concat(
        ". The param refundTime is not in body."
      );
      throw new Error(`The param refundTime is not in body`);
    }
    if (typeof req.body.refundTime != "number") {
      result.message = result.message.concat(
        ". The param refundTime is not a number."
      );
      throw new Error(`The param refundTime is not a number`);
    }
    logger.debug(` ${logInfo.instance} All parameters checked correctly`);
    next();
  } catch (error) {
    logger.error(` ${logInfo.instance} PARAM: ${error.stack}`);
    res.status(httpCode).send(result);
  } finally {
    logClose(logInfo);
  }
};

export const check_publishLoan = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logInfo = await logStart(
    "authentication/checks.ts",
    "check_publishLoan",
    "trace"
  );
  let httpCode = 400;
  let result: IPublishLoan_res = {
    message: "PARAM ERROR: cannot publish loan with given parameters",
  };

  try {
    if (!req.body.senderAccount) {
      result.message = result.message.concat(". Cannot find account in token");
      throw new Error(`senderAccount not given by auth middleware`);
    }
    if (!req.params.address) {
      result.message = result.message.concat(
        ". No param specified in route.'"
      );
      throw new Error(`no param specified in route`);
    }
    // check if param is address
    if (!isAddress(ethers.utils.getAddress(req.params.address.toLowerCase()))) {
      result.message = result.message.concat(
        ". The specified param in route is not address."
      );
      throw new Error(`the specified param in route is not address`);
    }
    req.body.address = ethers.utils.getAddress(req.params.address.toLowerCase());
    if(!req.body.risk){
      result.message = result.message.concat(
        ". The param risk is not in body."
      );
      throw new Error(`The param risk is not in body`);
    }
    if(typeof req.body.risk != "number"){
      result.message = result.message.concat(
        ". The param risk is not a number."
      );
      throw new Error(`The param risk is not a number`);
    }
    logger.debug(` ${logInfo.instance} All parameters checked correctly`);
    next();
  } catch (error) {
    logger.error(` ${logInfo.instance} PARAM: ${error.stack}`);
    res.status(httpCode).send(result);
  } finally {
    logClose(logInfo);
  }
};

export const check_makeInvestment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logInfo = await logStart(
    "authentication/checks.ts",
    "check_makeInvestment",
    "trace"
  );
  let httpCode = 400;
  let result: IMakeInvest_res = {
    invested: false,
    message: "PARAM ERROR: cannot publish loan with given parameters",
  };
  try {
    if (!req.body.senderAccount) {
      result.message = result.message.concat(". Cannot find account in token");
      throw new Error(`senderAccount not given by auth middleware`);
    }
    if (!req.params.address) {
      result.message = result.message.concat(". No param specified in route.'");
      throw new Error(`no param specified in route`);
    }
    // check if param is address
    if (!isAddress(ethers.utils.getAddress(req.params.address.toLowerCase()))) {
      result.message = result.message.concat(
        ". The specified param in route is not address."
      );
      throw new Error(`the specified param in route is not address`);
    }
    req.body.address = ethers.utils.getAddress(req.params.address.toLowerCase());
    if (!req.body.interest) {
      result.message = result.message.concat(
        ". The param interest is not in body."
      );
      throw new Error(`The param interest is not in body`);
    }
    if (!req.body.amount) {
      result.message = result.message.concat(
        ". The param amount is not in body."
      );
      throw new Error(`The param amount is not in body`);
    }
    if (typeof req.body.interest != "number") {
      result.message = result.message.concat(
        ". The param interest is not a number."
      );
      throw new Error(`The param amount is not a number`);
    }
    if (typeof req.body.amount != "number") {
      result.message = result.message.concat(
        ". The param amount is not a number."
      );
      throw new Error(`The param amount is not a number`);
    }
    logger.debug(` ${logInfo.instance} All parameters checked correctly`);
    next();
  } catch (error) {
    logger.error(` ${logInfo.instance} PARAM: ${error.stack}`);
    res.status(httpCode).send(result);
  } finally {
    logClose(logInfo);
  }
};

export const check_getPayPlan = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logInfo = await logStart(
    "authentication/checks.ts",
    "check_getPayPlan",
    "trace"
  );
  let httpCode = 400;
  let result: IGetPayPlan_res = {
    message: "PARAM ERROR: cannot get pay plan with given parameters",
  };

  try {
    if (!req.body.senderAccount) {
      result.message = result.message.concat(
        ". Cannot find sender account in token"
      );
      throw new Error(`senderAccount not given by auth middleware`);
    }
    if (!req.body.loanAddress) {
      result.message = result.message.concat(
        ". Cannot find loan address in body"
      );
      throw new Error(`loanAddress not given by auth middleware`);
    }
    if (!ethers.utils.isHexString(req.params.loanAddress,20) && !isAddress(ethers.utils.getAddress(req.params.loanAddress.toLowerCase()))) {
      result.message = result.message.concat(
        ". The specified param in body is not address."
      );
      throw new Error(`the specified param in body is not address`);
    }
    logger.debug(` ${logInfo.instance} All parameters checked correctly`);
    next();
  } catch (error) {
    logger.error(` ${logInfo.instance} PARAM: ${error.stack}`);
    res.status(httpCode).send(result);
  } finally {
    logClose(logInfo);
  }
};

export const check_getInvests = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logInfo = await logStart(
    "authentication/checks.ts",
    "check_getInvests",
    "trace"
  );
  let httpCode = 400;
  let result: IGetInvests_res = {
    message: "PARAM ERROR: cannot get pay plan with given parameters",
  };

  try {
    if (!req.body.senderAccount) {
      result.message = result.message.concat(
        ". Cannot find sender account in token"
      );
      throw new Error(`senderAccount not given by auth middleware`);
    }
    if (!req.body.loanAddress) {
      result.message = result.message.concat(
        ". Cannot find loan address in body"
      );
      throw new Error(`loanAddress not given by auth middleware`);
    }
    if (!isAddress(ethers.utils.getAddress(req.params.loanAddress.toLowerCase()))) {
      result.message = result.message.concat(
        ". The specified param in body is not address."
      );
      throw new Error(`the specified param in body is not address`);
    }
    req.params.loanAddress = ethers.utils.getAddress(req.params.loanAddress.toLowerCase());
    logger.debug(` ${logInfo.instance} All parameters checked correctly`);
    next();
  } catch (error) {
    logger.error(` ${logInfo.instance} PARAM: ${error.stack}`);
    res.status(httpCode).send(result);
  } finally {
    logClose(logInfo);
  }
};

export const check_acceptLoan = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logInfo = await logStart(
    "authentication/checks.ts",
    "check_acceptLoan",
    "trace"
  );
  let httpCode = 400;
  let result: IPublishLoan_res = {
    message: "PARAM ERROR: cannot accept loan with given parameters",
  };

  try {
    if (!req.body.senderAccount) {
      result.message = result.message.concat(". Cannot find account in token");
      throw new Error(`senderAccount not given by auth middleware`);
    }
    if (!req.params.address) {
      result.message = result.message.concat(
        ". No param specified in route.'"
      );
      throw new Error(`no param specified in route`);
    }
    // check if param is address
    if (!isAddress(ethers.utils.getAddress(req.params.address.toLowerCase()))) {
      result.message = result.message.concat(
        ". The specified param in route is not address."
      );
      throw new Error(`the specified param in route is not address`);
    }
    req.body.address = ethers.utils.getAddress(req.params.address.toLowerCase());
    logger.debug(` ${logInfo.instance} All parameters checked correctly`);
    next();
  } catch (error) {
    logger.error(` ${logInfo.instance} PARAM: ${error.stack}`);
    res.status(httpCode).send(result);
  } finally {
    logClose(logInfo);
  }
};

export const check_cancelLoan = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logInfo = await logStart(
    "authentication/checks.ts",
    "check_cancelLoan",
    "trace"
  );
  let httpCode = 400;
  let result: IPublishLoan_res = {
    message: "PARAM ERROR: cannot cancel loan with given parameters",
  };

  try {
    if (!req.body.senderAccount) {
      result.message = result.message.concat(". Cannot find account in token");
      throw new Error(`senderAccount not given by auth middleware`);
    }
    if (!req.params.address) {
      result.message = result.message.concat(
        ". No param specified in route.'"
      );
      throw new Error(`no param specified in route`);
    }
    // check if param is address
    if (!isAddress(ethers.utils.getAddress(req.params.address.toLowerCase()))) {
      result.message = result.message.concat(
        ". The specified param in route is not address."
      );
      throw new Error(`the specified param in route is not address`);
    }
    req.body.address = ethers.utils.getAddress(req.params.address.toLowerCase());
    logger.debug(` ${logInfo.instance} All parameters checked correctly`);
    next();
  } catch (error) {
    logger.error(` ${logInfo.instance} PARAM: ${error.stack}`);
    res.status(httpCode).send(result);
  } finally {
    logClose(logInfo);
  }
};
