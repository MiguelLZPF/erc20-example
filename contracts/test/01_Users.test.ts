import { BigNumber, Wallet, Event } from "ethers";
import { ethers, hardhatArguments } from "hardhat";

import * as fs from "async-file";
import {
  createWallet,
  deploy,
  deployUpgradeable,
  GAS_OPT,
  getEvents,
  getWallet,
  provider,
} from "../scripts/Blockchain";
import { expect } from "chai";
import { step } from "mocha-steps";
import { deployWithRegistry, setTypes } from "../scripts/Registry";

import { ProxyAdmin } from "../typechain/ProxyAdmin";
import { ContractRegistry } from "../typechain/ContractRegistry";
import { IobManager } from "../typechain/IobManager";
import { MyToken } from "../typechain/MyToken";
import { Users } from "../typechain/Users";
import { keccak256, toUtf8Bytes } from "ethers/lib/utils";
import { decrypt, encryptHash, hash, kHash } from "../scripts/Utils";

// General Constants
const WALL_PASS = "password";
const PREV_TEST = "00_deploy";
const THIS_TEST = "01_Users";
// Specific Constants
const USER00 = {
  name: "Username_00",
  password: "password00",
};
const USER01 = {
  name: "Username_01",
  password: "password01",
};

// General variables
let admin: Wallet;
let user00: Wallet;
let user01: Wallet;
// Specific variables
// -- Contracts
let proxyAdmin: ProxyAdmin;
let registry: ContractRegistry;
let users: Users;
let iobManager: IobManager;
let iobManagerAdmin: IobManager;
let iobManagerU00: IobManager;
let iobManagerU01: IobManager;
let myToken: MyToken;

