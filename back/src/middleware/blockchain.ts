import {
  ethers,
  ContractFactory,
  UnsignedTransaction,
  BigNumber,
  Contract,
  FixedNumber,
  providers,
} from "ethers";
import Web3 from "web3";
import { Constants, Variables } from "./../utils/config";
import Admin, { IAdmin } from "../models/Admin";
import * as PaapToken from "./../contracts/artifacts/PaapToken.json";
import * as PAAP from "./../contracts/artifacts/PAAP.json";
import * as User from "./../contracts/artifacts/User.json";
import * as Loan from "./../contracts/artifacts/Loan.json";
import { FunctionFragment, hexlify, isAddress } from "ethers/lib/utils";
import { logger, logStart, logClose, logObject } from "./logger";
import ExtUser, { IExtUser } from "../models/ExtUser";
import { decrypt } from "./auth";

let web3: any;
export let provider: providers.WebSocketProvider | providers.JsonRpcProvider;

export type TransactionReceipt = providers.TransactionReceipt;
export type TransactionResponse = providers.TransactionResponse;
export interface IUnlockRes {
  unlocked: boolean;
  delegated?: boolean;
}

// decimals used in Blockchain
export const DECIMALS = 18;
// address 0x00000... (bytes20) to compare
export const ZERO_ADDRESS = hexlify({ length: 20 });
const MAX_GAS_LIMIT = BigNumber.from("0x23c3ffff"); //("0x23C34600"); // 600000000
const GAS_OPTS = { gasPrice: "0x00", gasLimit: "0x23c3ffff" };

export let tokenInstance: Contract | undefined;
export let paapInstance: Contract | undefined;

const configProviders = async () => {
  const logInfo = logStart("blockchain.ts", "configProviders", "trace");

  const web3Opt_rpc = {
    keepAlive: true,
    timeout: 20000, // milliseconds,
    //headers: [{name: 'Access-Control-Allow-Origin', value: '*'},{...}],
    //withCredentials: false,
    //agent: {http: http.Agent(...), baseUrl: ''}
  };
  const web3Opt_ws = {
    timeout: 30000, // ms

    // Useful for credentialed urls, e.g: ws://username:password@localhost:8546
    /* headers: {
      authorization: "Basic username:password",
    }, */

    clientConfig: {
      // Useful if requests are large
      //maxReceivedFrameSize: 100000000, // bytes - default: 1MiB
      //maxReceivedMessageSize: 100000000, // bytes - default: 8MiB

      // Useful to keep a connection alive
      keepalive: true,
      keepaliveInterval: 60000, // ms
    },

    // Enable auto reconnection
    reconnect: {
      auto: true,
      delay: 5000, // ms
      maxAttempts: 20,
      onTimeout: false,
    },
  };

  try {
    const protocol = Constants.WEB3_PROTOCOL == "RPC" ? "http" : "ws";
    const ip = Constants.WEB3_IP;
    const port = Constants.WEB3_PORT;
    const route = Constants.WEB3_ROUTE;
    const uri = `${protocol}://${ip}:${port}/${route}`;
    const options = Constants.WEB3_PROTOCOL == "RPC" ? web3Opt_rpc : web3Opt_ws;
    // Connect Provider with given params
    await connectProviders(protocol, uri, options);
    if (!web3 || !provider) {
      throw new Error(` ${logInfo.instance} Providers not connected`);
    }
    // Show warning if not Alastria
    if (ip != "34.249.142.75") {
      logger.warn(
        ` ${logInfo.instance} Not using ALASTRIA T network. Using '${ip}' network`
      );
    } else {
      logger.info(
        ` ${logInfo.instance} Using ALASTRIA T Network :-) (Be patient...)`
      );
    }
    web3.currentProvider.on("reconnect", async () => {
      // Conect Provider with given params
      connectProviders(protocol, uri, options);
      logger.warn(`RECONNECTING PROVIDERS...`);
    });
    provider.on("reconnect", async () => {
      // Conect Provider with given params
      connectProviders(protocol, uri, options);
      logger.warn(`RECONNECTING PROVIDERS...`);
    });
  } catch (e) {
    logger.error(` ${logInfo.instance} Configuring Providers. ${e.stack}`);
  } finally {
    logClose(logInfo);
  }
};

