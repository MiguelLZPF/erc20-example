import fetch from "node-fetch";
import * as chai from "chai";
//import chaiHttp = require("chai-http");
import "mocha";
import * as child from "child_process";
import { BigNumber, Wallet } from "ethers";
import { Constants } from "../src/utils/config";
import { retrieveWallet } from "../src/middleware/blockchain";
import { ISendTx_req, ISendTx_res } from "../src/models/TxProxy";
import { ILogin_req, ILogin_res, ISignUp_res, IToken } from "../src/models/Auth";
import { IGetMyUser_res } from "../src/models/User";
import { IDeposit_req, IDeposit_res, ITransfer_req, ITransfer_res } from "../src/models/Exchange";
import { response } from "express";

//chai.use(chaiHttp);
const expect = chai.expect;

const BACK_IP = "localhost";

const USER_00 = {
  name: "User00",
  password: "myPassword",
  walletPass: "password",
  walletPath: "./src/keystore/user_00.json",
};

const USER_01 = {
  name: "User01",
  password: "myPassword",
  walletPass: "password",
  walletPath: "./src/keystore/user_01.json",
};

const BANK_INIT_BALANCE = 10000;
const DEPOSIT = 1000;
const TRANSFER = 500;

let admin: Wallet | undefined;
let user00Token: IToken | undefined;
let user01Token: IToken | undefined;

