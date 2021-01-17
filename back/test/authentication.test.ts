// import * as _chai from "chai";
// import http from "http";
// import express from "express";
// import routes from "../src/services";
// import request from "supertest";
// import middleware from "../src/middleware";
// import { retrieveWallet } from "../src/middleware/blockchain";
// import { applyMiddleware, applyRoutes } from "../src/utils";
// import { Constants } from "../src/utils/config";
// import publicIp from "public-ip";
// _chai.should();

// const router = express();

// const USER_00 = {
//   name: "User00",
//   password: "myPassword",
//   walletPass: "password",
//   walletPath: "../src/keystore/user_00.json",
// };

// describe("Authentication tests", async () => {
//   before(async () => {
    
//     applyMiddleware(middleware, router);
//     applyRoutes(routes, router);

//     router.set("port", Constants.PORT || 3000);
//     //const { PORT = 4000 } = process.env;
//     const server = http.createServer(router);

//     server.listen(Constants.PORT, async () => {
//       console.log(`Server is running http://${await publicIp.v4()}:${Constants.PORT}...`);
//     });
//   });

//   it("Should create new user", async () => {
//     const wallet = await retrieveWallet(USER_00.walletPath, USER_00.walletPass);
//     const user = {
//       username: USER_00.name,
//       password: USER_00.password,
//       from: `${wallet!.address}`,
//     };
//     const response = await request(router).post(`${Constants.ROOT}/users`).send(user);
//     console.log(response);
//   });
// });