describe("Users contract related test", async function () {
  //this.timeout

  before(`Get data from test ${PREV_TEST}`, async () => {
    //const accounts = await ethers.getSigners();
    // Get data from JSON
    const prevData = JSON.parse(await fs.readFile(`./test/data/${PREV_TEST}.json`));
    // Get wallets info
    let wallets: any = Promise.all([
      getWallet(prevData.wallets.admin, WALL_PASS) as Promise<Wallet>,
      getWallet(prevData.wallets.user00, WALL_PASS) as Promise<Wallet>,
      getWallet(prevData.wallets.user01, WALL_PASS) as Promise<Wallet>,
    ]);
    let contracts: any = Promise.all([
      ethers.getContractAt("ProxyAdmin", prevData.contracts.proxyAdmin),
      ethers.getContractAt("ContractRegistry", prevData.contracts.registry),
      ethers.getContractAt("Users", prevData.contracts.users),
      ethers.getContractAt("IobManager", prevData.contracts.iobManager),
      ethers.getContractAt("MyToken", prevData.contracts.myToken),
    ]);
    wallets = await wallets;
    admin = wallets[0].connect(provider);
    user00 = wallets[1].connect(provider);
    user01 = wallets[2].connect(provider);
    contracts = await contracts;
    proxyAdmin = contracts[0].connect(provider);
    registry = contracts[1].connect(provider);
    users = contracts[2].connect(provider);
    iobManager = contracts[3].connect(provider);
    iobManagerU00 = iobManager.connect(user00);
    iobManagerU01 = iobManager.connect(user01);
    myToken = contracts[4].connect(provider);
  });

  step(`Check data from test ${PREV_TEST} is OK`, async () => {
    expect(admin.address).to.not.be.undefined;
    expect(user00.address).to.not.be.undefined;
    expect(user01.address).to.not.be.undefined;
    expect(proxyAdmin.address).to.not.be.undefined;
    expect(registry.address).to.not.be.undefined;
    expect(users.address).to.not.be.undefined;
    expect(iobManager.address).to.not.be.undefined;
    expect(iobManagerU00.address).to.not.be.undefined;
    expect(iobManagerU01.address).to.not.be.undefined;
    expect(myToken.address).to.not.be.undefined;

    console.log(`All data from test ${PREV_TEST} retreived OK`);
  });

  step("Should create two new users", async () => {
    // Hashed encrypted passwords
    const encPassU00 = encryptHash(USER00.password);
    const encPassU01 = encryptHash(USER01.password);
    // calculate hashes to compare later
    const hashPass = [hash(USER00.password), hash(USER01.password)];
    const kHashNames = [kHash(USER00.name), kHash(USER01.name)];

    const receiptU00 = (await iobManagerU00.newUser(USER00.name, await encPassU00, GAS_OPT)).wait();
    const receiptU01 = (await iobManagerU01.newUser(USER01.name, await encPassU01, GAS_OPT)).wait();

    const events = (await getEvents(
      iobManager,
      "UserCreated",
      [null, null, null],
      false,
      (await receiptU00).blockNumber,
      (await receiptU01).blockNumber
    )) as Event[];
    expect(receiptU00).not.to.be.undefined;
    expect(receiptU01).not.to.be.undefined;
    expect(events).not.to.be.undefined;

    for (let index = 0; index < events.length; index++) {
      const block = provider.getBlock(events[index].blockHash);
      console.log(`User created:
      - Id: ${events[index].args?.id}
      - Name hash: ${events[index].args?.name.hash}
      - Password: ${events[index].args?.password}
      - Created: ${new Date((await block).timestamp * 1000)}`);

      expect(events[index].args!.id).not.to.be.undefined;
      expect(events[index].args!.name.hash).to.equal(await kHashNames[index]);
      expect(await decrypt(events[index].args!.password)).to.equal(await hashPass[index]);
    }
  });
  /* step("Should deploy Proxy Admin contract", async () => {
    console.log("\n ==> Deploying Proxy Admin contract...\n");

    proxyAdmin = (await deploy("ProxyAdmin", { signer: admin }))! as ProxyAdmin;

    console.log(`Proxy Admin successfully deployed:
      - Proxy Admin address: ${proxyAdmin.address}
      - Proxy Admin's owner: ${await proxyAdmin.callStatic.owner(GAS_OPT)}\n`);

    expect(await proxyAdmin.owner(GAS_OPT)).to.equal(
      await admin.getAddress(),
      `Proxy Admin's owner not equal admin address`
    );
  });

  step("Should deploy Registry contract", async () => {
    console.log("\n ==> Deploying registry contract...\n");

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

  step("Should set contract types", async () => {
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

  step("Should deploy Users contract", async () => {
    console.log("\n ==> Deploying Users contract...\n");

    users = (await deployWithRegistry(
      registry,
      "Users",
      { signer: admin },
      "iob-users",
      true
    )) as Users;
    expect(users).not.to.be.undefined;

    const deployEvent = (await getEvents(
      registry,
      "Deployed",
      [null, null, admin.address, null, null],
      true,
      await provider.getBlockNumber(),
      await provider.getBlockNumber()
    )) as Event;
    expect(deployEvent).not.to.be.undefined;
    console.log(`Users contract deployed event: 
      - Proxy: ${deployEvent.args?.proxy}
      - Logic: ${deployEvent.args?.logic}
      - Owner: ${deployEvent.args?.owner}\n`);
    expect(deployEvent.args?.owner).to.equal(admin.address);
    expect(deployEvent.args?.proxy).not.to.equal(
      deployEvent.args?.logic,
      "Proxy's address cannot be the same as logic's address"
    );

    const usersRecord = await registryAdmin.callStatic.getRecord(users.address, GAS_OPT);
    expect(usersRecord).not.to.be.undefined;
    console.log(`Users contract Record:
        - Proxy: ${usersRecord.proxy}
        - Logic: ${usersRecord.logic}
        - Owner: ${usersRecord.owner}
        - Type: ${usersRecord.type_}
        - Version: ${usersRecord.version}
        - Date Created: ${new Date(parseInt(usersRecord.dateCreated._hex) * 1000)}
        - Date Updated: ${new Date(parseInt(usersRecord.dateUpdated._hex) * 1000)}`);
    expect(usersRecord.proxy).not.to.equal(usersRecord.logic);
    expect(usersRecord.owner).to.equal(admin.address);
    expect(usersRecord.type_).to.equal("iob-users");
    expect(usersRecord.version).to.equal("0x0001");

    expect(await users.callStatic.owner()).to.equal(admin.address);
  });

  step("Should deploy Manager contract", async () => {
    console.log("\n ==> Deploying Manager contract...\n");

    iobManager = (await deployWithRegistry(
      registry,
      "IobManager",
      { signer: admin },
      "iob-manager",
      true,
      [users.address]
    )) as IobManager;
    expect(iobManager).not.to.be.undefined;

    const deployEvent = (await getEvents(
      registry,
      "Deployed",
      [null, null, admin.address, null, null],
      true,
      await provider.getBlockNumber(),
      await provider.getBlockNumber()
    )) as Event;
    expect(deployEvent).not.to.be.undefined;
    console.log(`IobManager contract deployed event: 
      - Proxy: ${deployEvent.args?.proxy}
      - Logic: ${deployEvent.args?.logic}
      - Owner: ${deployEvent.args?.owner}\n`);
    expect(deployEvent.args?.owner).to.equal(admin.address);
    expect(deployEvent.args?.proxy).not.to.equal(
      deployEvent.args?.logic,
      "Proxy's address cannot be the same as logic's address"
    );

    const managerRecord = await registryAdmin.callStatic.getRecord(iobManager.address, GAS_OPT);
    expect(managerRecord).not.to.be.undefined;
    console.log(`IobManager contract Record:
        - Proxy: ${managerRecord.proxy}
        - Logic: ${managerRecord.logic}
        - Owner: ${managerRecord.owner}
        - Type: ${managerRecord.type_}
        - Version: ${managerRecord.version}
        - Date Created: ${new Date(parseInt(managerRecord.dateCreated._hex) * 1000)}
        - Date Updated: ${new Date(parseInt(managerRecord.dateUpdated._hex) * 1000)}`);
    expect(managerRecord.proxy).not.to.equal(managerRecord.logic);
    expect(managerRecord.owner).to.equal(admin.address);
    expect(managerRecord.type_).to.equal("iob-manager");
    expect(managerRecord.version).to.equal("0x0001");

    expect(await iobManager.callStatic.owner()).to.equal(admin.address);
  });

  step("Should deploy Token contract", async () => {
    console.log("\n ==> Deploying Token contract...\n");

    myToken = (await deployWithRegistry(registry, "MyToken", { signer: admin }, "iob-token", true, [
      iobManager.address,
    ])) as MyToken;
    expect(myToken).not.to.be.undefined;

    const deployEvent = (await getEvents(
      registry,
      "Deployed",
      [null, null, admin.address, null, null],
      true,
      await provider.getBlockNumber(),
      await provider.getBlockNumber()
    )) as Event;
    expect(deployEvent).not.to.be.undefined;
    console.log(`IobManager contract deployed event: 
      - Proxy: ${deployEvent.args?.proxy}
      - Logic: ${deployEvent.args?.logic}
      - Owner: ${deployEvent.args?.owner}\n`);
    expect(deployEvent.args?.owner).to.equal(admin.address);
    expect(deployEvent.args?.proxy).not.to.equal(
      deployEvent.args?.logic,
      "Proxy's address cannot be the same as logic's address"
    );

    const tokenRecord = await registryAdmin.callStatic.getRecord(myToken.address, GAS_OPT);
    expect(tokenRecord).not.to.be.undefined;
    console.log(`IobManager contract Record:
        - Proxy: ${tokenRecord.proxy}
        - Logic: ${tokenRecord.logic}
        - Owner: ${tokenRecord.owner}
        - Type: ${tokenRecord.type_}
        - Version: ${tokenRecord.version}
        - Date Created: ${new Date(parseInt(tokenRecord.dateCreated._hex) * 1000)}
        - Date Updated: ${new Date(parseInt(tokenRecord.dateUpdated._hex) * 1000)}`);
    expect(tokenRecord.proxy).not.to.equal(tokenRecord.logic);
    expect(tokenRecord.owner).to.equal(admin.address);
    expect(tokenRecord.type_).to.equal("iob-token");
    expect(tokenRecord.version).to.equal("0x0001");

    expect(await myToken.callStatic.owner()).to.equal(admin.address);
  }); */

  after("Store test information", async () => {
    await fs.writeFile(
      `./test/data/${THIS_TEST}.json`,
      JSON.stringify({
        wallets: {
          admin: admin.address,
          user00: user00.address,
          user01: user01.address,
        },
        contracts: {
          proxyAdmin: proxyAdmin.address,
          registry: registry.address,
          users: users.address,
          iobManager: iobManager.address,
          myToken: myToken.address,
        },
      })
    );
    console.log(`Test data saved in ./test/data/${THIS_TEST}.json`);
  });
});
