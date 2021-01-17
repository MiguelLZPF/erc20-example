import {
  ethers,
  ContractFactory,
  BigNumber,
  Contract,
  FixedNumber,
  providers,
  Signer,
  Wallet,
  Event,
} from "ethers";
import { Constants, Variables } from "./../utils/config";
import { ProxyAdmin } from "../typechain/ProxyAdmin";
import { ContractRegistry } from "../typechain/ContractRegistry";
import { IobManager } from "../typechain/IobManager";
import { MyToken } from "../typechain/MyToken";
import { Users } from "../typechain/Users";
import * as AProxyAdmin from "./../artifacts/@openzeppelin/contracts/proxy/ProxyAdmin.sol/ProxyAdmin.json";
import * as ATUP from "./../artifacts/@openzeppelin/contracts/proxy/TransparentUpgradeableProxy.sol/TransparentUpgradeableProxy.json";
import * as AContractRegistry from "./../artifacts/contracts/ContractRegistry.sol/ContractRegistry.json";
import * as AIobManager from "./../artifacts/contracts/IobManager.sol/IobManager.json";
import * as AUsers from "./../artifacts/contracts/Users.sol/Users.json";
import * as AMyToken from "./../artifacts/contracts/MyToken.sol/MyToken.json";
import { hexlify, isAddress } from "ethers/lib/utils";
import { logger, logStart, logClose, logObject } from "./logger";
import * as fs from "async-file";
import { deployWithRegistry, setTypes } from "./registry";
import { subscribeEvents } from "./events";

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
//export const ZERO_ADDRESS = hexlify({ length: 20 });
const MAX_GAS_LIMIT = BigNumber.from("0x23c3ffff"); //("0x23C34600"); // 600000000
export const GAS_OPT = { gasPrice: "0x00", gasLimit: "0x23c3ffff" };

export let proxyAdmin: ProxyAdmin | undefined;
export let contractRegistry: ContractRegistry | undefined;
export let iobManager: IobManager | undefined;
export let myToken: MyToken | undefined;
export let users: Users | undefined;

const configProviders = async () => {
  const logInfo = logStart("blockchain.ts", "configProviders", "trace");

  try {
    const protocol = Constants.WEB3_PROTOCOL == "RPC" ? "http" : "ws";
    const ip = Constants.WEB3_IP;
    const port = Constants.WEB3_PORT;
    const route = Constants.WEB3_ROUTE;
    const uri = `${protocol}://${ip}:${port}/${route}`;
    // Connect Provider with given params
    await connectProviders(protocol, uri);
    if (!provider || !provider._isProvider) {
      throw new Error(` ${logInfo.instance} Provider not connected`);
    }
    console.log(provider._events)
  } catch (e) {
    logger.error(` ${logInfo.instance} Configuring Provider. ${e.stack}`);
  } finally {
    logClose(logInfo);
  }
};

const connectProviders = async (protocol: string, uri: string) => {
  const logInfo = logStart("blockchain.ts", "connectProviders", "trace");
  try {
    if (protocol == "http") {
      //// ETHERS JS PROVIDER
      provider = new ethers.providers.JsonRpcProvider(uri);
    } else {
      //// ETHERS JS PROVIDER
      provider = new ethers.providers.WebSocketProvider(uri);
    }
    /* provider.on("reconnect", () => {
      // Conect Provider with given params
      connectProviders(protocol, uri);
      logger.warn(`RECONNECTING PROVIDERS...`);
    }); */
    provider.on("error", function(tx) {
      console.log(`Blockchain error: ${tx}`)
    })
    provider.on("block", (BlockNumber) => {
      console.log(`New Block mined: ${BlockNumber}`);
    })
    
    showProviders();
  } catch (error) {
    logger.error(` ${logInfo.instance} Connecting Providers. ${error.stack}`);
  } finally {
    logClose(logInfo);
  }
};

