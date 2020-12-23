// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

/**
 * ERC20 Compliant token
 */
contract MyToken is ERC20Upgradeable {
  event TokenInitialized(address indexed tokenAddr, address indexed byAccount);

  // 6 for good performance.// Not used in new version of OpenZeppelin: = 18; fixed
  //uint8 constant TOKEN_DECIMALS = 6;
  uint256 constant TOKEN_INIT_AMOUNT = 10000000000000;
  string constant TOKEN_NAME = "My Token";
  string constant TOKEN_SYMBOL = "iob";

  function initialize() public initializer {
    require(TOKEN_INIT_AMOUNT > 0, "amount has o be greater than 0");
    __ERC20_init(TOKEN_NAME, TOKEN_SYMBOL);
    //uint256 totalSupply = _amount.mul(10**uint256(_decimals));
    uint256 totalSupply = TOKEN_INIT_AMOUNT * (10**uint256(18));
    _mint(_msgSender(), totalSupply);
    emit Transfer(address(0), _msgSender(), totalSupply);
    emit TokenInitialized(address(this), _msgSender());
  }
}
