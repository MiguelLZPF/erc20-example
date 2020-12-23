// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import "./IUsers.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
/**
 * @title iobuilders exercise
 */
contract SecureTests {
  // EVENTS
  // User is successfully created
  event UserInitialized(
    address indexed account,
    uint256 indexed id,
    string name,
    uint256 indexed date
  );
}