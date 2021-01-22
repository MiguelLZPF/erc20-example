import fetch from "node-fetch";
import * as chai from "chai";
//import chaiHttp = require("chai-http");
import "mocha";
import { BigNumber, Wallet } from "ethers";
import { Constants } from "../src/utils/config";
import { retrieveWallet } from "../src/middleware/blockchain";
import { ISendTx_req, ISendTx_res } from "../src/models/TxProxy";
import ExtUser from "../src/models/ExtUser";
import { ILogin_req, ILogin_res, ISignUp_res, IToken } from "../src/models/Auth";
import { IGetMyUser_res } from "../src/models/User";

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

let admin: Wallet | undefined;
let userToken: IToken | undefined;

describe("Authentication tests", async () => {
  before(async () => {
    /* applyMiddleware(middleware, router);
    applyRoutes(routes, router);

    router.set("port", Constants.PORT || 3000);
    //const { PORT = 4000 } = process.env;
    const server = http.createServer(router);

    server.listen(Constants.PORT, async () => {
      console.log(`Server is running http://${await publicIp.v4()}:${Constants.PORT}...`);
    }); */
    //await delay(8000);
    admin = await retrieveWallet(Constants.ADMIN_PATH, Constants.ADMIN_PASSWORD);
  });

  it("Should create user 00", async () => {
    const wallet = await retrieveWallet(USER_00.walletPath, USER_00.walletPass);
    expect(wallet).not.to.be.undefined;
    // HTTP POST SignUp
    const singUpBody_req = {
      username: USER_00.name,
      password: USER_00.password,
      from: `${wallet!.address}`,
    };
    let response = await fetch(`http://${BACK_IP}:${Constants.PORT}${Constants.ROOT}/users`, {
      method: "POST",
      body: JSON.stringify(singUpBody_req),
      headers: { "Content-Type": "application/json" },
    });
    expect(response).not.to.be.undefined;
    expect(response.status).to.equal(200);
    let signUpBody_res = (await response.json()) as ISignUp_res;
    expect(signUpBody_res).not.to.be.undefined;
    console.log(signUpBody_res.message);

    // Get unsigned tx
    expect(signUpBody_res.unsignedTx).not.to.be.undefined;
    const unsignedTx = signUpBody_res.unsignedTx!;
    unsignedTx.gasLimit = BigNumber.from(0x23c3ffff);
    unsignedTx.gasPrice = BigNumber.from(0);
    unsignedTx.value = BigNumber.from(0);
    // Sign SignUp Tx
    const signedTx = await wallet?.signTransaction(unsignedTx);
    expect(signedTx).not.to.be.undefined;
    // HTTP POST send tx
    let sendTxBody_req: ISendTx_req = {
      signedTx: signedTx!,
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
  });
  it("Should login and get the token", async () => {
    await delay(5000);
    const wallet = await retrieveWallet(USER_00.walletPath, USER_00.walletPass);
    expect(wallet).not.to.be.undefined;
    // HTTP POST login
    const loginBody_req: ILogin_req = {
      username: USER_00.name,
      password: USER_00.password,
    };
    let response = await fetch(`http://${BACK_IP}:${Constants.PORT}${Constants.ROOT}/login`, {
      method: "POST",
      body: JSON.stringify(loginBody_req),
      headers: { "Content-Type": "application/json" },
    });
    expect(response).not.to.be.undefined;
    expect(response.status).to.equal(200);
    let loginBody_res = (await response.json()) as ILogin_res;
    expect(loginBody_res).not.to.be.undefined;
    expect(loginBody_res.login).to.equal(true);
    expect(loginBody_res.token).not.to.be.undefined;
    userToken = loginBody_res.token;
    console.log(loginBody_res.message);
    //console.log(userToken);
  });
  it("Should get my user", async () => {
    //await delay(5000);
    const wallet = await retrieveWallet(USER_00.walletPath, USER_00.walletPass);
    expect(wallet).not.to.be.undefined;
    // HTTP GET user
    let response = await fetch(`http://${BACK_IP}:${Constants.PORT}${Constants.ROOT}/users/me`, {
      headers: { "Content-Type": "application/json", Authorization: userToken?.JWToken! },
    });
    expect(response).not.to.be.undefined;
    const userBody_res = (await response.json()) as IGetMyUser_res;
    console.log(userBody_res.user);
    expect(userBody_res.user!.owner).to.equal(wallet?.address);
  });
  // it("Should create user 01", async () => {
  //   const wallet = await retrieveWallet(USER_01.walletPath, USER_01.walletPass);
  //   expect(wallet).not.to.be.undefined;
  //   // HTTP POST SignUp
  //   const user = {
  //     username: USER_01.name,
  //     password: USER_01.password,
  //     from: `${wallet!.address}`,
  //   };
  //   let response = await request(router).post(`${Constants.ROOT}/users`).send(user);
  //   expect(response).not.to.be.undefined;
  //   expect(response.body).not.to.be.undefined;
  //   expect(response.status).to.equal(200);
  //   let signUpBody = response.body as ISignUp_res;
  //   console.log(`TEST --> ${signUpBody.message}`);

  //   // Get unsigned tx
  //   expect(signUpBody.unsignedTx).not.to.be.undefined;
  //   const unsignedTx = signUpBody.unsignedTx!;
  //   unsignedTx.gasLimit = BigNumber.from(0x23c3ffff);
  //   unsignedTx.gasPrice = BigNumber.from(0);
  //   unsignedTx.value = BigNumber.from(0);
  //   // Sign SignUp Tx
  //   const signedTx = await wallet?.signTransaction(unsignedTx);
  //   expect(signedTx).not.to.be.undefined;
  //   // HTTP POST send tx
  //   let sigTxBody: ISendTx_req = {
  //     signedTx: signedTx!
  //   }
  //   response = await request(router).post(`${Constants.ROOT}/tx-proxy/send`).send(sigTxBody);
  //   expect(response).not.to.be.undefined;
  //   expect(response.body).not.to.be.undefined;
  //   expect(response.status).to.equal(200);
  //   let sendTxBody = response.body as ISendTx_res;
  //   console.log(`TEST --> ${sendTxBody.message}`);
  //   // wait until provider watch the transaction is mined
  //   await provider.waitForTransaction(sendTxBody.txHash!);
  //   // Checks
  //   // -- check user in BC
  //   const userBC = await iobManager!.connect(admin!).callStatic.getUserByName(USER_01.name);
  //   await delay(3000);// wait until event is listened and user is registered in BC
  //   // -- check user in DB
  //   const userDB = await ExtUser.findOne({username: USER_01.name});

  //   /* console.log(userBC);
  //   console.log(userDB); */

  //   expect(userBC).not.to.be.undefined;
  //   expect(userDB).not.to.be.undefined;
  //   expect(userBC.id).to.equal(userDB.id);
  // });
});

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
