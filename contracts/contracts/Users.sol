// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {
  OwnableUpgradeable as Ownable
} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { Strings as S } from "./Strings.sol";
import "./IUsers.sol";

/**
 * @title User Contract
 * @author Miguel Gómez Carpena
 */
contract Users is Ownable {
  // PROPERTIES
  // IobManager's account
  address internal iobManager;

  // flag to mark the initialization state of the contract
  bool internal initComplete;

  // array for all access
  User[] internal usersA;
  // maps the id with array's index
  mapping(bytes32 => uint256) internal usersI;
  // sets valid index for array
  mapping(bytes32 => bool) internal usersV;

  // maps the user's name with the user's id;
  mapping(string => bytes32) internal nameToUser;

  // FUNCTIONS
  /**
    0. Initialize function that acts like a constructor
  */
  function initialize() external initializer {
    // initializate the owner as the msg.sender through ownable contract
    __Ownable_init();
  }

  function initManager() external onlyOnce {
    iobManager = _msgSender();
    initComplete = true;
  }

  function newUser(
    string memory _name,
    string memory _password,
    address _owner
  ) public userInputReq(_name, _password) onlyManager returns (bytes32) {
    require(nameToUser[_name] == bytes32(0), "User name already in use");
    uint256 blockTime = block.timestamp;
    // identifier generated from _name, timestamp and tx.origin
    bytes32 id = S.hash(string(abi.encodePacked(_name, blockTime, tx.origin)));
    require(!usersV[id], "User ID already in use");
    // create new user
    User memory user;
    user.id = id;
    user.owner = _owner;
    user.name = _name;
    user.password = _password;
    user.dateCreated = blockTime;
    user.dateModified = blockTime;
    // store new user in array
    usersA.push(user);
    usersI[id] = usersA.length - 1;
    usersV[id] = true;
    nameToUser[_name] = id;

    return id;
  }

  function editUser(
    bytes32 _id,
    string memory _newName,
    string memory _newPass
  ) public userInputReq(_newName, _newPass) onlyManager {
    require(usersV[_id], "This user does not exist");

    // get actual user
    User memory user = usersA[usersI[_id]];
    // remove old name mapping
    nameToUser[user.name] = bytes32(0);
    // update user
    user.name = _newName;
    user.password = _newPass;
    user.dateModified = block.timestamp;
    // update stored user
    usersA[usersI[_id]] = user;
    // create new name mapping
    nameToUser[_newName] = _id;
  }

  function deleteUser(bytes32 _id) public onlyManager {
    require(usersV[_id], "This user does not exist");

    // remove name mapping
    nameToUser[usersA[usersI[_id]].name] = bytes32(0);

    // overwrite last element of the array to this id
    User memory lastUser = usersA[usersA.length - 1];
    usersA[usersI[_id]] = lastUser;
    // last element now is in the removed position of the array
    usersI[lastUser.id] = usersI[_id];
    // remove
    usersA.pop();
    usersI[_id] = 0; // irrelevant
    usersV[_id] = false; // important
  }

  function getUser(bytes32 _id) public view onlyManager returns (User memory) {
    require(usersV[_id], "User not stored yet or not found");
    return usersA[usersI[_id]];
  }

  function getUserByName(string memory _name) public view onlyManager returns (User memory) {
    return getUser(nameToUser[_name]);
  }

  function getUsers(bytes32[] memory _ids) public view onlyManager returns (User[] memory) {
    User[] memory users = new User[](_ids.length);
    for (uint256 i = 0; i < _ids.length; i++) {
      users[i] = getUser(_ids[i]);
    }
    return users;
  }

  function getAllUsers() public view onlyManager returns (User[] memory) {
    return usersA;
  }

  // MODIFIERS
  modifier onlyManager() {
    require(msg.sender == iobManager, "can only be called from manager");
    _;
  }
  modifier onlyOnce() {
    require(!initComplete, "Initialization already completed");
    _;
  }
  modifier userInputReq(string memory _username, string memory _password) {
    // Username
    require(bytes(_username).length < 20, "Username length must be less than 20 characters");
    // Password
    require(
      bytes(_password).length > 15,
      "Password length must be more than 15 characters (encrypt)"
    );
    _;
  }
}
