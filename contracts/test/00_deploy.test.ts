import { BigNumber, Contract, Wallet, Event, ContractFactory } from "ethers";
import { ethers, hardhatArguments } from "hardhat";

import * as fs from "async-file";
import {
  createWallet,
  deploy,
  deployUpgradeable,
  GAS_OPT,
  getEvents,
  provider,
  TransactionResponse,
} from "../scripts/Blockchain";
import { expect } from "chai";
import { random32Bytes, toHexVersion } from "../scripts/Utils";
import { deployWithRegistry, setTypes } from "../scripts/Registry";
import { keccak256, toUtf8Bytes } from "ethers/lib/utils";

import { ContractRegistry } from "../typechain/ContractRegistry";
import { IobManager } from "../typechain/IobManager";
import { MyToken } from "../typechain/MyToken";
import { Users } from "../typechain/Users";

// General Contants
const WALL_NUMBER = 3;
const WALL_PASS = "password";
const WALL_ENTROPY = "EnTrOpY";
// Specific Constants

// General variables
let wallets: Wallet[] = [];
let admin: Wallet;
let user00: Wallet;
let user01: Wallet;
// Specific variables
// -- Contract Factories
let registryFact: Promise<ContractFactory>;
let iobManagerFact: Promise<ContractFactory>;
let myTokenFact: Promise<ContractFactory>;
let usersFact: Promise<ContractFactory>;
// -- Contracts
let proxyAdmin: Contract;
let registry: ContractRegistry;
let registryAdmin: ContractRegistry;
let registryU00: ContractRegistry;
let registryU01: ContractRegistry;
let users: Users;

