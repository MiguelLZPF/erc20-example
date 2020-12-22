import { Constants } from "../utils/config";

const util = require("util");
const pino = require("pino");
//import * as pino from 'pino';
export const logger = pino({
  level: Constants.LOG_LEVEL || "info",
  prettyPrint: {
    levelFirst: true,
  },
  prettifier: require("pino-pretty"),
});

interface ILogInfo {
  fileName: string;
  funcName: string;
  level?: string;
  silent?: boolean;
  instance: string;
  time: Date;
}

let INSTANCE_NUMBER = 0;

export const logStart = (
  fileName: string,
  funcName: string,
  level?: string,
  silent?: boolean
) => {
  const logInfo: ILogInfo = {
    fileName: fileName,
    funcName: funcName,
    level: level?.toLowerCase(),
    silent: silent,
    instance: `[${fileName} | ${funcName} (${INSTANCE_NUMBER})]`,
    time: new Date(),
  };
  if (!silent) {
    if (level) {
      switch (level) {
        case "debug":
          logger.debug(`ENTER --> ${logInfo.instance}`);
          break;
        case "info":
          logger.info(`ENTER --> ${logInfo.instance}`);
          break;
        case "trace":
          logger.trace(`ENTER --> ${logInfo.instance}`);
          break;
        default:
          logger.debug(`ENTER --> ${logInfo.instance}`);
          break;
      }
    } else {
      logger.debug(`ENTER --> ${logInfo.instance}`);
    }
  }
  INSTANCE_NUMBER++;
  return logInfo;
};

export const logClose = (logInfo: ILogInfo) => {
  const time = new Date();
  if (!logInfo.silent) {
    if (logInfo.level) {
      switch (logInfo.level) {
        case "debug":
          logger.debug(
            `EXIT <-- ${logInfo.instance} Total time: ${(time.valueOf() -
              logInfo.time.valueOf()) /
              1000} seconds`
          );
          break;
        case "info":
          logger.info(
            `EXIT <-- ${logInfo.instance} Total time: ${(time.valueOf() -
              logInfo.time.valueOf()) /
              1000} seconds`
          );
          break;
        case "trace":
          logger.trace(
            `EXIT <-- ${logInfo.instance} Total time: ${(time.valueOf() -
              logInfo.time.valueOf()) /
              1000} seconds`
          );
          break;
        default:
          logger.debug(
            `EXIT <-- ${logInfo.instance} Total time: ${(time.valueOf() -
              logInfo.time.valueOf()) /
              1000} seconds`
          );
          break;
      }
    } else {
      logger.debug(
        `EXIT <-- ${logInfo.instance} Total time: ${(time.valueOf() -
          logInfo.time.valueOf()) /
          1000} seconds`
      );
    }
  }
};

export const logObject = (object: any) => {
  return util.inspect(object, { showHidden: false, depth: null });
};