const showProviders = async () => {
  const logInfo = logStart("blockchain.ts", "showProviders", "trace");

  // Fund wallets with ether
  await fundWallets();
  // Init Smart Contracts
  const initialized = await initContracts();

  logger.info(` ${logInfo.instance}
  Providers connected:
          Ethers: ${logObject(provider.connection.url)}
  Contracts initialized (${initialized}):
          Proxy Admin: ${proxyAdmin?.address}
          Contract Registry: ${contractRegistry?.address}
          IOB Manager: ${iobManager?.address}
          My Token: ${myToken?.address}
          Users: ${users?.address} \n`);
  logClose(logInfo);
};

const fundWallets = async () => {
  const logInfo = logStart("blockchain.ts", "fundWallets", "info");
  for (let i = 0; i < 3; i++) {
    const signer = provider.getSigner(i);
    await signer.unlock("");
    if (i == 0) {
      const admin = (await retrieveWallet(Constants.ADMIN_PATH, Constants.ADMIN_PASSWORD))!;
      if (((await toNumber(await admin.getBalance())) as number) < 10) {
        await signer.sendTransaction({
          to: admin.address,
          value: BigNumber.from("0x56BC75E2D63100000"), //100 eth
        });
        logger.info(` ${logInfo.instance} Wallet ${admin.address} founded with 100 ETH`);
      }
    } else if (i == 1) {
      const user00 = (await retrieveWallet("./src/keystore/user_00.json", "password"))!;
      if (((await toNumber(await user00.getBalance())) as number) < 10) {
        await signer.sendTransaction({
          to: user00.address,
          value: BigNumber.from("0x56BC75E2D63100000"), //100 eth
        });
        logger.info(` ${logInfo.instance} Wallet ${user00.address} founded with 100 ETH`);
      }
    } else if (i == 2) {
      const user01 = (await retrieveWallet("./src/keystore/user_01.json", "password"))!;
      if (((await toNumber(await user01.getBalance())) as number) < 10) {
        await signer.sendTransaction({
          to: user01.address,
          value: BigNumber.from("0x56BC75E2D63100000"), //100 eth
        });
        logger.info(` ${logInfo.instance} Wallet ${user01.address} founded with 100 ETH`);
      }
    }
  }
  logClose(logInfo);
};

const initContracts = async () => {
  const logInfo = logStart("blockchain.ts", "initContracts", "info");
  let subscribed: Promise<boolean> | boolean = false;
  try {
    // Get admin Wallet
    const admin = (await retrieveWallet(Constants.ADMIN_PATH, Constants.ADMIN_PASSWORD))!;
    let deployedNstored = false;
    // if addresses defined, get contracts
    if (
      Variables.PROXY_ADMIN &&
      isAddress(Variables.PROXY_ADMIN) &&
      Variables.CONTRACT_REGISTRY &&
      isAddress(Variables.CONTRACT_REGISTRY) &&
      Variables.IOB_MANAGER &&
      isAddress(Variables.IOB_MANAGER) &&
      Variables.MY_TOKEN &&
      isAddress(Variables.MY_TOKEN) &&
      Variables.USERS &&
      isAddress(Variables.USERS)
    ) {
      proxyAdmin = new Contract(Variables.PROXY_ADMIN, AProxyAdmin.abi, provider) as ProxyAdmin;
      contractRegistry = new Contract(
        Variables.CONTRACT_REGISTRY,
        AContractRegistry.abi,
        provider
      ) as ContractRegistry;
      iobManager = new Contract(Variables.IOB_MANAGER, AIobManager.abi, provider) as IobManager;
      myToken = new Contract(Variables.MY_TOKEN, AMyToken.abi, provider) as MyToken;
      users = new Contract(Variables.USERS, AUsers.abi, provider) as Users;
      deployedNstored = true;
    } else {
      // no addresses defined
      await deployContracts(admin);
      deployedNstored = true;
    }
    if (!deployedNstored) {
      throw new Error("Cannot deploy or found the smart contracts");
    }
    subscribed = subscribeEvents(proxyAdmin!, contractRegistry!, iobManager!, myToken!, users!);
    return deployedNstored;
  } catch (error) {
    logger.error(` ${logInfo.instance} Initializing Contracts. ${error.stack}`);
    return false;
  } finally {
    logger.info(` ${logInfo.instance} Subscribed to events: ${await subscribed}`);
    logClose(logInfo);
  }
};

