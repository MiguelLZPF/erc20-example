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
  // array for all access
  User[] usersA;
  // maps the id with array's index
  mapping(uint256 => uint256) usersI;
  // sets valid index for array
  mapping(uint256 => bool) usersV;

  /* function initialize() public initializer { } */
  // FUNCTIONS
  function newUser(string memory _name, string memory _password)
    public
    userInputReq(_name, _password)
    returns (uint256)
  {
    // create new user
    User memory user;
    user.id = usersA.length;
    user.name = _name;
    user.password = _password;
    user.dateCreated = block.timestamp;
    user.dateModified = block.timestamp;
    // store new user in array
    usersA.push(user);
    uint256 userId = usersA.length - 1;
    usersI[userId] = userId;
    usersV[userId] = true;

    return userId;
  }

  function editUser(
    uint256 _id,
    string memory _newName,
    string memory _newPass
  ) public userInputReq(_newName, _newPass) {
    require(usersV[_id], "This user does not exist");

    User memory user = usersA[usersI[_id]];
    user.name = _newName;
    user.password = _newPass;
    user.dateModified = block.timestamp;
    // update stored user
    usersA[usersI[_id]] = user;
  }

  function deleteUser(uint256 _id) public {
    require(usersV[_id], "This user does not exist");

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

  function getUser(uint256 _id) public view returns (User memory) {
    require(usersV[_id], "User not stored yet or not found");
    return usersA[usersI[_id]];
  }

  function getUsers(uint256[] memory _ids) public view returns (User[] memory) {
    User[] memory users = new User[](_ids.length);
    for (uint256 i = 0; i < _ids.length; i++) {
      users[i] = getUser(_ids[i]);
    }

    return users;
  }

  function getAllUsers() public view returns (User[] memory) {
    return usersA;
  }

  // MODIFIERS
  modifier userInputReq(string memory _username, string memory _password) {
    // Username
    require(
      bytes(_username).length < 20,
      "Username length must be less than 20 characters"
    );
    // Password
    require(
      bytes(_password).length > 15,
      "Password length must be more than 15 characters (encrypt)"
    );
    _;
  }
}
