//import server from "../../server";
import express from "express";
import http from "http";
import * as chai from "chai";
import chaiHttp = require("chai-http");
import "mocha";
import request from "supertest";
import middleware from "../../middleware";
import { retrieveWallet } from "../../middleware/blockchain";
import { applyMiddleware, applyRoutes } from "../../utils";
import { Constants } from "../../utils/config";
import routes from "../../services";
import publicIp = require("public-ip");
import { BigNumber, PopulatedTransaction } from "ethers";
import { ISendTx_req } from "../../models/TxProxy";
const router = express();

chai.use(chaiHttp);
const expect = chai.expect;

const USER_00 = {
  name: "User00",
  password: "myPassword",
  walletPass: "password",
  walletPath: "./src/keystore/user_00.json",
};

describe("Authentication tests", async () => {
  before(async () => {
    applyMiddleware(middleware, router);
    applyRoutes(routes, router);

    router.set("port", Constants.PORT || 3000);
    //const { PORT = 4000 } = process.env;
    const server = http.createServer(router);

    server.listen(Constants.PORT, async () => {
      console.log(`Server is running http://${await publicIp.v4()}:${Constants.PORT}...`);
    });
    await delay(6000);
  });

  it("Should create new user", async () => {
    const wallet = await retrieveWallet(USER_00.walletPath, USER_00.walletPass);
    const user = {
      username: USER_00.name,
      password: USER_00.password,
      from: `${wallet!.address}`,
    };
    let response = await request(router).post(`${Constants.ROOT}/users`).send(user);
    console.log(`TEST --> ${response.body.message}`);
    expect(response.body.unsignedTx).not.to.be.undefined;

    const unsignedTx = response.body.unsignedTx as PopulatedTransaction;
    unsignedTx.gasLimit = BigNumber.from(0x23c3ffff);
    unsignedTx.gasPrice = BigNumber.from(0);
    unsignedTx.value = BigNumber.from(0);
    const signedTx = await wallet?.signTransaction(unsignedTx);
    const sendBody: ISendTx_req = {
      signedTx: signedTx!
    }
    response = await request(router).post(`${Constants.ROOT}/tx-proxy/send`).send(sendBody);

    console.log(response.body);
  });
});

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