const deployContracts = async (admin?: Wallet) => {
  const logInfo = logStart("blockchain.ts", "deployContracts", "info");
  try {
    admin = admin ? admin : (await retrieveWallet(Constants.ADMIN_PATH, Constants.ADMIN_PASSWORD))!;

    // Proxy Admin
    logger.info(` ${logInfo.instance} Deploying Proxy Admin contract...`);

    proxyAdmin = (await deploy(AProxyAdmin, admin)) as ProxyAdmin;

    logger.info(`Proxy Admin successfully deployed:
      - Proxy Admin address: ${proxyAdmin.address}
      - Proxy Admin's owner: ${await proxyAdmin.callStatic.owner(GAS_OPT)}\n`);

    // Registry
    logger.info(` ${logInfo.instance} Deploying registry contract...`);

    contractRegistry = (await deployUpgradeable(
      AContractRegistry,
      admin,
      proxyAdmin
    )) as ContractRegistry;

    logger.info(`Registry successfully deployed:
      - Registry logic address: ${await proxyAdmin.callStatic.getProxyImplementation(
        contractRegistry.address,
        GAS_OPT
      )}
      - Registry proxy address: ${contractRegistry.address}
      - Registry proxy's admin: ${await proxyAdmin.callStatic.getProxyAdmin(
        contractRegistry.address,
        GAS_OPT
      )} \n`);

    const initEvent = (await getEvents(
      contractRegistry,
      "Initialized",
      [contractRegistry.address, admin.address],
      true
    )) as Event;

    if (!initEvent || !initEvent.args) {
      throw new Error(`Initialize event not retreived`);
    }
    if (!initEvent.args.registry || !isAddress(initEvent.args.registry)) {
      throw new Error(`Initialize event's registry address not valid`);
    }
    if (
      !initEvent.args.owner ||
      !isAddress(initEvent.args.owner || initEvent.args.owner != admin.address)
    ) {
      throw new Error(`Registry owner should be admin`);
    }

    // Contract types

    logger.info(` ${logInfo.instance} Setting contract Types and Versions...`);

    const receipts = await setTypes(contractRegistry, ["iob-manager", "iob-token", "iob-users"]);
    const newTypeEvents = (await getEvents(
      contractRegistry,
      "NewType",
      [null, null, null],
      false,
      receipts[0].blockNumber,
      receipts[2].blockNumber
    )) as Event[];

    if (!newTypeEvents || newTypeEvents.length != 3) {
      throw new Error(`Types not registred`);
    }

    logger.info(` ${logInfo.instance} Deploying Users contract...`);

    users = (await deployWithRegistry(contractRegistry, AUsers, admin, "iob-users", true)) as Users;
    if (!users || !users.address) {
      throw new Error(`Users contract not deployed`);
    }

    let deployEvent = (await getEvents(
      contractRegistry,
      "Deployed",
      [null, null, admin.address, null, null],
      true,
      await provider.getBlockNumber(),
      await provider.getBlockNumber()
    )) as Event;
    if (!deployEvent || !deployEvent.args) {
      throw new Error(`Users contract deploy event not found`);
    }
    if (deployEvent.args?.owner != admin.address) {
      throw new Error(`Users contract's owner is not the admin wallet`);
    }
    if (deployEvent.args?.proxy == deployEvent.args?.logic) {
      throw new Error(`Proxy's address cannot be the same as logic's address`);
    }

    logger.info(` ${logInfo.instance} Deploying IobManager contract...`);

    iobManager = (await deployWithRegistry(
      contractRegistry,
      AIobManager,
      admin,
      "iob-manager",
      true,
      [users.address]
    )) as IobManager;
    if (!iobManager || !iobManager.address) {
      throw new Error(`IobManager contract not deployed`);
    }

    deployEvent = (await getEvents(
      contractRegistry,
      "Deployed",
      [null, null, admin.address, null, null],
      true,
      await provider.getBlockNumber(),
      await provider.getBlockNumber()
    )) as Event;
    if (!deployEvent || !deployEvent.args) {
      throw new Error(`IobManager contract deploy event not found`);
    }
    if (deployEvent.args?.owner != admin.address) {
      throw new Error(`IobManager contract's owner is not the admin wallet`);
    }
    if (deployEvent.args?.proxy == deployEvent.args?.logic) {
      throw new Error(`Proxy's address cannot be the same as logic's address`);
    }

    logger.info(` ${logInfo.instance} Deploying Token contract...`);

    myToken = (await deployWithRegistry(contractRegistry, AMyToken, admin, "iob-token", true, [
      iobManager.address,
    ])) as MyToken;
    if (!myToken || !myToken.address) {
      throw new Error(`MyToken contract not deployed`);
    }

    deployEvent = (await getEvents(
      contractRegistry,
      "Deployed",
      [null, null, admin.address, null, null],
      true,
      await provider.getBlockNumber(),
      await provider.getBlockNumber()
    )) as Event;
    if (!deployEvent || !deployEvent.args) {
      throw new Error(`MyToken contract deploy event not found`);
    }
    if (deployEvent.args?.owner != admin.address) {
      throw new Error(`MyToken contract's owner is not the admin wallet`);
    }
    if (deployEvent.args?.proxy == deployEvent.args?.logic) {
      throw new Error(`Proxy's address cannot be the same as logic's address`);
    }

    logger.info(` ${logInfo.instance} All contracts deployed successfully \o/`);
    return true;
  } catch (error) {
    logger.error(` ${logInfo.instance} Deploying Contracts. ${error.stack}`);
    return false;
  } finally {
    logClose(logInfo);
  }
};

