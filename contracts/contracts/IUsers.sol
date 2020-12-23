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
}
