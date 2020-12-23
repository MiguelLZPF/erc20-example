// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

struct User {
  uint256 id;
  string name;
  string password;
  uint256 dateCreated;
  uint256 dateModified;
}

interface IUsers {
  function newUser(string calldata _name, string calldata _password)
    external
    returns (uint256);

  function editUser(
    uint256 _id,
    string calldata _newName,
    string calldata _newPass
  ) external;

  function deleteUser(uint256 _id) external;

  function getUser(uint256 _id) external view returns (User memory);

  function getUsers(uint256[] memory _ids)
    external
    view
    returns (User[] memory);

  function getAllUsers() external view returns (User[] memory);
}