// // ================ WALLETS and ACCOUNTS ===================

/**
 *  Async funtion that creates a new wallet and stores it encripted in the path specified.
 *
 * @dev If alrready created, it decrypts and returns it.
 *
 * @param path to store the new generated wallet
 * @param password used to encript and decript the wallet
 * @param entropy used to add random to the private key
 *
 * @return wallet the instance of the Wallet created, unencrypted and ready to use
 */
export const createWallet = async (
  path: string,
  password: string,
  entropy?: string
): Promise<Wallet | undefined> => {
  let wallet: Wallet | undefined;
  try {
    // if not exists, create save in wallets and keystores (encypted)
    if (!(await fs.exists(path))) {
      console.log(`${path} does not exists, creating new one`);
      if (entropy) {
        wallet = Wallet.createRandom(entropy);
      } else {
        wallet = Wallet.createRandom();
      }
      wallet = wallet.connect(provider);
      const encWallet = wallet.encrypt(password);
      fs.writeFile(path, await encWallet);
    } else {
      // if exists, read, decrypt and return
      const encWallet = JSON.parse(await fs.readFile(path));
      wallet = await Wallet.fromEncryptedJson(JSON.stringify(encWallet), password);
      wallet = wallet.connect(provider);
    }
  } catch (error) {
    console.error(`ERROR: Cannot create or retreive wallet: ${error.stack}`);
  }
  return wallet;
};

/**
 *  Async funtion that decrypts a wallet.
 *
 * @param path where the wallet should be stored
 * @param password used to encript and decript the wallet
 *
 * @return wallet the instance of the Wallet created, unencrypted and ready to use
 */
export const retrieveWallet = async (
  path: string,
  password: string
): Promise<Wallet | undefined> => {
  let wallet: Wallet | undefined;
  try {
    const encWallet = JSON.parse(await fs.readFile(path));
    wallet = await Wallet.fromEncryptedJson(JSON.stringify(encWallet), password);
    wallet = wallet.connect(provider);
  } catch (error) {
    console.error(`ERROR: Cannot retreive wallet: ${error.stack}`);
  }
  return wallet;
};

