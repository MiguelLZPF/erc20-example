import express, { Router } from "express";
import { Constants } from "../../utils/config";
import request from "supertest";
import { applyMiddleware, applyRoutes } from "../../utils";
import promiseRequest from "request-promise";
import middleware from "../../middleware";
import errorHandlers from "../../middleware/errorHandlers";
import routes from "./routes";

// INTEGRATION TEST

jest.mock("request-promise");
(promiseRequest as any).mockImplementation(() => '{"features": []}');
jest.setTimeout(1000000);

describe("routes", () => {
  let router: Router;

  beforeEach(() => {
    router = express();
    applyMiddleware(middleware, router);
    applyRoutes(routes, router);
    applyMiddleware(errorHandlers, router);
  });

  test("Creates a list of random new users", async () => {
    const N = 700;

    let userProm: Promise<boolean>[] = [];
    for (let index = 0; index < N; index++) {
      const rand = randomInt(0, 1);
      userProm.push(
        new Promise(async (resolve, reject) => {
          const user = {
            "username": `a${index}`,
            "password": `user${index}`,
            "rol": (await rand)! == 0 ? "borrower" : "investor"
          }
          const response = await request(router).post(`${Constants.ROOT}/users`).send(user);
          //console.log(response.body);
          (response.body.created) ? resolve(true) : resolve(false);
        })
      );
    }
    const expected: boolean[] = [];
    for (let index = 0; index < N; index++) {
      expected.push(true);
    }
    console.log(expected);
    const result = await Promise.all(userProm);
    expect(result).toEqual(expected);
  });
});

 /**
 * generate a random integer between min and max
 * @param min 
 * @param max
 * @return random generated integer 
 */
export const randomInt = async(min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};