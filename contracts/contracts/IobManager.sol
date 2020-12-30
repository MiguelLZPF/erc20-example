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
    uint256 indexed id,
    string indexed name,
    string password
    // uint256 indexed date // Not needed -- use Block.timestamp
  );
  event UserEdited(
    uint256 indexed id,
    string indexed newName,
    string newPassword
  );
  event UserDeleted(uint256 indexed id);

  IUsers users;
  // maps the owner's account with the user's id
  mapping(address => uint256) internal ownerToUser;

  // FUNCTIONS

  function initialize(address _users) external initializer {
    // initializate the owner as the msg.sender through ownable contract
    __Ownable_init();
    users = IUsers(_users);
    users.initManager(address(this));
  }

  function newUser(string memory _name, string memory _password) external {
    uint256 userId = users.newUser(_name, _password, _msgSender());

    emit UserCreated(userId, _name, _password);
  }

  function editUser(
    uint256 _id,
    string memory _newName,
    string memory _newPass
  ) public {
    users.editUser(_id, _newName, _newPass, _msgSender());
    emit UserEdited(_id, _newName, _newPass);
  }

  function deleteUser(uint256 _id) public {
    users.deleteUser(_id);
    emit UserDeleted(_id);
  }

  function getUser(uint256 _id) external view onlyOwner returns (User memory) {
    return users.getUser(_id);
  }

  function getMyUser() external view returns (User memory) {
    return users.getUserByOwner(_msgSender());
  }
  function getUserByOwner(address _owner) external view onlyOwner returns (User memory) {
    return users.getUserByOwner(_owner);
  }

  function getAllUsers() public view onlyOwner returns (User[] memory) {
    return users.getAllUsers();
  }
}