const connectProviders = async (
  protocol: string,
  uri: string,
  options: any
) => {
  const logInfo = logStart("blockchain.ts", "connectProviders", "trace");
  try {
    if (protocol == "http") {
      //// WEB3 JS PROVIDER
      web3 = new Web3(new Web3.providers.HttpProvider(uri, options));
      //// ETHERS JS PROVIDER
      provider = new ethers.providers.JsonRpcProvider(uri);
    } else {
      //// WEB3 JS PROVIDER
      web3 = new Web3(new Web3.providers.WebsocketProvider(uri, options));
      //// ETHERS JS PROVIDER
      provider = new ethers.providers.WebSocketProvider(uri);
    }
    showProviders();
  } catch (error) {
    logger.error(` ${logInfo.instance} Connecting Providers. ${error.stack}`);
  } finally {
    logClose(logInfo);
  }
};

const showProviders = async () => {
  const logInfo = logStart("blockchain.ts", "showProviders", "trace");
  let tokenFound = false;
  let paapFound = false;
  try {
    if (
      isAddress(Variables.TOKEN_ADDRESS) &&
      isAddress(Variables.PAAP_ADDRESS)
    ) {
      const token = new Contract(
        Variables.TOKEN_ADDRESS,
        PaapToken.abi,
        provider
      );
      const paap = new Contract(Variables.PAAP_ADDRESS, PAAP.abi, provider);
      if (token && token.address == Variables.TOKEN_ADDRESS) {
        tokenFound = true;
      }
      if (paap && paap.address == Variables.PAAP_ADDRESS) {
        paapFound = true;
      }
    }
  } catch (error) {
    logger.error(error);
  }

  logger.info(` ${logInfo.instance} Providers connected:
          Web3: ${logObject(web3.currentProvider.url)}
          Ethers: ${logObject(provider.connection.url)}
          
          Current Token: ${
            Variables.TOKEN_ADDRESS
          } (Deployed in Network: ${tokenFound})
          Current Paap: ${
            Variables.PAAP_ADDRESS
          } (Deployed in Network: ${paapFound}) \n`);
  //logger.debug(` Delegate accounts: [${await provider.listAccounts()}]`)
  logger.debug(
    ` ${logInfo.instance} Delegate accounts: [${await getDelegateAddrs(10)}]`
  );
  logClose(logInfo);
};

// =================== WEB 3 only ===========================

/**
 * @title New Account
 * @dev   function that creates a new account locked with password
 * @param password the password that locks the account
 * @return the address of the new account
 */
export const newAccount = async (password: string) => {
  const logInfo = logStart("blockchain.ts", "newAccount", "trace");
  try {
    logger.debug(` ${logInfo.instance} creating new delegate account...`);
    return await web3.eth.personal.newAccount(password);
  } catch (error) {
    console.error(`Error creating new account. ${error}
      ${error.stack}`);
  }
  logClose(logInfo);
};

/**
 * @title Lock Account
 * @dev   function that locks an account
 * @param accountAddress the account's address to lock
 * @return the address of the new account
 */
/* export const lockAccount = async (accountAddress: string): Promise<boolean> => {
  try {
    return await web3.eth.personal.lockAccount(accountAddress);
  } catch (error) {
    console.error(`Error locking account ${accountAddress}`);
    console.error(error);
    return false;
  }
} */
/**
 * @title Unlock Account
 * @dev   function that unlocks a new account with password
 * @param accountAddress address of the account to unlock
 * @param password the password that unlocks the account
 * @param unlockTime seconds to unlock the acoount
 * @return boolean: true = unlocked
 */
