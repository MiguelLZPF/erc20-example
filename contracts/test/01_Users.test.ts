import { Wallet, Event } from "ethers";
import { ethers } from "hardhat";

import * as fs from "async-file";
import { GAS_OPT, getEvents, getWallet, provider } from "../scripts/Blockchain";
import { expect } from "chai";
import { step } from "mocha-steps";

import { ProxyAdmin } from "../typechain/ProxyAdmin";
import { ContractRegistry } from "../typechain/ContractRegistry";
import { ExampleManager } from "../typechain/ExampleManager";
import { MyToken } from "../typechain/MyToken";
import { Users } from "../typechain/Users";
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
let exampleManager: ExampleManager;
let exampleManagerU00: ExampleManager;
let exampleManagerU01: ExampleManager;
let myToken: MyToken;
// maps account and user ID
let userMap = new Map<string, string>();

describe("Users contract and ExampleManager user related test", async function () {
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
      ethers.getContractAt("ExampleManager", prevData.contracts.exampleManager),
      ethers.getContractAt("MyToken", prevData.contracts.myToken),
    ]);
    wallets = await wallets;
    admin = wallets[0].connect(provider);
    user00 = wallets[1].connect(provider);
    user01 = wallets[2].connect(provider);
    contracts = await contracts;
    proxyAdmin = contracts[0].connect(admin);
    registry = contracts[1].connect(admin);
    users = contracts[2].connect(admin);
    exampleManager = contracts[3].connect(admin);
    exampleManagerU00 = exampleManager.connect(user00);
    exampleManagerU01 = exampleManager.connect(user01);
    myToken = contracts[4].connect(admin);
  });

  step(`Check data from test ${PREV_TEST} is OK`, async () => {
    expect(admin.address).to.not.be.undefined;
    expect(user00.address).to.not.be.undefined;
    expect(user01.address).to.not.be.undefined;
    expect(proxyAdmin.address).to.not.be.undefined;
    expect(registry.address).to.not.be.undefined;
    expect(users.address).to.not.be.undefined;
    expect(exampleManager.address).to.not.be.undefined;
    expect(exampleManagerU00.address).to.not.be.undefined;
    expect(exampleManagerU01.address).to.not.be.undefined;
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

    const receiptU00 = (
      await exampleManagerU00.newUser(USER00.name, await encPassU00, GAS_OPT)
    ).wait();
    const receiptU01 = (
      await exampleManagerU01.newUser(USER01.name, await encPassU01, GAS_OPT)
    ).wait();

    const events = (await getEvents(
      exampleManager,
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
    // Save account --> ID
    userMap.set(user00.address, events[0].args!.id);
    userMap.set(user01.address, events[1].args!.id);

    expect(userMap.get(user00.address)).to.equal(events[0].args!.id);
    expect(userMap.get(user01.address)).to.equal(events[1].args!.id);
    expect(userMap.size).to.equal(2);
  });

  step("Should edit the two users", async () => {
    // Hashed encrypted passwords
    const encPassU00 = encryptHash(USER00.password);
    const encPassU01 = encryptHash(USER01.password);
    // calculate hashes to compare later
    const hashPass = [hash(USER00.password), hash(USER01.password)];
    const kHashNames = [kHash(USER00.name), kHash(USER01.name)];

    const receiptU00 = (
      await exampleManagerU00.editUser(
        userMap.get(user00.address)!,
        USER00.name,
        await encPassU00,
        GAS_OPT
      )
    ).wait();
    const receiptU01 = (
      await exampleManagerU01.editUser(
        userMap.get(user01.address)!,
        USER01.name,
        await encPassU01,
        GAS_OPT
      )
    ).wait();

    const events = (await getEvents(
      exampleManager,
      "UserEdited",
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
      console.log(`User edited:
      - Id: ${events[index].args?.id}
      - Name hash: ${events[index].args?.newName.hash}
      - Password: ${events[index].args?.newPassword}
      - Created: ${new Date((await block).timestamp * 1000)}`);

      expect(events[index].args!.id).not.to.be.undefined;
      expect(events[index].args!.newName.hash).to.equal(await kHashNames[index]);
      expect(await decrypt(events[index].args!.newPassword)).to.equal(await hashPass[index]);
    }
  });

  step("Should get users and check all", async () => {
    // calculate hashes to compare later
    const hashPass = [hash(USER00.password), hash(USER01.password)];

    const answerU00 = await exampleManagerU00.callStatic.getMyUser();
    const answerU01 = await exampleManagerU01.callStatic.getMyUser();

    expect(answerU00).not.to.be.undefined;
    expect(answerU01).not.to.be.undefined;
    expect(answerU00.id).not.to.equal(answerU01.id);
    expect(answerU00.owner).to.equal(user00.address);
    expect(answerU01.owner).to.equal(user01.address);
    expect(answerU00.name).to.equal(USER00.name);
    expect(answerU01.name).to.equal(USER01.name);
    expect(await decrypt(answerU00.password)).to.equal(await hashPass[0]);
    expect(await decrypt(answerU01.password)).to.equal(await hashPass[1]);
    expect(parseInt(answerU00.dateCreated._hex)).to.be.lessThan(
      parseInt(answerU00.dateModified._hex)
    );
    expect(parseInt(answerU01.dateCreated._hex)).to.be.lessThan(
      parseInt(answerU01.dateModified._hex)
    );
  });

  step("Should get all users", async () => {
    const allUsers = await exampleManager.callStatic.getAllUsers();

    expect(allUsers.length).to.equal(2);
    expect(allUsers[0].id).not.to.be.undefined;
    expect(allUsers[1].id).not.to.be.undefined;
  });

  step("Should remove first user", async () => {
    const user00_id = userMap.get(user00.address);
    expect(user00_id).not.to.be.undefined;
    const receipt = (await exampleManagerU00.deleteUser(user00_id!, GAS_OPT)).wait();

    //expect(parseInt(await exampleManager.ownerToUser(user00.address))).to.equal(0);

    const event = (await getEvents(
      exampleManager,
      "UserDeleted",
      [user00_id],
      true,
      (await receipt).blockNumber,
      (await receipt).blockNumber
    )) as Event;
    expect(event).not.to.be.undefined;
    expect(event.args).not.to.be.undefined;
    expect(event.args!.id).to.equal(user00_id);

    const allUsers = await exampleManager.callStatic.getAllUsers();
    expect(allUsers.length).to.equal(1);
    expect(allUsers[0].id).to.equal(userMap.get(user01.address));
    userMap.delete(user00.address);
    expect(userMap.size).to.equal(1);
  });

  after("Store test information", async () => {
    // re-create second user
    // Hashed encrypted passwords
    const encPassU00 = encryptHash(USER00.password);
    // calculate hashes to compare later
    const hashPassU00 = hash(USER00.password);
    const kHashNameU00 = kHash(USER00.name);

    const receiptU00 = (
      await exampleManagerU00.newUser(USER00.name, await encPassU00, GAS_OPT)
    ).wait();

    const event = (await getEvents(
      exampleManager,
      "UserCreated",
      [null, null, null],
      true,
      (await receiptU00).blockNumber,
      (await receiptU00).blockNumber
    )) as Event;
    expect(receiptU00).not.to.be.undefined;
    expect(event.args).not.to.be.undefined;
    expect(event.args!.id).not.to.be.undefined;
    expect(event.args!.name.hash).to.equal(await kHashNameU00);
    expect(await decrypt(event.args!.password)).to.equal(await hashPassU00);
    // Save account --> ID
    userMap.set(user00.address, event.args!.id);
    expect(userMap.get(user00.address)).to.equal(event.args!.id);
    expect(userMap.size).to.equal(2);

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
          exampleManager: exampleManager.address,
          myToken: myToken.address,
        },
      })
    );
    console.log(`Test data saved in ./test/data/${THIS_TEST}.json`);
  });
});
