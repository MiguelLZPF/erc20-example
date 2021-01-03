import { Wallet, FixedNumber } from "ethers";
import { ethers } from "hardhat";

import * as fs from "async-file";
import { GAS_OPT, getWallet, provider } from "../scripts/Blockchain";
import { expect } from "chai";
import { step } from "mocha-steps";

import { ProxyAdmin } from "../typechain/ProxyAdmin";
import { ContractRegistry } from "../typechain/ContractRegistry";
import { IobManager } from "../typechain/IobManager";
import { MyToken } from "../typechain/MyToken";
import { Users } from "../typechain/Users";
import { toBigNum } from "../scripts/Utils";

// General Constants
const WALL_PASS = "password";
const PREV_TEST = "01_Users";
const THIS_TEST = "02_Token";
// Specific Constants

const AMOUNTS = {
  deposit: 10000,
  transfer: 1500.5,
  withdraw: 5000,
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
let iobManagerU00: IobManager;
let iobManagerU01: IobManager;
let myToken: MyToken;
let myTokenU00: MyToken;
let myTokenU01: MyToken;

// maps account and user ID
let userMap = new Map<string, string>();

describe("IobManager token related test", async function () {
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
    proxyAdmin = contracts[0].connect(admin);
    registry = contracts[1].connect(admin);
    users = contracts[2].connect(admin);
    iobManager = contracts[3].connect(admin);
    iobManagerU00 = iobManager.connect(user00);
    iobManagerU01 = iobManager.connect(user01);
    myToken = contracts[4].connect(admin);
    myTokenU00 = myToken.connect(user00);
    myTokenU01 = myToken.connect(user01);

    const usersDefined = await iobManager.callStatic.getAllUsers();
    for (let index = 0; index < usersDefined.length; index++) {
      userMap.set(usersDefined[index].owner, usersDefined[index].id);
    }
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
    expect(userMap.size).to.equal(2);

    console.log(`All data from test ${PREV_TEST} retreived OK`);
  });

  step(`Check initial state is OK`, async () => {
    const bankBalance = FixedNumber.fromValue(await myToken.balanceOf(iobManager.address), 18);
    const balanceU00 = FixedNumber.fromValue(await myToken.balanceOf(user00.address), 18);
    const balanceU01 = FixedNumber.fromValue(await myToken.balanceOf(user01.address), 18);

    expect(bankBalance.toUnsafeFloat()).to.equal(10000000000000);
    expect(balanceU00.toUnsafeFloat()).to.equal(0);
    expect(balanceU01.toUnsafeFloat()).to.equal(0);
  });

  step(`Deposit tokens to accounts`, async () => {
    const receipts = [
      await iobManager.deposit(
        userMap.get(user00.address)!,
        await toBigNum(AMOUNTS.deposit),
        GAS_OPT
      ),
      await iobManager.deposit(
        userMap.get(user01.address)!,
        await toBigNum(AMOUNTS.deposit),
        GAS_OPT
      ),
    ];

    const bankBalance = FixedNumber.fromValue(await myToken.balanceOf(iobManager.address), 18);
    const balanceU00 = FixedNumber.fromValue(await myToken.balanceOf(user00.address), 18);
    const balanceU01 = FixedNumber.fromValue(await myToken.balanceOf(user01.address), 18);

    expect(bankBalance.toUnsafeFloat()).to.equal(10000000000000 - AMOUNTS.deposit * 2);
    expect(balanceU00.toUnsafeFloat()).to.equal(AMOUNTS.deposit);
    expect(balanceU01.toUnsafeFloat()).to.equal(AMOUNTS.deposit);
  });

  step(`Transfer tokens between users accounts`, async () => {
    await myTokenU00.approve(iobManager.address, await toBigNum(AMOUNTS.transfer), GAS_OPT);

    await iobManager.transfer(
      userMap.get(user00.address)!,
      userMap.get(user01.address)!,
      await toBigNum(AMOUNTS.transfer),
      GAS_OPT
    );

    const bankBalance = FixedNumber.fromValue(await myToken.balanceOf(iobManager.address), 18);
    const balanceU00 = FixedNumber.fromValue(await myToken.balanceOf(user00.address), 18);
    const balanceU01 = FixedNumber.fromValue(await myToken.balanceOf(user01.address), 18);

    expect(bankBalance.toUnsafeFloat()).to.equal(10000000000000 - AMOUNTS.deposit * 2);
    expect(balanceU00.toUnsafeFloat()).to.equal(AMOUNTS.deposit - AMOUNTS.transfer);
    expect(balanceU01.toUnsafeFloat()).to.equal(AMOUNTS.deposit + AMOUNTS.transfer);
  });

  step(`Withdraw tokens from accounts`, async () => {
    await myTokenU00.approve(iobManager.address, await toBigNum(AMOUNTS.withdraw), GAS_OPT);
    await myTokenU01.approve(iobManager.address, await toBigNum(AMOUNTS.withdraw), GAS_OPT);

    await iobManager.withdraw(
      userMap.get(user00.address)!,
      await toBigNum(AMOUNTS.withdraw),
      GAS_OPT
    );
    await iobManager.withdraw(
      userMap.get(user01.address)!,
      await toBigNum(AMOUNTS.withdraw),
      GAS_OPT
    );

    const bankBalance = FixedNumber.fromValue(await myToken.balanceOf(iobManager.address), 18);
    const balanceU00 = FixedNumber.fromValue(await myToken.balanceOf(user00.address), 18);
    const balanceU01 = FixedNumber.fromValue(await myToken.balanceOf(user01.address), 18);

    expect(bankBalance.toUnsafeFloat()).to.equal(
      10000000000000 - AMOUNTS.deposit * 2 + AMOUNTS.withdraw * 2
    );
    expect(balanceU00.toUnsafeFloat()).to.equal(
      AMOUNTS.deposit - AMOUNTS.transfer - AMOUNTS.withdraw
    );
    expect(balanceU01.toUnsafeFloat()).to.equal(
      AMOUNTS.deposit + AMOUNTS.transfer - AMOUNTS.withdraw
    );
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
    console.log(`Test data saved in ./test/data/${THIS_TEST}.json`);
    console.log("========== Should NOTs have NOT been implemented!! ===============");
  });
});