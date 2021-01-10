/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import {
  ethers,
  EventFilter,
  Signer,
  BigNumber,
  BigNumberish,
  PopulatedTransaction,
} from "ethers";
import {
  Contract,
  ContractTransaction,
  Overrides,
  CallOverrides,
} from "@ethersproject/contracts";
import { BytesLike } from "@ethersproject/bytes";
import { Listener, Provider } from "@ethersproject/providers";
import { FunctionFragment, EventFragment, Result } from "@ethersproject/abi";

interface IUsersInterface extends ethers.utils.Interface {
  functions: {
    "deleteUser(bytes32)": FunctionFragment;
    "editUser(bytes32,string,string)": FunctionFragment;
    "getAllUsers()": FunctionFragment;
    "getUser(bytes32)": FunctionFragment;
    "getUsers(bytes32[])": FunctionFragment;
    "initManager()": FunctionFragment;
    "newUser(string,string,address)": FunctionFragment;
  };

  encodeFunctionData(
    functionFragment: "deleteUser",
    values: [BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "editUser",
    values: [BytesLike, string, string]
  ): string;
  encodeFunctionData(
    functionFragment: "getAllUsers",
    values?: undefined
  ): string;
  encodeFunctionData(functionFragment: "getUser", values: [BytesLike]): string;
  encodeFunctionData(
    functionFragment: "getUsers",
    values: [BytesLike[]]
  ): string;
  encodeFunctionData(
    functionFragment: "initManager",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "newUser",
    values: [string, string, string]
  ): string;

  decodeFunctionResult(functionFragment: "deleteUser", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "editUser", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "getAllUsers",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "getUser", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "getUsers", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "initManager",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "newUser", data: BytesLike): Result;

  events: {};
}

export class IUsers extends Contract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  on(event: EventFilter | string, listener: Listener): this;
  once(event: EventFilter | string, listener: Listener): this;
  addListener(eventName: EventFilter | string, listener: Listener): this;
  removeAllListeners(eventName: EventFilter | string): this;
  removeListener(eventName: any, listener: Listener): this;

  interface: IUsersInterface;

  functions: {
    deleteUser(
      _id: BytesLike,
      overrides?: Overrides
    ): Promise<ContractTransaction>;

    "deleteUser(bytes32)"(
      _id: BytesLike,
      overrides?: Overrides
    ): Promise<ContractTransaction>;

    editUser(
      _id: BytesLike,
      _newName: string,
      _newPass: string,
      overrides?: Overrides
    ): Promise<ContractTransaction>;

    "editUser(bytes32,string,string)"(
      _id: BytesLike,
      _newName: string,
      _newPass: string,
      overrides?: Overrides
    ): Promise<ContractTransaction>;

    getAllUsers(
      overrides?: CallOverrides
    ): Promise<
      [
        ([string, string, string, string, BigNumber, BigNumber] & {
          id: string;
          owner: string;
          name: string;
          password: string;
          dateCreated: BigNumber;
          dateModified: BigNumber;
        })[]
      ]
    >;

    "getAllUsers()"(
      overrides?: CallOverrides
    ): Promise<
      [
        ([string, string, string, string, BigNumber, BigNumber] & {
          id: string;
          owner: string;
          name: string;
          password: string;
          dateCreated: BigNumber;
          dateModified: BigNumber;
        })[]
      ]
    >;

    getUser(
      _id: BytesLike,
      overrides?: CallOverrides
    ): Promise<
      [
        [string, string, string, string, BigNumber, BigNumber] & {
          id: string;
          owner: string;
          name: string;
          password: string;
          dateCreated: BigNumber;
          dateModified: BigNumber;
        }
      ]
    >;

    "getUser(bytes32)"(
      _id: BytesLike,
      overrides?: CallOverrides
    ): Promise<
      [
        [string, string, string, string, BigNumber, BigNumber] & {
          id: string;
          owner: string;
          name: string;
          password: string;
          dateCreated: BigNumber;
          dateModified: BigNumber;
        }
      ]
    >;

    getUsers(
      _ids: BytesLike[],
      overrides?: CallOverrides
    ): Promise<
      [
        ([string, string, string, string, BigNumber, BigNumber] & {
          id: string;
          owner: string;
          name: string;
          password: string;
          dateCreated: BigNumber;
          dateModified: BigNumber;
        })[]
      ]
    >;

    "getUsers(bytes32[])"(
      _ids: BytesLike[],
      overrides?: CallOverrides
    ): Promise<
      [
        ([string, string, string, string, BigNumber, BigNumber] & {
          id: string;
          owner: string;
          name: string;
          password: string;
          dateCreated: BigNumber;
          dateModified: BigNumber;
        })[]
      ]
    >;

    initManager(overrides?: Overrides): Promise<ContractTransaction>;

    "initManager()"(overrides?: Overrides): Promise<ContractTransaction>;

    newUser(
      _name: string,
      _password: string,
      _owner: string,
      overrides?: Overrides
    ): Promise<ContractTransaction>;

    "newUser(string,string,address)"(
      _name: string,
      _password: string,
      _owner: string,
      overrides?: Overrides
    ): Promise<ContractTransaction>;
  };

