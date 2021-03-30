import { BigNumber, Bytes } from "ethers";
import { registerUser } from "../services/authentication/controller";
import { transfer } from "../services/exchange/controller";
import { ContractRegistry, ExampleManager, MyToken, ProxyAdmin, Users } from "../typechain";
import { logClose, logger, logStart } from "./logger";

export const subscribeEvents = async (
  proxyAdmin: ProxyAdmin,
  contractRegistry: ContractRegistry,
  exampleManager: ExampleManager,
  myToken: MyToken,
  users: Users
) => {
  const logInfo = logStart("events.ts", "subscribeEvents", "debug");
  try {

    Promise.all([
      subsUserCreated(exampleManager),
      //subsDeposit(exampleManager),
      subsTransfer(exampleManager)
    ])

    return true;
  } catch (error) {
    logger.error(` ${logInfo.instance} Subscribing to events. ${error.stack}`);
    return false;
  } finally {
    logClose(logInfo);
  }
};

const subsUserCreated = async (exampleManager: ExampleManager) => {
  const filter = exampleManager.filters.UserCreated(null, null, null);
  exampleManager.on(filter, async (id, name, password) => {
    await registerUser(id, name, password);
  });
};

/* const subsDeposit = async (exampleManager: ExampleManager) => {
  const filter = exampleManager.filters.Deposit(null, null);
  exampleManager.on(filter, async (recipient: string, amount: BigNumber) => {
    await deposit(recipient, amount);
  });
}; */

const subsTransfer = async (exampleManager: ExampleManager) => {
  const filter = exampleManager.filters.Transfer(null, null, null);
  exampleManager.on(filter, async (spender, recipient, amount) => {
    await transfer(spender, recipient, amount);
  });
};