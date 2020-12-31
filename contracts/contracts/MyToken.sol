// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {
  OwnableUpgradeable as Ownable
} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./IobManager.sol";

/**
 * ERC20 Compliant token
 */
contract MyToken is ERC20Upgradeable, Ownable {
  event TokenInitialized(address indexed tokenAddr, address indexed byAccount);

  uint256 constant TOKEN_INIT_AMOUNT = 10000000000000;
  string constant TOKEN_NAME = "My Token";
  string constant TOKEN_SYMBOL = "iob";

  function initialize(address _richOne) external initializer {
    require(TOKEN_INIT_AMOUNT > 0, "amount has o be greater than 0");
    // initializate the owner as the msg.sender through ownable contract
    __Ownable_init();
    __ERC20_init(TOKEN_NAME, TOKEN_SYMBOL);
    //uint256 totalSupply = _amount.mul(10**uint256(_decimals));
    uint256 totalSupply = TOKEN_INIT_AMOUNT * (10**uint256(18));
    // transfer all tokens to the rich one account
    _mint(_richOne, totalSupply);
    // Initialize the IobManager with the Token address
    IobManager(_richOne).initToken();
    emit Transfer(address(0), _msgSender(), totalSupply);
    emit TokenInitialized(address(this), _msgSender());
  }
}
