// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

struct User {
  bytes32 id;
  address owner;
  string name;
  string password;
  uint256 dateCreated;
  uint256 dateModified;
}

interface IUsers {
  function initManager() external;

  function newUser(
    string calldata _name,
    string calldata _password,
    address _owner
  ) external returns (bytes32);

  function editUser(
    bytes32 _id,
    string calldata _newName,
    string calldata _newPass
  ) external;

  function deleteUser(bytes32 _id) external;

  function getUser(bytes32 _id) external view returns (User memory);

  function getUserByName(string memory _name) external view returns (User memory);

  function getUsers(bytes32[] memory _ids) external view returns (User[] memory);

  function getAllUsers() external view returns (User[] memory);
}
