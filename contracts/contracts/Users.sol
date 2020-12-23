// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.6.0 <0.8.0;

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
  User[] UsersA;
  // maps the id with array's index
  mapping(uint256 => uint256) usersI;
  // sets valid index for array
  mapping(uint256 => bool) usersV;

  function newUser(
    string memory _name,
    string memory _password
  ) public userInputReq(_name, _password) returns (uint256) {
    // create new user
    User memory user;
    user.id = usersA.length;
    user.name = _name;
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
    uint256 _newNumber,
    string memory _newDesc
  ) public {
    require(testsV[_id], "This test does not exist");

    Test memory test = testsA[testsI[_id]];
    test.number = _newNumber;
    test.description = _newDesc;

    testsA[testsI[_id]] = test;
  }

  function deleteTest(uint256 _id) public {
    require(testsV[_id], "This test does not exist");

    // overwrite last element of the array to this id
    Test memory lastTest = testsA[testsA.length - 1];
    testsA[testsI[_id]] = lastTest;
    // last element now is in the removed position of the array
    testsI[lastTest.id] = testsI[_id];
    // remove
    testsA.pop();
    testsI[_id] = 0; // irrelevant
    testsV[_id] = false; // important
  }

  function getTest(uint256 _id) public view returns (Test memory) {
    require(testsV[_id], "Test not stored yet or not found");
    return testsA[testsI[_id]];
  }

  function getTest(uint256 _topic, uint256 _test)
    public
    view
    returns (Test memory)
  {
    uint256 testId = testsByTopic[_topic][_test];
    require(testsV[testId], "Test not stored yet or not found");
    return testsA[testId];
  }

  function getTests(uint256[] memory _ids) public view returns (Test[] memory) {
    Test[] memory tests = new Test[](_ids.length);
    for (uint256 i = 0; i < _ids.length; i++) {
      tests[i] = getTest(_ids[i]);
    }

    return tests;
  }

  function getAllTests() public view returns (Test[] memory) {
    return testsA;
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
