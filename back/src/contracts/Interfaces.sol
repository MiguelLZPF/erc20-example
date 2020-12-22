// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.6.0 <0.8.0;

interface IUserInPAAP {
  function owner() external view returns (address _owner);

  function get()
    external
    view
    returns (
      address _owner,
      address _userAddress,
      string memory _username,
      string memory _password,
      string memory _rol,
      uint256 _creationDate,
      uint256 _tokenBalance
    );

  function getRol() external view returns (string memory _rol);
}

interface ILoanInPAAP {
  function state() external view returns (string memory _state);

  function risk() external view returns (uint8 _risk);

  function quantity() external view returns (uint256 _quantity);

  function creationDate() external view returns (uint256 _created);
}

interface ITokenInUser {
  function balanceOf(address _account) external view returns (uint256 _balance);
}

interface IPAAPinUser {
  function registerUser(address userAcc, string calldata username)
    external
    returns (address _tokenAddr);

  function registerLoan(address loanAddr) external;

  function removeUser(string calldata username) external;

  function removeLoan() external;

  function isAdmin(address adminAddr) external view returns (bool _valid);

  function validLoan(address loanAddr) external view returns (bool _valid);

  function validRol(string calldata _rol) external pure returns (bool _valid);
}

interface ILoanInUser {
  function state() external view returns (string memory _state);

  function risk() external view returns (uint8 _risk);

  function quantity() external view returns (uint256 _quantity);

  function creationDate() external view returns (uint256 _created);
}

interface IPAAPinLoan {
  function getAddrFromOwner(address _owner)
    external
    view
    returns (address _userAddr);

  function isAdmin(address _admin) external view returns (bool _isAdmin);
}

interface IUserInLoan {
  function getRol() external view returns (string memory _rol);

  function registerLoan()
    external
    returns (address _paapAddr, address _tokenAddr);

  function recordInvestment(uint256 _amount, uint8 _interest) external;
}

interface ITokenInLoan {
  function decimals() external view returns (uint8 _decimals);

  function balanceOf(address _account) external view returns (uint256 _balance);

  function transfer(address _to, uint256 _amount) external;

  function transferFrom(
    address _from,
    address _to,
    uint256 _amount
  ) external;
}
