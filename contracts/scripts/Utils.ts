import util from "util";
import CryptoJS from "crypto-js";
import { keccak256, toUtf8Bytes } from "ethers/lib/utils";

const CRYPTO_KEY = "passworddd";
/**
 * Converts a decimal version like '01.10' to a bytes2 version like '0x010A'
 * @param decVersion decimal format version
 * @return hexadecimal bytes2 forma version
 */
export const toHexVersion = async (decVersion: string) => {
  try {
    let hexVersion = "0x";
    const splitVersion = decVersion.split(".");
    if (splitVersion.length != 2) {
      throw new Error("Not valid version. 'XX.XX' only format accepted.");
    }
    splitVersion.forEach(async (byte) => {
      if (byte.length == 1) {
        hexVersion = `${hexVersion}0${parseInt(byte).toString(16)}`;
      } else {
        hexVersion = `${hexVersion}${parseInt(byte).toString(16)}`;
      }
    });
    return hexVersion;
  } catch (error) {
    console.error(`ERROR: Cannot convert to hexadecimal version. ${(error.stack, error.code)}`);
  }
};

/**
 * Generates a random 32 bytes string array
 * @return random 32 bytes string array
 */
export const random32Bytes = async () => {
  let bytes: string = "0x";
  for (let i = 0; i < 64; i++) {
    const randInt = Math.floor(Math.random() * (15 - 0 + 1) + 0);
    bytes = `${bytes}${randInt.toString(16)}`;
  }
  return bytes;
};

/**
 * Logs a Typescript object
 * @param object typescript object to be logged
 */
export const logObject = (object: any) => {
  return util.inspect(object, { showHidden: false, depth: null });
};

/**
 * @title Crypto Functions
 * @dev used for password secure storage and retrieve
 */
export const encryptHash = async (value: string): Promise<string> => {
  const shaValue = CryptoJS.SHA256(value).toString();
  return CryptoJS.AES.encrypt(shaValue, CRYPTO_KEY).toString();
};
export const hash = async (value: string): Promise<string> => {
  return CryptoJS.SHA256(value).toString();
};
export const kHash = async (value: string) => {
  return keccak256(toUtf8Bytes(value));
}
export const encrypt = async (value: string): Promise<string> => {
  return CryptoJS.AES.encrypt(value, CRYPTO_KEY).toString();
};
export const decrypt = async (value: string): Promise<string> => {
  return CryptoJS.AES.decrypt(value, CRYPTO_KEY).toString(CryptoJS.enc.Utf8);
};
