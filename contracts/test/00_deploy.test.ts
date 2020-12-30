import { BigNumber, Wallet, Event } from "ethers";
import { ethers, hardhatArguments } from "hardhat";

import * as fs from "async-file";
import {
  createWallet,
  deploy,
  deployUpgradeable,
  GAS_OPT,
  getEvents,
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

// General Contants
const WALL_NUMBER = 3;
const WALL_PASS = "password";
const WALL_ENTROPY = "EnTrOpY";
const THIS_TEST = "00_deploy";
// Specific Constants

// General variables
let wallets: Wallet[] = [];
let admin: Wallet;
let user00: Wallet;
let user01: Wallet;
// Specific variables
// -- Contracts
let proxyAdmin: ProxyAdmin;
let registry: ContractRegistry;
let registryAdmin: ContractRegistry;
let users: Users;
let iobManager: IobManager;
let myToken: MyToken;

describe("Deploy of project's contracts", async function () {
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
      // name general accounts
      admin = wallets[0];
      user00 = wallets[1];
      user01 = wallets[2];
    } catch (error) {
      console.error(error);
    }
  });

  step("Should deploy Proxy Admin contract", async () => {
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
  });

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
    console.log(`Test 00 data saved in ./test/data/${THIS_TEST}.json`);
  });
});
