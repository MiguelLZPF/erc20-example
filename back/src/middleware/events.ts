import { BigNumber, Bytes } from "ethers";
import { registerUser } from "../services/authentication/controller";
import { deposit, transfer } from "../services/exchange/controller";
import { ContractRegistry, IobManager, MyToken, ProxyAdmin, Users } from "../typechain";
import { logClose, logger, logStart } from "./logger";

export const subscribeEvents = async (
  proxyAdmin: ProxyAdmin,
  contractRegistry: ContractRegistry,
  iobManager: IobManager,
  myToken: MyToken,
  users: Users
) => {
  const logInfo = logStart("events.ts", "subscribeEvents", "debug");
  try {

    Promise.all([
      subsUserCreated(iobManager),
      subsDeposit(iobManager),
      subsTransfer(iobManager)
    ])

    return true;
  } catch (error) {
    logger.error(` ${logInfo.instance} Subscribing to events. ${error.stack}`);
    return false;
  } finally {
    logClose(logInfo);
  }
};

const subsUserCreated = async (iobManager: IobManager) => {
  const filter = iobManager.filters.UserCreated(null, null, null);
  iobManager.on(filter, async (id: string | Bytes, name: string, password: string) => {
    await registerUser(id, name, password);
  });
};

const subsDeposit = async (iobManager: IobManager) => {
  const filter = iobManager.filters.Deposit(null, null);
  iobManager.on(filter, async (recipient: string, amount: BigNumber) => {
    await deposit(recipient, amount);
  });
};

const subsTransfer = async (iobManager: IobManager) => {
  const filter = iobManager.filters.Transfer(null, null, null);
  iobManager.on(filter, async (spender: string, recipient: string, amount: BigNumber) => {
    await transfer(spender, recipient, amount);
  });
};