/* export const unlockAccount = async (
  accountAddress: string,
  password: string,
  unlockTime?: number
): Promise<boolean> => {

  try {
    if (unlockTime != undefined) {
      return await web3.eth.personal.unlockAccount(
        accountAddress,
        password,
        unlockTime
      );
    } else {
      return await web3.eth.personal.unlockAccount(
        accountAddress,
        password,
      );
    }
  } catch (error) {
    console.error(`Error unlocking account ${accountAddress}`);
    console.error(error);
    return false;
  }
} */
// ===========================================================

// =================== ETHERS only ===========================

// // ================ ACCOUNTS ===================

const getDelegateAddrs = async (
  quantity?: number,
  start?: number,
  end?: number
) => {
  const allAcc = await provider.listAccounts();
  if (start && end) {
    return allAcc.slice(start, end);
  } else if (quantity && start) {
    return allAcc.slice(start, start + quantity);
  } else if (quantity) {
    return allAcc.slice(allAcc.length - quantity);
  }
  return allAcc.slice;
};

/**
 * @title is Delegate Account ?
 * @dev   checks if an account's address is delegate or not
 * @param account address of the account to check
 * @returns true if given account is in the providers account list
 */
export const isDelegateAcc = async (account: string) => {
  const logInfo = logStart("blockchain.ts", "isDelegateAccount", "trace");
  try {
    const accounts = await provider.listAccounts();
    if (accounts.includes(account)) {
      logger.trace(` ${logInfo.instance} account '${account}' is delegate`);
      return true;
    } else {
      logger.trace(` ${logInfo.instance} account '${account}' is not delegate`);
      return false;
    }
  } catch (error) {
    logger.error(` ${logInfo.instance} ERROR: ${error.trace}`);
    return false;
  } finally {
    logClose(logInfo);
  }
};

/**
 * @title Unlock Account
 * @dev   function that unlocks a delegated account with password
 * @param account address of the account to unlock
 * @param password the password that unlocks the account
 * @return boolean: true = unlocked
 */
export const unlockAccount = async (
  account: string,
  password?: Promise<string> | string
) => {
  const logInfo = logStart("blockchain.ts", "unlockAccount", "trace");
  try {
    // async check if delegate account
    const isDelegate = isDelegateAcc(account);
    // if no password given
    if (!password) {
      let userDBnoNull: IExtUser | IAdmin | null;
      const userDB = ExtUser.findOne({ account: account });
      const adminDB = Admin.findOne({ account: account });

      userDBnoNull = (await userDB) ? await userDB : await adminDB;
      if (!userDBnoNull || !userDBnoNull.account) {
        throw new Error(`cannot find account in DB`);
      }
      password = decrypt(userDBnoNull.accPass!);
    }
    if (await isDelegate) {
      logger.debug(` ${logInfo.instance} unlocking account '${account}...'`);
      return {
        unlocked: await provider.getSigner(account).unlock(await password),
        delegated: true,
      } as IUnlockRes;
    } else {
      logger.warn(
        ` ${logInfo.instance} account '${account}' is external, cannot unlock`
      );
      return {
        unlocked: false,
        delegated: false,
      } as IUnlockRes;
    }
  } catch (error) {
    logger.error(
      ` ${logInfo.instance} Error unlocking account ${account}. ${error.stack}`
    );
    return {
      unlocked: false,
      delegated: undefined,
    } as IUnlockRes;
  } finally {
    logClose(logInfo);
  }
};

// // ================ CONTRACTS ===================

/**
 * @title Deploy Contract
 * @dev   deploy an smart contract to the blockchain directly if delegate account, else creates the deploy unsigned TX
 * @param contractABI ABI JSON interface from the contract to deploy
 * @param contractByteCode The byte code of the contract
 * @param from the account address from which the contract will be deployed
 * @param methodParams (optional) list of params to send to the contract's contructor()
 * @param gasPrice (optional) The gas price in wei to use for transactions
 * @param gasLimit (optional) The maximum gas provided for a transaction
 * @returns the Contract instance of the deployed Contract or the unsigned TX
 */