describe("Exchange tests", async () => {
  before(async () => {
    admin = await retrieveWallet(Constants.ADMIN_PATH, Constants.ADMIN_PASSWORD);
  });

  it("Should login with two users", async () => {
    const wallets = await Promise.all([
      retrieveWallet(USER_00.walletPath, USER_00.walletPass),
      retrieveWallet(USER_00.walletPath, USER_00.walletPass),
    ]);
    expect(wallets[0]).not.to.be.undefined;
    expect(wallets[1]).not.to.be.undefined;
    expect(wallets.length).to.equal(2);
    // HTTP POSTs login
    const loginBody00_req: ILogin_req = {
      username: USER_00.name,
      password: USER_00.password,
    };
    const loginBody01_req: ILogin_req = {
      username: USER_01.name,
      password: USER_01.password,
    };
    let responses = await Promise.all([
      fetch(`http://${BACK_IP}:${Constants.PORT}${Constants.ROOT}/login`, {
        method: "POST",
        body: JSON.stringify(loginBody00_req),
        headers: { "Content-Type": "application/json" },
      }),
      fetch(`http://${BACK_IP}:${Constants.PORT}${Constants.ROOT}/login`, {
        method: "POST",
        body: JSON.stringify(loginBody01_req),
        headers: { "Content-Type": "application/json" },
      }),
    ]);

    let bodies: ILogin_res[] = [];
    for (let i = 0; i < responses.length; i++) {
      expect(responses[i]).not.to.be.undefined;
      expect(responses[i].status).to.equal(200);
      bodies[i] = (await responses[i].json()) as ILogin_res;
      expect(bodies[i]).not.to.be.undefined;
      expect(bodies[i].login).to.equal(true);
      expect(bodies[i].token).not.to.be.undefined;
    }
    user00Token = bodies[0].token;
    user01Token = bodies[1].token;
  });
  it("Should deposit 1000 tokens in User00 account", async () => {
    // HTTP POST deposit
    const depositBody_req = {
      amount: DEPOSIT,
    };
    let response = await fetch(
      `http://${BACK_IP}:${Constants.PORT}${Constants.ROOT}/exchange/deposit`,
      {
        method: "PUT",
        body: JSON.stringify(depositBody_req),
        headers: { "Content-Type": "application/json", Authorization: user00Token?.JWToken! },
      }
    );
    expect(response).not.to.be.undefined;
    expect(response.status).to.equal(200);
    let depositBody_res = (await response.json()) as IDeposit_res;
    expect(depositBody_res).not.to.be.undefined;
    expect(depositBody_res.tokenBalance);
    console.log(depositBody_res.message);
  });
  it("Should should transfer from user 00 to user 01", async () => {
    const senderWallet = await retrieveWallet(USER_00.walletPath, USER_00.walletPass);
    const recipientWallet = await retrieveWallet(USER_01.walletPath, USER_01.walletPass);
    expect(recipientWallet).not.to.be.undefined;
    // HTTP POST SignUp
    const transferBody_req = {
      amount: TRANSFER,
      recipientAccount: recipientWallet?.address,
    };
    let response = await fetch(
      `http://${BACK_IP}:${Constants.PORT}${Constants.ROOT}/exchange/transfer`,
      {
        method: "PUT",
        body: JSON.stringify(transferBody_req),
        headers: { "Content-Type": "application/json", Authorization: user00Token?.JWToken! },
      }
    );
    expect(response).not.to.be.undefined;
    expect(response.status).to.equal(200);
    let transferBody_res = (await response.json()) as ITransfer_res;
    expect(transferBody_res).not.to.be.undefined;
    console.log(transferBody_res.message);

    // Get Txs
    expect(transferBody_res.A_approveUnsignedTx).not.to.be.undefined;
    expect(transferBody_res.B_transferSignedTx).not.to.be.undefined;
    const approveUnsTx = transferBody_res.A_approveUnsignedTx;
    // Approve unsigned tx
    approveUnsTx!.gasLimit = BigNumber.from(0x23c3ffff);
    approveUnsTx!.gasPrice = BigNumber.from(0);
    approveUnsTx!.value = BigNumber.from(0);
    // Sign approve Tx
    let sigTx = (await senderWallet?.signTransaction(approveUnsTx!))!;
    expect(sigTx).not.to.be.undefined;
    // HTTP POST send tx
    let sendTxBody_req: ISendTx_req = {
      signedTx: sigTx!,
    };
    response = await fetch(`http://${BACK_IP}:${Constants.PORT}${Constants.ROOT}/tx-proxy/send`, {
      method: "POST",
      body: JSON.stringify(sendTxBody_req),
      headers: { "Content-Type": "application/json" },
    });
    expect(response).not.to.be.undefined;
    expect(response.status).to.equal(200);
    let sendTxBody_res = (await response.json()) as ISendTx_res;
    expect(sendTxBody_res).not.to.be.undefined;
    console.log(sendTxBody_res.message);
    expect(sendTxBody_res.receipt).not.to.be.undefined;
    // Send Transfer Tx
    // HTTP POST send tx
    sigTx = transferBody_res.B_transferSignedTx!;
    sendTxBody_req = {
      signedTx: sigTx!,
    };
    response = await fetch(`http://${BACK_IP}:${Constants.PORT}${Constants.ROOT}/tx-proxy/send`, {
      method: "POST",
      body: JSON.stringify(sendTxBody_req),
      headers: { "Content-Type": "application/json" },
    });
    expect(response).not.to.be.undefined;
    expect(response.status).to.equal(200);
    sendTxBody_res = (await response.json()) as ISendTx_res;
    expect(sendTxBody_res).not.to.be.undefined;
    console.log(sendTxBody_res.message);
    expect(sendTxBody_res.receipt).not.to.be.undefined;
  });

  it("Should check balances", async () => {
    await delay(5000);

    const senderWallet = await retrieveWallet(USER_00.walletPath, USER_00.walletPass);
    const recipientWallet = await retrieveWallet(USER_01.walletPath, USER_01.walletPass);
    // HTTP GET users
    const responses = await Promise.all([
      fetch(`http://${BACK_IP}:${Constants.PORT}${Constants.ROOT}/users/me`, {
        headers: { "Content-Type": "application/json", Authorization: user00Token?.JWToken! },
      }),
      fetch(`http://${BACK_IP}:${Constants.PORT}${Constants.ROOT}/users/me`, {
        headers: { "Content-Type": "application/json", Authorization: user01Token?.JWToken! },
      }),
    ]);
    expect(responses[0]).not.to.be.undefined;
    expect(responses[1]).not.to.be.undefined;

    // Get users from bodies
    const bodies = await Promise.all([
      responses[0].json(),
      responses[1].json()
    ]);
    const users = [(bodies[0] as IGetMyUser_res).user, (bodies[1] as IGetMyUser_res).user];

    console.log(`
    FINAL BALANCES:
      User 00 Bank's balance: ${users[0]?.balance}
      User 01 Bank's balance: ${users[1]?.balance}
      User 00 Token's balance: ${users[0]?.tokenBalance}
      User 01 Token's balance: ${users[1]?.tokenBalance}
    `);

    expect(users[0]?.balance).to.equal(BANK_INIT_BALANCE - DEPOSIT);
    expect(users[1]?.balance).to.equal(BANK_INIT_BALANCE);
    expect(users[0]?.tokenBalance).to.equal(DEPOSIT - TRANSFER);
    expect(users[1]?.tokenBalance).to.equal(TRANSFER);

  });

  /* after("Remove doker containers", async () => {
    child.execSync("docker-compose -f docker-compose-test.yaml down");
  }); */
});

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
