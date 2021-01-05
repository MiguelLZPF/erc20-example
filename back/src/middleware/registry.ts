import { Contract, ContractFactory, Event, Wallet } from "ethers";
import { isAddress, keccak256, toUtf8Bytes } from "ethers/lib/utils";
import {
  GAS_OPT,
  getEvents,
  provider,
  random32Bytes,
  toHexVersion,
  TransactionReceipt,
  TransactionResponse,
} from "./blockchain";

import * as AContractRegistry from "./../artifacts/contracts/ContractRegistry.sol/ContractRegistry.json";
import { ContractRegistry } from "../typechain/ContractRegistry";

/**
 *  Creates new types if contracts in batch
 * @param types array of strings with the type names to be created
 * @param registry actual registry contract or address that keeps track of the types
 * @param version (optional) the version to initialize the new types, can be one version for all or
 *        one version for each type.
 * @return an array with all receipts from transactions
 */
export const setTypes = async (
  registry: Contract,
  types: string[],
  version?: string | string[]
) => {
  // get base nonce
  //const baseNonce = registry.signer.getTransactionCount();
  let receipts: TransactionReceipt[] = [];
  if (version && typeof version == "string") {
    for (let index = 0; index < types.length; index++) {
      receipts.push(await setType(registry, types[index], version));
    }
  } else if (version) {
    // must be string[]
    for (let index = 0; index < types.length; index++) {
      receipts.push(await setType(registry, types[index], version[index]));
    }
  } else {
    for (let index = 0; index < types.length; index++) {
      receipts.push(await setType(registry, types[index]));
    }
  }
  return await Promise.all(receipts);
};

const setType = async (registry: Contract, type: string, version?: string) => {
  version ? version : (version = await toHexVersion("0.1"));

  return await ((await registry.setType(type, version, GAS_OPT)) as TransactionResponse).wait();
};

/**
 * Deploys an array of contracts using a ContractRegistry deployed in the network
 *
 * @dev a Signer must be provided in the factOptions.signer or in the registry.signer
 *
 * @param registry actual contract registry of the system
 * @param contractNames names of the contracts to be deployed
 * @param factOptions contract factory options with signer and libraries
 * @param types type ids or type names of the contracts to be deployed
 * @param wantContract whether or not to return the deployed contracts. Default is true
 * @param initParams initialize (constructor) paramenters
 * @return the deployed contract or nothing if wantContract == false
 */
export const deployWithRegistryBatch = async (
  registry: ContractRegistry | string,
  artifacts: any[],
  froms: Wallet[],
  types?: string[],
  wantContract?: boolean,
  initParams?: unknown[][]
) => {
  try {
    // check parameters
    if (
      artifacts.length != froms.length ||
      (types && types.length != artifacts.length)
    ) {
      throw new Error(`Lengths does not match:
        - Contract names: ${artifacts.length}
        - FactoryOptions: ${froms.length}
        - Types: ${types?.length}`);
    }
    // -- registry
    if (typeof registry == "string" && isAddress(registry)) {
      registry = (new Contract(registry, AContractRegistry.abi, provider)) as ContractRegistry;
    }
    registry = (registry as ContractRegistry).connect(provider);

    // Main Logic
    let contracts: Contract[] = [];
    if (wantContract || !wantContract) {
      // wantContract == true || undefined
      for (let index = 0; index < artifacts.length; index++) {
        contracts.push(
          await (deployWithRegistry(
            registry,
            artifacts[index],
            froms[index],
            types ? types[index] : undefined,
            true,
            initParams ? initParams[index] : undefined
          ) as Promise<Contract>)
        );
      }
      return await Promise.all(contracts);
    } else {
      for (let index = 0; index < artifacts.length; index++) {
        contracts.push(
          await (deployWithRegistry(
            registry,
            artifacts[index],
            froms[index],
            types ? types[index] : undefined,
            false,
            initParams ? initParams[index] : undefined
          ) as Promise<Contract>)
        );
      }
    }
  } catch (error) {
    console.error(`ERROR: Cannot deploy Contracts in batch. ${error.stack}`);
  }
};

/**
 * Deploys a contract using a ContractRegistry deployed in the network
 *
 * @dev a Signer must be provided in the factOptions.signer or in the registry.signer
 *
 * @param registry actual contract registry of the system
 * @param contractName name of the contract to be deployed
 * @param from wallet to deploy the contract
 * @param type type id or type name of the contract to be deployed
 * @param wantContract whether or not to return the deployed contract. Default is true
 * @param initParams initialize (constructor) paramenters
 * @return the deployed contract or nothing if wantContract == false
 */
export const deployWithRegistry = async (
  registry: Contract,
  artifact: any,
  from: Wallet,
  type?: string,
  wantContract?: boolean,
  initParams?: unknown[]
): Promise<Contract | void | undefined> => {
  try {
    // async
    const randBytes = random32Bytes();
    // make sure the contract is connected to the correct signer
    registry = registry.connect(from);
    // -- type - can be the type name or type id
    if (!type) {
      type = keccak256(toUtf8Bytes("generic"));
    } else if (type.slice(0, 2) != "0x") {
      // is a type name
      type = keccak256(toUtf8Bytes(type));
    } else if (type.length != 64 + 2) {
      // is a type id and length is not 32 bytes
      throw new Error(
        "type id is not valid. Must be a bytes array starting with 0x and 32 bytes length"
      );
    }
    // -- initParams
    initParams = initParams ? initParams : [];

    // Main Logic
    const factory = new ContractFactory(artifact.abi, artifact.bytecode, from);
    const initData = factory.interface.encodeFunctionData("initialize", [...initParams]);
    console.log(`Deploying Contract ${artifact.contractName}(${initParams}) from '${from}'`);
    const receipt = await ((await registry.deployContract(
      factory.bytecode,
      initData,
      await randBytes,
      type,
      GAS_OPT
    )) as TransactionResponse).wait();

    //get event and contract
    if (wantContract || !wantContract) {
      const deployEvent = (await getEvents(
        registry,
        "Deployed",
        [null, null, from, type, null, null],
        true,
        receipt.blockNumber,
        receipt.blockNumber
      )) as Event;

      return new Contract(deployEvent.args!.proxy, factory.interface, provider);
    }
  } catch (error) {
    console.error(`ERROR: Cannot deploy Contract. ${error.stack}`);
  }
};