const deployContract = async (
  contractABI: any,
  contractByteCode: string,
  from: string,
  methodParams?: any[]
) => {
  const logInfo = logStart("blockchain.ts", "deployContract", "trace");
  try {
    methodParams ? methodParams : (methodParams = []);
    //if (await isDelegateAcc(from)) {
    const delegateSigner = provider.getSigner(from);
    const factory = new ContractFactory(
      contractABI,
      contractByteCode,
      delegateSigner
    );
    logger.debug(`Deploying contact from '${from}'...`);
    // Deploy smart contract and wait until deployed
    return await (await factory.deploy(...methodParams, GAS_OPTS)).deployed();
  } catch (error) {
    logger.error(`Error deploying Smart Contract. ${error.stack}`);
  } finally {
    logClose(logInfo);
  }
};

export const deployTokenContract = async (from: string) => {
  // save token instance
  const saveTokenInst = async () => {
    await new Promise((resolve) => setTimeout(resolve, 10000));
    await getTokenInstance();
  };
  saveTokenInst();
  return deployContract(PaapToken.abi, PaapToken.bytecode, from);
};

export const deployPAAPContract = async (from: string) => {
  try {
    return deployContract(PAAP.abi, PAAP.bytecode, from);
  } catch (error) {
    logger.error(error.trace);
  } finally {
    savePaapInst();
  }
};

const savePaapInst = async () => {
  await new Promise((resolve) => setTimeout(resolve, 10000));
  await getPaapInstance();
};

export const deployUserContract = async (from: string) => {
  return deployContract(User.abi, User.bytecode, from);
};

export const deployLoanContract = async (from: string) => {
  return deployContract(Loan.abi, Loan.bytecode, from);
};

/**
 * @title Get Token Instance
 * @description Method that returns the instance from the blockchain
 */
export const getTokenInstance = async () => {
  tokenInstance = tokenInstance
    ? tokenInstance
    : new Contract(Variables.TOKEN_ADDRESS, PaapToken.abi, provider);
  return tokenInstance;
};

/**
 * @title Get PAAP Instance
 * @description Method that returns the instance from the blockchain
 */
export const getPaapInstance = async () => {
  paapInstance = paapInstance
    ? paapInstance
    : new Contract(Variables.PAAP_ADDRESS, PAAP.abi, provider);
  return paapInstance;
};

/**
 * @title Get User Instance
 * @description Method that returns the instance from the blockchain
 * @param userAddr {string} User SC's address
 */
export const getUserInstance = async (userAddr: string) => {
  return new Contract(userAddr, User.abi, provider);
};

/**
 * @title Get Loan Instance
 * @description Method that returns the instance from the blockchain
 * @param loanAddr {string} Loan SC's address
 */
export const getLoanInstance = async (loanAddr: string) => {
  return new Contract(loanAddr, Loan.abi, provider);
};

// Force Calls to SC (to get return from a non view function)
export const callStatic = async (
  contractInstance: Contract,
  contractMethod: string,
  from?: string,
  ...methodParams: any[]
) => {
  const logInfo = logStart("blockchain.ts", "callStatic", "trace");
  try {
    if (from) {
      const signer = provider.getSigner(from);
      contractInstance = contractInstance.connect(signer);
      logger.debug(
        ` ${
          logInfo.instance
        } Static Call to blockchanin: from ${await contractInstance.signer.getAddress()} to ${contractMethod}(${methodParams})`
      );
    } else {
      contractInstance = contractInstance.connect(provider);
      logger.debug(
        ` ${logInfo.instance} Static Call to blockchanin: from Net Provider to ${contractMethod}(${methodParams})`
      );
    }
    return await contractInstance.callStatic[contractMethod](...methodParams);
  } catch (error) {
    logger.error(
      ` ${logInfo.instance} Error static calling Contract(${contractInstance.address}). ${error}`
    );
  } finally {
    logClose(logInfo);
  }
};
/**
 * @title Send Method
 * This function sends the transaction that trigers a contract's method
 * it does not matter if it is delegate or external account
 * @param contractInstance the contract instance to call the method
 * @param contractMethod method of the contract to be transact
 * @param from the account address from which the transaction will be made
 * @param methodParams parameters to send to contract method
 * @param gasPrice (optional) The gas price in wei to use for transactions
 * @param gasLimit (optional) The maximum gas provided for a transaction
 * @return the receipt result of sending the transaction if from is delegated
 * @return the unsigned transaction if from is external
 */
