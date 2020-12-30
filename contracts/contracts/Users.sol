// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {
  OwnableUpgradeable as Ownable
} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./IUsers.sol";

/**
 * @title User Contract
 * @author Miguel Gómez Carpena
 */
contract Users is Ownable {
  // PROPERTIES
  // IobManager's account
  address iobManager;
  // array for all access
  User[] usersA;
  // maps the id with array's index
  mapping(uint256 => uint256) usersI;
  // sets valid index for array
  mapping(uint256 => bool) usersV;
  // flag to mark the initialization state of the contract
  bool internal initComplete;

  // FUNCTIONS
  /**
    0. Initialize function that acts like a constructor
  */
  function initialize() external initializer {
    // initializate the owner as the msg.sender through ownable contract
    __Ownable_init();
  }

  function initManager(address _iobManager) external onlyOnce {
    iobManager = _iobManager;
    initComplete = true;
  }

  function newUser(
    string memory _name,
    string memory _password,
    address _owner
  ) public userInputReq(_name, _password) onlyManager returns (uint256) {
    // create new user
    User memory user;
    user.id = usersA.length;
    user.owner = _owner;
    user.name = _name;
    user.password = _password;
    user.dateCreated = block.timestamp;
    user.dateModified = block.timestamp;
    // store new user in array
    usersA.push(user);
    uint256 userId = usersA.length - 1;
    usersI[userId] = userId;
    usersV[userId] = true;
    ownerToUsers[_owner] = userId;

    return userId;
  }

  function editUser(
    uint256 _id,
    string memory _newName,
    string memory _newPass
  ) public userInputReq(_newName, _newPass) onlyManager {
    require(usersV[_id], "This user does not exist");

    User memory user = usersA[usersI[_id]];
    user.name = _newName;
    user.password = _newPass;
    user.dateModified = block.timestamp;
    // update stored user
    usersA[usersI[_id]] = user;
  }

  function deleteUser(uint256 _id) public onlyManager {
    require(usersV[_id], "This user does not exist");
    address owner = usersA[usersI[_id]].owner;

    // overwrite last element of the array to this id
    User memory lastUser = usersA[usersA.length - 1];
    usersA[usersI[_id]] = lastUser;
    // last element now is in the removed position of the array
    usersI[lastUser.id] = usersI[_id];
    // remove
    usersA.pop();
    usersI[_id] = 0; // irrelevant
    usersV[_id] = false; // important
    ownerToUsers[owner] = 0;
  }

  function getUser(uint256 _id) public view onlyManager returns (User memory) {
    require(usersV[_id], "User not stored yet or not found");
    return usersA[usersI[_id]];
  }

  function getUserByOwner(address _owner) public view onlyManager returns (User memory) {
    uint256 id = ownerToUsers[_owner];
    require(usersV[id], "User not stored yet or not found");
    return usersA[usersI[id]];
  }

  function getUsers(uint256[] memory _ids) public view onlyManager returns (User[] memory) {
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
