// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {
  OwnableUpgradeable as Ownable
} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./IUsers.sol";

/**
 * @title iobuilders exercise
 */
contract IobManager is Ownable {
  // EVENTS
  event UserCreated(
    bytes32 indexed id,
    string indexed name,
    string password
    // uint256 indexed date // Not needed -- use Block.timestamp
  );
  event UserEdited(
    bytes32 indexed id,
    string indexed newName,
    string newPassword
  );
  event UserDeleted(bytes32 indexed id);

  IUsers users;
  // maps the owner's account with the user's id
  mapping(address => bytes32) public ownerToUser;

  // FUNCTIONS
  function initialize(address _users) external initializer {
    // initializate the owner as the msg.sender through ownable contract
    __Ownable_init();
    users = IUsers(_users);
    users.initManager(address(this));
  }

  function newUser(string memory _name, string memory _password) external {
    address sender = _msgSender();
    require(ownerToUser[sender] == bytes32(0), "Cannot have more than one user with one account");
    bytes32 userId = users.newUser(_name, _password, sender);
    ownerToUser[sender] = userId;
    emit UserCreated(userId, _name, _password);
  }

  function editUser(
    bytes32 _id,
    string memory _newName,
    string memory _newPass
  ) public {
    require(_id == ownerToUser[_msgSender()], "This user is not yours");
    users.editUser(_id, _newName, _newPass);
    emit UserEdited(_id, _newName, _newPass);
  }

  function deleteUser(bytes32 _id) public {
    address sender = _msgSender();
    require(ownerToUser[sender] == _id, "This user is not yours");
    users.deleteUser(_id);
    ownerToUser[sender] = bytes32(0);
    emit UserDeleted(_id);
  }

  function getUser(bytes32 _id) external view onlyOwner returns (User memory) {
    return users.getUser(_id);
  }

  function getMyUser() external view returns (User memory) {
    return users.getUser(ownerToUser[_msgSender()]);
  }
  function getUserByOwner(address _owner) external view onlyOwner returns (User memory) {
    return users.getUser(ownerToUser[_owner]);
  }

  function getAllUsers() public view onlyOwner returns (User[] memory) {
    return users.getAllUsers();
  }
}