export const sendMethod = async (
  contractInstance: Contract,
  contractMethod: string,
  from: string,
  methodParams?: any[],
  nonce?: number | Promise<number>,
  gasLimit?: string | number,
  gasPrice?: string | number
) => {
  const logInfo = logStart("blockchain.ts", "sendMethod", "trace");
  try {
    methodParams ? methodParams : (methodParams = []);

    const delegateSigner = provider.getSigner(from);
    if (!delegateSigner || !ethers.utils.isAddress(delegateSigner._address)) {
      throw new Error("Cannot get the delegate signer");
    }
    contractInstance = contractInstance.connect(delegateSigner);
    logger.debug(
      ` ${
        logInfo.instance
      } Making delegate send ${await contractInstance.signer.getAddress()} --> ${contractMethod}(${methodParams}) `
    );
    const respTx: TransactionResponse = await contractInstance.functions[
      contractMethod
    ](...methodParams, GAS_OPTS);
    return await respTx.wait();
  } catch (error) {
    console.error(
      `Error calling Contract(${contractInstance.address}). ${error.stack}`
    );
  } finally {
    logClose(logInfo);
  }
};

export const sendMethodTx = async (
  contractInstance: Contract,
  contractMethod: string,
  from: string,
  methodParams?: any[],
  nonce?: number | Promise<number>,
  gasLimit?: string | number,
  gasPrice?: string | number
) => {
  const logInfo = logStart("blockchain.ts", "sendMethod", "trace");
  try {
    methodParams ? methodParams : (methodParams = []);
    nonce = nonce ? nonce : provider.getTransactionCount(from);
    let unsignedTx: UnsignedTransaction = await contractInstance.populateTransaction[
      contractMethod
    ](...methodParams);
    // complete unsigned Tx info
    unsignedTx.gasLimit = gasLimit
      ? BigNumber.from(+gasLimit)
      : BigNumber.from(MAX_GAS_LIMIT);
    unsignedTx.gasPrice = gasPrice
      ? BigNumber.from(+gasPrice)
      : BigNumber.from("0");
    unsignedTx.nonce = await nonce;
    logger.debug(
      ` ${logInfo.instance} return unsigned send Tx ${from} --> ${contractMethod}(${methodParams})`
    );
    return unsignedTx;
  } catch (error) {
    console.error(
      `Error calling Contract(${contractInstance.address}). ${error.stack}`
    );
  } finally {
    logClose(logInfo);
  }
};

/**
 * @title Universal Method Call
 * This function can be called to use any type of contract method whether
 * is a constant one or not
 * @param contractInstance the contract instance to call the method
 * @param contractMethod method of the contract to be transact
 * @param from the account address from which the transaction will be made
 * @param methodParams parameters to send to contract method
 * @param gasPrice (optional) The gas price in wei to use for transactions
 * @param gasLimit (optional) The maximum gas provided for a transaction
 * @param value (optional) the value transferred for the transaction in wei
 * @return the receipt result of sending the transaction if send
 * @return the method transaction object if call
 */