/**
 * Gets the Wallets (without decryp them) as an array of strings from json
 * @param path the path where wallets are stored. Defaults to "keystore"
 */
export const getWallets = async (path?: string) => {
  try {
    path = path ? path : "./keystore";
    let readWallets: Promise<string>[] = [];
    let encWallets: any[] = [];

    const fileWallets = await fs.readdir(path);
    for (let index = 0; index < fileWallets.length; index++) {
      readWallets.push(fs.readFile(`${path}/${fileWallets[index]}`));
    }

    (await Promise.all(readWallets)).forEach((wallet) => {
      encWallets.push(JSON.parse(wallet));
    });

    return encWallets;
  } catch (error) {
    console.error(`ERROR: Cannot retreive wallets: ${error.stack}`);
  }
};

/**
 * Gets the wallet from a Signer address and decrypts it
 * @param from Signer that should have a wallet with is address
 * @param password to decript the JSON encrypted wallet
 */
export const getWallet = async (address: string, password: string) => {
  try {
    const encWallets = (await getWallets())!;
    if (!encWallets || !encWallets[0] || !encWallets[0].address) {
      throw new Error("No wallets found");
    }

    let decWallet: Wallet | undefined;
    for (let index = 0; index < encWallets.length; index++) {
      if (
        (encWallets[index].address as string).toLowerCase() ==
        address.slice(2, address.length).toLowerCase()
      ) {
        decWallet = Wallet.fromEncryptedJsonSync(JSON.stringify(encWallets[index]), password);
      }
    }

    return decWallet;
  } catch (error) {
    console.error(`ERROR: Cannot retreive wallet: ${error.stack}`);
  }
};

// // ================ CONTRACTS ===================

/**
 * Deploys a contract
 * @param artifact contract's artifact in JSON format
 * @param from signer from which to deploy the contract
 * @param deployParams parameters for the contract's constructor
 * @return contract deployed
 */
export const deploy = async (
  artifact: any,
  from: Signer,
  deployParams?: unknown[]
): Promise<Contract | undefined> => {
  try {
    deployParams = deployParams ? deployParams : [];

    console.log(
      `deploying '${
        artifact.contractName
      }(${deployParams})' from '${await from.getAddress()}' account`
    );
    // Deploy contractnpx
    const contractFactory = new ContractFactory(artifact.abi, artifact.bytecode, from);

    const contractInterface = await contractFactory.deploy(...deployParams, GAS_OPT);
    return await contractInterface.deployed();
  } catch (error) {
    console.error(`ERROR: Cannot deploy Contract. ${error.stack}`);
  }
};

/**
 * Deploys an upgradeable contract using ProxyAdmin and TransparentUpgradeableProxy from OpenZeppelin
 *
 * @dev If proxyAdmin not passed as argument, it will be deployeda new one
 *
 * @param artifact contract's artifact in JSON format
 * @param from signer from which to deploy the contract
 * @param proxyAdmin (optional) address of a Proxy Admin contract
 * @param initParams (optional) parameters for the initialize function (contructor)
 * @return the deployed upgradeable contract and proxy admin contract if deployed here
 */