describe("Registry", async function () {
  //this.timeout

  before(async () => {
    const accounts = await ethers.getSigners();
    /* accounts.forEach(async (signer) => {
      console.log(await signer.getAddress());
    }); */

    if (accounts.length < WALL_NUMBER) {
      console.warn(
        `Warning: the number of wallet created will be greater than the providers accounts length (${accounts.length}),
          so the remaining wallets will have a balance of 0 wei`
      );
    }

    let wallet: Promise<Wallet | undefined>;

    try {
      if (!(await fs.exists("./keystore"))) {
        await fs.mkdir("keystore");
      }
      // Asyncronously creates an array of ACC_NUMBER Wallets
      // Only takes almost the same amount of time to create only one
      let promWallets: Promise<Wallet | undefined>[] = [];
      for (let index = 0; index < WALL_NUMBER; index++) {
        wallet = createWallet(`./keystore/wallet_${index}.json`, WALL_PASS, WALL_ENTROPY);
        promWallets.push(wallet);
      }
      wallets = (await Promise.all(promWallets)) as Wallet[];
      // If other networks, coment the If structure first time
      if (hardhatArguments.network == "hardhat") {
        for (let index = 0; index < WALL_NUMBER; index++) {
          if (hardhatArguments.network != "hardhat") {
            await provider.getSigner(index).unlock("");
          }
          await accounts[index].sendTransaction({
            to: wallets[index].address,
            value: BigNumber.from("0x56BC75E2D63100000"), //100 eth
          });
          console.log(`Wallet_${index}:
          - Address: ${wallets[index].address}
          - Balance: ${await wallets[index].getBalance()}`);
        }
      }
      admin = wallets[0];
      user00 = wallets[1];
      user01 = wallets[2];
      // get async contract factories
      registryFact = ethers.getContractFactory("ContractRegistry");
      iobManagerFact = ethers.getContractFactory("IobManager");
      myTokenFact = ethers.getContractFactory("MyToken");
      usersFact = ethers.getContractFactory("Users");
    } catch (error) {
      console.error(error);
    }
  });

  it("Should deploy Proxy Admin contract", async () => {
    console.log("\n ==> Deploying Proxy Admin contract...\n");

    proxyAdmin = (await deploy("ProxyAdmin", { signer: admin }))!;

    console.log(`Proxy Admin successfully deployed:
      - Proxy Admin address: ${proxyAdmin.address}
      - Proxy Admin's owner: ${await proxyAdmin.callStatic.owner(GAS_OPT)}\n`);

    expect(await proxyAdmin.owner(GAS_OPT)).to.equal(
      await admin.getAddress(),
      `Proxy Admin's owner not equal admin address`
    );
  });

  it("Should deploy Registry contract", async () => {
    console.log("\n ==> Deploying registry contract...\n");
    admin = admin!;

    registry = (await deployUpgradeable(
      "ContractRegistry",
      { signer: admin },
      proxyAdmin.address
    )) as ContractRegistry;
    registryAdmin = registry.connect(admin);
    registryU00 = registry.connect(user00);
    registryU01 = registry.connect(user01);

    console.log(`Registry successfully deployed:
      - Registry logic address: ${await proxyAdmin.callStatic.getProxyImplementation(
        registry.address,
        GAS_OPT
      )}
      - Registry proxy address: ${registry.address}
      - Registry proxy's admin: ${await proxyAdmin.callStatic.getProxyAdmin(
        registry.address,
        GAS_OPT
      )} \n`);

    const initEvent = (await getEvents(
      registry,
      "Initialized",
      [registry.address, admin.address],
      true
    )) as Event;
    //console.log(initEvent.args);

    expect(await registry.owner()).to.equal(
      admin.address,
      `Registry's owner not equal admin's address`
    );

    expect(await proxyAdmin.callStatic.getProxyAdmin(registry.address, GAS_OPT)).to.equal(
      proxyAdmin.address,
      `Registry's admin not equal proxy admin's address`
    );

    expect(initEvent.args?.registry).to.equal(
      registry.address,
      `Registry's address not equal event address`
    );

    expect(initEvent.args?.owner).to.equal(
      admin.address,
      `Event's owner not equal admin's address`
    );
    expect((await registry.callStatic.getTypeByName("generic")).name).to.equal(
      "generic",
      "Generic type not setted in initializer"
    );
  });

  it("Should set contract types", async () => {
    console.log("\n ==> Setting contract Types and Versions...\n");

    const receipts = await setTypes(registry, ["iob-manager", "iob-token", "iob-users"]);

    const newTypeEvents = (await getEvents(
      registry,
      "NewType",
      [null, null, null],
      false,
      receipts[0].blockNumber,
      receipts[0].blockNumber
    )) as Event[];

    newTypeEvents.forEach((event) => {
      console.log(`Type '${event.args?.name}' set: 
      - Id: ${event.args?.id}
      - Name: ${event.args?.name}
      - Version: ${event.args?.version}`);
    });

    console.log(await registry.getTypes(GAS_OPT));
  });

  it("Should deploy Users contract", async () => {
    console.log("\n ==> Deploying Users contract...\n");
    
    let users = (await deployWithRegistry(registry, "Users", {signer: admin}, "iob-users", true)) as Users;

    console.log(users.address);
  });
/*
  it("Should deploy IobManager contract", async () => {
    console.log("\n ==> Deploying IobManager contract...\n");

    const data = (await iobManagerFact).interface.encodeFunctionData("initialize", []);
  });
  it("Should deploy myToken contract", async () => {
    console.log("\n ==> Deploying myToken contract...\n");

    const data = (await myTokenFact).interface.encodeFunctionData("initialize", []);
    const receipt = await ((await registryMe.deployContract(
      typeOneFact.bytecode,
      data,
      await random32Bytes(),
      "type-one",
      GAS_OPT
    )) as TransactionResponse).wait();
    //console.log(receipt);
    const deployEvent = (await getEvents(
      registryMe,
      "Deployed",
      [null, null, me.address, null, null],
      true,
      receipt.blockNumber,
      receipt.blockNumber
    )) as Event;
    console.log(`Type one deployed event: 
      - Proxy: ${deployEvent.args?.proxy}
      - Logic: ${deployEvent.args?.logic}
      - Owner: ${deployEvent.args?.owner}\n`);

    typeOne = new Contract(
      deployEvent.args?.proxy,
      typeOneFact.interface,
      me
    ) as TypeOne;
    const typeOneRecord = await registryMe.callStatic.getRecord(
      typeOne.address,
      GAS_OPT
    );
    console.log(`Type one Record: 
      - Proxy: ${typeOneRecord.proxy}
      - Logic: ${typeOneRecord.logic}
      - Owner: ${typeOneRecord.owner}
      - Type: ${typeOneRecord.type_}
      - Version: ${typeOneRecord.version}
      - Date Created: ${new Date(typeOneRecord.dateCreated * 1000)}
      - Date Updated: ${new Date(typeOneRecord.dateUpdated * 1000)}`);

    expect(await typeOne.owner()).to.equal(
      me.address,
      `Type one contract's owner not equal my address`
    );

    expect(typeOneRecord.proxy).to.equal(
      deployEvent.args?.proxy,
      `Type one contract's proxy address not equal event's address`
    );

    expect(typeOneRecord.type_).to.equal(
      "type-one",
      `Type one contrac's type is not manager`
    );
  });

  it("Should change version of type one contract to 0.2", async () => {
    console.log("\n ==> Setting type one contract Version to 0.2... \n");
    me = me!;
    // const oldVersion = toHexVersion("0.1");
    const version = toHexVersion("0.2");

    const receipt = await ((await registry.setVersion(
      keccak256(toUtf8Bytes("type-one")),
      await version,
      GAS_OPT
    )) as TransactionResponse).wait();

    const verUpdateEvent = (await getEvents(
      registry,
      "VersionUpdated",
      [null, null],
      true,
      receipt.blockNumber,
      receipt.blockNumber
    )) as Event;
    //console.log(verUpdateEvent);
    console.log(`Version update event:
    - ID: ${verUpdateEvent.args?.id}
    - Old Version: ${verUpdateEvent.args?.oldVersion}
    - New Version: ${verUpdateEvent.args?.newVersion}`);

    expect(
      await registry.getVersion(keccak256(toUtf8Bytes("type-one")))
    ).to.equal(await version);
  });

  it("Should upgrade type one contract", async () => {
    console.log("\n ==> Upgradeing type one contract...\n");


    const receipt = await ((await registryMe.upgradeContract(
      typeOne.address,
      typeOneFact.bytecode,
      await random32Bytes(),
      GAS_OPT
    )) as TransactionResponse).wait();

    const upgradedEvent = (await getEvents(
      registryMe,
      "Upgraded",
      [null, null, null, null, null, null, null],
      true,
      receipt.blockNumber,
      receipt.blockNumber
    )) as Event;
    console.log(`Type one Upgraded event: 
      - Proxy: ${upgradedEvent.args?.proxy}
      - OldLogic: ${upgradedEvent.args?.oldLogic}
      - Logic: ${upgradedEvent.args?.newLogic}
      - Owner: ${upgradedEvent.args?.owner}`);

    const typeOneRecord = await registryMe.callStatic.getRecord(
      typeOne.address,
      GAS_OPT
    );
    console.log(`Type one Record: 
      - Proxy: ${typeOneRecord.proxy}
      - Logic: ${typeOneRecord.logic}
      - Owner: ${typeOneRecord.owner}
      - Type: ${typeOneRecord.type_}
      - Version: ${typeOneRecord.version}
      - Date Created: ${new Date(typeOneRecord.dateCreated * 1000)}
      - Date Updated: ${new Date(typeOneRecord.dateUpdated * 1000)}`);
  }); */
});