  deleteUser(
    _id: BytesLike,
    overrides?: Overrides
  ): Promise<ContractTransaction>;

  "deleteUser(bytes32)"(
    _id: BytesLike,
    overrides?: Overrides
  ): Promise<ContractTransaction>;

  editUser(
    _id: BytesLike,
    _newName: string,
    _newPass: string,
    overrides?: Overrides
  ): Promise<ContractTransaction>;

  "editUser(bytes32,string,string)"(
    _id: BytesLike,
    _newName: string,
    _newPass: string,
    overrides?: Overrides
  ): Promise<ContractTransaction>;

  getAllUsers(
    overrides?: CallOverrides
  ): Promise<
    ([string, string, string, string, BigNumber, BigNumber] & {
      id: string;
      owner: string;
      name: string;
      password: string;
      dateCreated: BigNumber;
      dateModified: BigNumber;
    })[]
  >;

  "getAllUsers()"(
    overrides?: CallOverrides
  ): Promise<
    ([string, string, string, string, BigNumber, BigNumber] & {
      id: string;
      owner: string;
      name: string;
      password: string;
      dateCreated: BigNumber;
      dateModified: BigNumber;
    })[]
  >;

  getUser(
    _id: BytesLike,
    overrides?: CallOverrides
  ): Promise<
    [string, string, string, string, BigNumber, BigNumber] & {
      id: string;
      owner: string;
      name: string;
      password: string;
      dateCreated: BigNumber;
      dateModified: BigNumber;
    }
  >;

  "getUser(bytes32)"(
    _id: BytesLike,
    overrides?: CallOverrides
  ): Promise<
    [string, string, string, string, BigNumber, BigNumber] & {
      id: string;
      owner: string;
      name: string;
      password: string;
      dateCreated: BigNumber;
      dateModified: BigNumber;
    }
  >;

  getUsers(
    _ids: BytesLike[],
    overrides?: CallOverrides
  ): Promise<
    ([string, string, string, string, BigNumber, BigNumber] & {
      id: string;
      owner: string;
      name: string;
      password: string;
      dateCreated: BigNumber;
      dateModified: BigNumber;
    })[]
  >;

  "getUsers(bytes32[])"(
    _ids: BytesLike[],
    overrides?: CallOverrides
  ): Promise<
    ([string, string, string, string, BigNumber, BigNumber] & {
      id: string;
      owner: string;
      name: string;
      password: string;
      dateCreated: BigNumber;
      dateModified: BigNumber;
    })[]
  >;

  initManager(overrides?: Overrides): Promise<ContractTransaction>;

  "initManager()"(overrides?: Overrides): Promise<ContractTransaction>;

  newUser(
    _name: string,
    _password: string,
    _owner: string,
    overrides?: Overrides
  ): Promise<ContractTransaction>;

  "newUser(string,string,address)"(
    _name: string,
    _password: string,
    _owner: string,
    overrides?: Overrides
  ): Promise<ContractTransaction>;