export const deployUpgradeable = async (
  artifact: any,
  from: Signer,
  proxyAdmin?: ProxyAdmin,
  initParams?: unknown[]
): Promise<Contract | Contract[] | undefined> => {
  try {
    // if not init params, set to empty array
    initParams = initParams ? initParams : [];
    let proxyAdminC: Promise<Contract>;
    // contract factories
    const proxyAdminFact = new ContractFactory(AProxyAdmin.abi, AProxyAdmin.bytecode, from);
    const logicFact = new ContractFactory(artifact.abi, artifact.bytecode, from);
    const tupFact = new ContractFactory(ATUP.abi, ATUP.bytecode, from);
    // ~ Deploy (async)
    // -- deploy logic contract
    const logic = logicFact.deploy();
    const initData = logicFact.interface.encodeFunctionData("initialize", [...initParams]);
    // -- deploy a new proxyAdmin?
    if (!proxyAdmin) {
      proxyAdmin = (await deploy(AProxyAdmin, from)) as ProxyAdmin;
    }
    // -- deploy Transparent Upgradeable Proxy
    const tup = await (
      await tupFact.deploy(
        (await (await logic).deployed()).address,
        proxyAdmin.address,
        initData,
        GAS_OPT
      )
    ).deployed();

    const contract = new Contract(tup.address, artifact.abi, from);

    // returns the new deployed upgradeable contract and proxyAdmin if deployed here
    if (proxyAdmin) {
      return contract;
    } else {
      return [await (await proxyAdminC!).deployed(), contract];
    }
  } catch (error) {
    console.error(`ERROR: Cannot deploying upgradeable contract. ${error.stack}`);
  }
};

export const sendTransaction = async (sTx: string) => {
  return provider.sendTransaction(sTx);
};

// ================ EVENTS ===================

/**
 * Gets the events emited from a contract filtered by name and by event parameters
 *
 * @dev indexes must me of the length of the event
 * @dev indexes must be 'null' if not search for this param
 * @dev for event paramater filter to work, SC must define *indexex* in event definition
 *
 * @param contractInstance contract that emits the event
 * @param eventName name of the event to search for
 * @param indexes filters by the event parameters
 * @param onlyFirst whether or not to get only fist event
 * @param fromBlock block to start to search from
 * @param toBlock block to stop to search to
 * @return event or events found
 */
export const getEvents = async (
  contractInstance: Contract,
  eventName: string,
  indexes: any[],
  onlyFirst?: boolean,
  fromBlock?: number | string,
  toBlock?: number | string
): Promise<Event | Event[] | undefined> => {
  try {
    const filter = contractInstance.filters[eventName](...indexes);
    const events = await contractInstance.queryFilter(filter, fromBlock, toBlock);
    if (onlyFirst && events.length == 1) {
      return events[0];
    } else {
      return events;
    }
  } catch (error) {
    console.error(`ERROR: Cannot get any event. ${(error.stack, error.code)}`);
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
      return FixedNumber.fromValue(amounts, DECIMALS).round(6).toUnsafeFloat();
    } else {
      const result: number[] = [];
      amounts.forEach((amount) => {
        result.push(FixedNumber.fromValue(amount, DECIMALS).round(6).toUnsafeFloat());
      });
      return result;
    }
  } catch (error) {
    console.error(`ERROR: ${error}`);
  }
};

export const toDate = async (dates: number | number[] | BigNumber | BigNumber[]) => {
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

/**
 * Generates a random 32 bytes string array
 * @return random 32 bytes string array
 */
export const random32Bytes = async () => {
  let bytes: string = "0x";
  for (let i = 0; i < 64; i++) {
    const randInt = Math.floor(Math.random() * (15 - 0 + 1) + 0);
    bytes = `${bytes}${randInt.toString(16)}`;
  }
  return bytes;
};

/**
 * Converts a decimal version like '01.10' to a bytes2 version like '0x010A'
 * @param decVersion decimal format version
 * @return hexadecimal bytes2 forma version
 */
export const toHexVersion = async (decVersion: string) => {
  try {
    let hexVersion = "0x";
    const splitVersion = decVersion.split(".");
    if (splitVersion.length != 2) {
      throw new Error("Not valid version. 'XX.XX' only format accepted.");
    }
    splitVersion.forEach(async (byte) => {
      if (byte.length == 1) {
        hexVersion = `${hexVersion}0${parseInt(byte).toString(16)}`;
      } else {
        hexVersion = `${hexVersion}${parseInt(byte).toString(16)}`;
      }
    });
    return hexVersion;
  } catch (error) {
    console.error(`ERROR: Cannot convert to hexadecimal version. ${(error.stack, error.code)}`);
  }
};

// Init Providers
configProviders();