// DEPRECATED
const universalMethodCall = async (
  contractInstance: Contract,
  contractMethod: string,
  from?: string,
  methodParams?: any[],
  nonceOffset?: number,
  gasLimit?: string | number,
  gasPrice?: string | number
) => {
  const logInfo = await logStart(
    "blockchain.ts",
    "universalMethodCall",
    "trace"
  );
  try {
    nonceOffset ? nonceOffset : (nonceOffset = 0);
    methodParams ? methodParams : (methodParams = []);
    if (from && (await isDelegateAcc(from))) {
      // Is a delegate call or send
      // Check all functions to check if call or send
      let isCall,
        found = false;
      const fragments = contractInstance.interface.fragments;
      for (let i = 0; i < fragments.length; i++) {
        if (
          fragments[i].type == "function" &&
          fragments[i].name == contractMethod
        ) {
          isCall = FunctionFragment.from(fragments[i]).constant;
          found = true;
          break;
        }
      }
      if (!found) {
        logger.debug();
        throw new Error(`Cannot find method ${contractMethod} in interface`);
      }

      if (isCall) {
        // if is call, make a direct call with from if defined
        return await callStatic(
          contractInstance,
          contractMethod,
          from,
          methodParams
        );
      } else {
        const delegateSigner = provider.getSigner(from);
        if (
          !delegateSigner ||
          !ethers.utils.isAddress(delegateSigner._address)
        ) {
          throw new Error("Cannot get the delegate signer");
        }
        contractInstance = contractInstance.connect(delegateSigner);
        logger.debug(
          ` ${
            logInfo.instance
          } Making delegate send ${await contractInstance.signer.getAddress()} --> ${contractMethod}(${methodParams}) `
        );
        let unsignedTx: UnsignedTransaction = await contractInstance.populateTransaction[
          contractMethod
        ](...methodParams);

        // complete unsigned Tx info
        unsignedTx.gasLimit = gasLimit
          ? BigNumber.from(+gasLimit)
          : BigNumber.from(MAX_GAS_LIMIT);
        unsignedTx.gasPrice = gasPrice
          ? BigNumber.from(+gasPrice)
          : BigNumber.from("0");
        unsignedTx.nonce =
          (await delegateSigner.getTransactionCount()) + nonceOffset;

        return await delegateSigner.sendTransaction(unsignedTx);
      }
    } else {
      // Is a external wallet call
      // Check all functions to check if call or send
      let isCall,
        found = false;
      const fragments = contractInstance.interface.fragments;
      for (let i = 0; i < fragments.length; i++) {
        if (
          fragments[i].type == "function" &&
          fragments[i].name == contractMethod
        ) {
          isCall = FunctionFragment.from(fragments[i]).constant;
          found = true;
          break;
        }
      }
      if (!found) {
        throw new Error(`Cannot find method ${contractMethod} in interface`);
      }

      if (isCall) {
        // if is call, make a direct call with from if defined
        return await callStatic(
          contractInstance,
          contractMethod,
          from,
          methodParams
        );
      } else {
        // Is an external Send transaction which has to be signed
        let unsignedTx: UnsignedTransaction = await contractInstance.populateTransaction[
          contractMethod
        ](...methodParams);

        // complete unsigned Tx info
        unsignedTx.gasLimit = gasLimit
          ? BigNumber.from(+gasLimit)
          : BigNumber.from(MAX_GAS_LIMIT);
        unsignedTx.gasPrice = gasPrice
          ? BigNumber.from(+gasPrice)
          : BigNumber.from("0");
        unsignedTx.nonce = from
          ? (await provider.getTransactionCount(from)) + nonceOffset
          : undefined;
        logger.debug(
          ` ${logInfo.instance} return unsigned send Tx ${from} --> ${contractMethod}(${methodParams})`
        );
        return unsignedTx;
      }
    }
  } catch (error) {
    console.error(
      `Error calling Contract(${contractInstance.address}). ${error.stack}`
    );
  } finally {
    logClose(logInfo);
  }
};

export const sendTx = async (sTx: string) => {
  try {
    return provider.sendTransaction(sTx);
  } catch (error) {
    console.error(`ERROR: ${error}`);
  }
};

// ================ EVENTS ===================