  callStatic: {
    deleteUser(_id: BytesLike, overrides?: CallOverrides): Promise<void>;

    "deleteUser(bytes32)"(
      _id: BytesLike,
      overrides?: CallOverrides
    ): Promise<void>;

    editUser(
      _id: BytesLike,
      _newName: string,
      _newPass: string,
      overrides?: CallOverrides
    ): Promise<void>;

    "editUser(bytes32,string,string)"(
      _id: BytesLike,
      _newName: string,
      _newPass: string,
      overrides?: CallOverrides
    ): Promise<void>;

    getAllUsers(
      overrides?: CallOverrides
    ): Promise<
      ([string, string, string, string, BigNumber, BigNumber] & {
        id: string;
        owner: string;
        name: string;
        password: string;
        dateCreated: BigNumber;
        dateModified: BigNumber;
      })[]
    >;

    "getAllUsers()"(
      overrides?: CallOverrides
    ): Promise<
      ([string, string, string, string, BigNumber, BigNumber] & {
        id: string;
        owner: string;
        name: string;
        password: string;
        dateCreated: BigNumber;
        dateModified: BigNumber;
      })[]
    >;

    getUser(
      _id: BytesLike,
      overrides?: CallOverrides
    ): Promise<
      [string, string, string, string, BigNumber, BigNumber] & {
        id: string;
        owner: string;
        name: string;
        password: string;
        dateCreated: BigNumber;
        dateModified: BigNumber;
      }
    >;

    "getUser(bytes32)"(
      _id: BytesLike,
      overrides?: CallOverrides
    ): Promise<
      [string, string, string, string, BigNumber, BigNumber] & {
        id: string;
        owner: string;
        name: string;
        password: string;
        dateCreated: BigNumber;
        dateModified: BigNumber;
      }
    >;

    getUsers(
      _ids: BytesLike[],
      overrides?: CallOverrides
    ): Promise<
      ([string, string, string, string, BigNumber, BigNumber] & {
        id: string;
        owner: string;
        name: string;
        password: string;
        dateCreated: BigNumber;
        dateModified: BigNumber;
      })[]
    >;

    "getUsers(bytes32[])"(
      _ids: BytesLike[],
      overrides?: CallOverrides
    ): Promise<
      ([string, string, string, string, BigNumber, BigNumber] & {
        id: string;
        owner: string;
        name: string;
        password: string;
        dateCreated: BigNumber;
        dateModified: BigNumber;
      })[]
    >;

    initManager(overrides?: CallOverrides): Promise<void>;

    "initManager()"(overrides?: CallOverrides): Promise<void>;

    newUser(
      _name: string,
      _password: string,
      _owner: string,
      overrides?: CallOverrides
    ): Promise<string>;

    "newUser(string,string,address)"(
      _name: string,
      _password: string,
      _owner: string,
      overrides?: CallOverrides
    ): Promise<string>;
  };

  filters: {};

  estimateGas: {
    deleteUser(_id: BytesLike, overrides?: Overrides): Promise<BigNumber>;

    "deleteUser(bytes32)"(
      _id: BytesLike,
      overrides?: Overrides
    ): Promise<BigNumber>;

    editUser(
      _id: BytesLike,
      _newName: string,
      _newPass: string,
      overrides?: Overrides
    ): Promise<BigNumber>;

    "editUser(bytes32,string,string)"(
      _id: BytesLike,
      _newName: string,
      _newPass: string,
      overrides?: Overrides
    ): Promise<BigNumber>;

    getAllUsers(overrides?: CallOverrides): Promise<BigNumber>;

    "getAllUsers()"(overrides?: CallOverrides): Promise<BigNumber>;

    getUser(_id: BytesLike, overrides?: CallOverrides): Promise<BigNumber>;

    "getUser(bytes32)"(
      _id: BytesLike,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    getUsers(_ids: BytesLike[], overrides?: CallOverrides): Promise<BigNumber>;

    "getUsers(bytes32[])"(
      _ids: BytesLike[],
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    initManager(overrides?: Overrides): Promise<BigNumber>;

    "initManager()"(overrides?: Overrides): Promise<BigNumber>;

    newUser(
      _name: string,
      _password: string,
      _owner: string,
      overrides?: Overrides
    ): Promise<BigNumber>;

    "newUser(string,string,address)"(
      _name: string,
      _password: string,
      _owner: string,
      overrides?: Overrides
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    deleteUser(
      _id: BytesLike,
      overrides?: Overrides
    ): Promise<PopulatedTransaction>;

    "deleteUser(bytes32)"(
      _id: BytesLike,
      overrides?: Overrides
    ): Promise<PopulatedTransaction>;

    editUser(
      _id: BytesLike,
      _newName: string,
      _newPass: string,
      overrides?: Overrides
    ): Promise<PopulatedTransaction>;

    "editUser(bytes32,string,string)"(
      _id: BytesLike,
      _newName: string,
      _newPass: string,
      overrides?: Overrides
    ): Promise<PopulatedTransaction>;

    getAllUsers(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    "getAllUsers()"(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    getUser(
      _id: BytesLike,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    "getUser(bytes32)"(
      _id: BytesLike,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    getUsers(
      _ids: BytesLike[],
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    "getUsers(bytes32[])"(
      _ids: BytesLike[],
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    initManager(overrides?: Overrides): Promise<PopulatedTransaction>;

    "initManager()"(overrides?: Overrides): Promise<PopulatedTransaction>;

    newUser(
      _name: string,
      _password: string,
      _owner: string,
      overrides?: Overrides
    ): Promise<PopulatedTransaction>;

    "newUser(string,string,address)"(
      _name: string,
      _password: string,
      _owner: string,
      overrides?: Overrides
    ): Promise<PopulatedTransaction>;
  };
}