export const checkEventInBlock = async (
  contractInstance: Contract,
  eventName: string,
  eventFilters: any[],
  startBlock?: number | string,
  endBlock?: number | string
) => {
  try {
    const filter = contractInstance.filters[eventName](...eventFilters);
    const event = await contractInstance.queryFilter(
      filter,
      startBlock,
      endBlock
    );
    if (event[0].event == eventName) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    logger.error(
      `ERROR: Checking Event in Blocks from "${startBlock}" to "${endBlock}". ${error.stack}`
    );
  }
};

// ================ UTILS ===================

/**
 * @title Unit Conversion Functions
 * @dev used for representing amounts in diferent units
 */
export const toBigNum = async (amount: number) => {
  // lost decimals
  //return BigNumber.from(amount).mul(BigNumber.from(10).pow(DECIMALS));
  return BigNumber.from(FixedNumber.fromString(amount.toString()));
};
export const toNumber = async (amounts: BigNumber | BigNumber[]) => {
  try {
    // Check if array or not
    if (!(amounts instanceof Array)) {
      return FixedNumber.fromValue(amounts, DECIMALS)
        .round(6)
        .toUnsafeFloat();
    } else {
      const result: number[] = [];
      amounts.forEach((amount) => {
        result.push(
          FixedNumber.fromValue(amount, DECIMALS)
            .round(6)
            .toUnsafeFloat()
        );
      });
      return result;
    }
  } catch (error) {
    console.error(`ERROR: ${error}`);
  }
};

/**
 * @title From Seconds To Date
 * @description converts into Date object any date in seconds or milliseconds. It is
 *              compatible with values or strings of values.
 * @param dates dates in seconds or millisecond, could be in number or BigNumber format
 * @param milliseconds sets the dates as seconds or milliseconds
 */
/* export const toDate = async (
  dates: number | number[] | BigNumber | BigNumber[],
  milliseconds?: boolean
) => {
  try {
    // default is true
    milliseconds == undefined ? (milliseconds = true) : (milliseconds = false);
    if (dates instanceof Array) {
      // date: number[] | BigNumber[]
      let result: Date[] = [];
      if (typeof dates[0] == "number") {
        // date: number[]
        dates = dates as number[];
      } else {
        // date: BigNumber[]
        dates = dates as BigNumber[];
        dates = (await toNumber(dates)) as number[];
      }
      dates.forEach(async(date)=>{
        result.push(milliseconds ? new Date(date) : new Date(date * 1000));
      })
      return result;
    } else {
      // date: number | bigNumber
      if (typeof dates == "number") {
        // date: number
        return milliseconds ? new Date(dates) : new Date(dates * 1000);
      } else {
        // date: BigNumber
        dates = parseInt(dates._hex);
        return milliseconds ? new Date(dates) : new Date(dates * 1000);
      }
      
    }
  } catch (error) {
    logger.error(`ERROR: ${error}`);
  }
}; */
export const toDate = async (
  dates: number | number[] | BigNumber | BigNumber[]
) => {
  try {
    if (dates instanceof Array) {
      // date: number[] | BigNumber[]
      let result: Date[] = [];
      if (typeof dates[0] == "number") {
        // date: number[]
        dates = dates as number[];
        dates.forEach(async (date) => {
          result.push(new Date(date * 1000));
        });
      } else {
        // date: BigNumber[]
        dates = dates as BigNumber[];
        dates.forEach(async (date) => {
          result.push(new Date(date.toNumber() * 1000));
        });
      }
      return result;
    } else {
      // date: number | bigNumber
      if (typeof dates == "number") {
        // date: number
        return new Date(dates * 1000);
      } else {
        // date: BigNumber
        return new Date(dates.toNumber() * 1000);
      }
    }
  } catch (error) {
    logger.error(`ERROR: ${error}`);
  }
};

export const tokensBalanceOf = async (account: string) => {
  return await toNumber(
    await callStatic(
      await getTokenInstance(),
      "balanceOf",
      (await Admin.findOne({ username: Constants.DEFAULT_ADMIN }))!.account,
      account
    )
  );
};

// Init Providers
configProviders();
