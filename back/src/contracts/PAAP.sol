// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.6.0 <0.8.0;

import { OwnableUpgradeSafe as Ownable } from "./lib/Ownable.sol";
import { IUserInPAAP as IUser, ILoanInPAAP as ILoan } from "./Interfaces.sol";

/**
 * @title PAAP
 * @author Miguel Gómez Carpena, Izertis Blockchain
 * @dev Main contract. Generic functionality must be declared here.
 *      Manages one list of Users and one list of Loans.
 *      It also handles a list of valid admins
 */
contract PAAP is Ownable {
  // PAAP main smart contract initialized
  event PAAPInitialized(
    address indexed paapAddr,
    address indexed admin,
    address indexed tokenAddr
  );
  // New User successfully registered
  event UserRegistered(address indexed userAcc, address indexed userAddr);
  event UserRemoved(address indexed userAcc, address indexed userAddr);
  // New Loan successfully registered
  event LoanRegistered(
    address indexed loanAddr,
    address indexed userAcc,
    address indexed userAddr
  );
  // New Loan successfully removed
  event LoanRemoved(
    address indexed loanAddr,
    address indexed userAcc,
    address indexed userAddr
  );
  // Admin added event
  event AdminAdded(address indexed newAdmin, address indexed addedBy);
  // Admin removed event
  event AdminRemoved(address indexed removedAdmin, address indexed removedBy);

  // token representing real money
  address tokenAddr;
  // mapping of booleans to know wich address are admins
  mapping(address => bool) validAdmins;
  // number of admins in the system
  uint8 adminLen;
  // relation between the owner's account address and the created User address
  mapping(address => address) ownerToUser;
  // relation between the owner's account address and the created User address
  mapping(address => address) userToOwner;
  // relation between the username and the address of the User contract
  mapping(string => address) nameToUser;
  // array of addresses for getting all the User address
  address[] users;
  // starts in 1, 2, 3, 4.... 0 reserved to removed users
  mapping(address => uint256) indexUsers;
  // mapping of booleans to know wich user SC's addresses are valid
  mapping(address => bool) validUsers;
  // mapping of booleans to know wich Loan SC's addresses are valid
  mapping(address => bool) validLoans;
  /* // relation between the owner's account address and the created Loan address
  mapping(address => address) public loanToOwner; */
  // array of addresses for getting all the Loan address
  address[] loans;
  // starts in 1, 2, 3, 4.... 0 reserved to removed users
  mapping(address => uint256) indexLoans;

  /** CONSTRUCTOR
   * @param _tokenAddr The address of the PAAP Token
   * @dev Initialize the PAAP main contract. Sets the sender as Admin and Owner,
   *         and saves the Token address
   * @dev this uses OZ upgradeable SCs
   */
  function initialize(address _tokenAddr) public initializer {
    //console.log("Initialize PAAP with token address: ", _tokenAddr);
    __Ownable_init();
    // The owner is the first admin
    validAdmins[_msgSender()] = true;
    adminLen++;
    //console.log("Registered msg.sender %s as admin", _msgSender());
    tokenAddr = _tokenAddr;
    emit PAAPInitialized(address(this), _msgSender(), tokenAddr);
  }

  /** Get Token Address
   * @dev gets the token contract address
   * @return _tokenAddr the address of the token SC
   */
  function getToken() public view returns (address _tokenAddr) {
    return tokenAddr;
  }

  /** Get User By Name
   * @param _name the username to search for
   * @dev gets a user by its stored username
   * @notice only if the caller is admin or the owner
   *         of the user contract
   * @return _owner the address of the owner
   * @return _userAddress the address of the User's SC
   * @return _username the username
   * @return _password the password (hash encrypted)
   * @return _rol the rol of the user
   * @return _creationDate the cration date as unix epoch time
   */
  function getUserByName(string memory _name)
    public
    view
    onlyOwnerOrAdmin(nameToUser[_name])
    returns (
      address _owner,
      address _userAddress,
      string memory _username,
      string memory _password,
      string memory _rol,
      uint256 _creationDate,
      uint256 _tokenBalance
    )
  {
    address _userAddr = nameToUser[_name];

    return IUser(_userAddr).get();
  }

  function getMyUser()
    public
    view
    returns (
      address _owner,
      address _userAddress,
      string memory _username,
      string memory _password,
      string memory _rol,
      uint256 _creationDate,
      uint256 _tokenBalance
    )
  {
    address _userAddr = ownerToUser[_msgSender()];

    return IUser(_userAddr).get();
  }

  function getUserFromOwner(address _userOwner)
    public
    view
    returns (
      address _owner,
      address _userAddress,
      string memory _username,
      string memory _password,
      string memory _rol,
      uint256 _creationDate,
      uint256 _tokenBalance
    )
  {
    address _userAddr = ownerToUser[_userOwner];

    return IUser(_userAddr).get();
  }

  function getAddrFromOwner(address _owner)
    public
    view
    returns (address _userAddr)
  {
    return ownerToUser[_owner];
  }

  /** Get My Address
   * @notice This gives your User SC's address if you are in the system
   * @dev if returns 0x0 address, then user account is not registered
   * @return _userAddress the User SC's address associated to the from account
   */
  function getMyAddress() public view returns (address _userAddress) {
    return ownerToUser[_msgSender()];
  }

  /** Register a new User
   * @notice Registers a new user in the PAAP system
   * @dev A User SC must be deployed before
   * @dev This function is meant to be called from the initialize function of
   *      a User's SC only
   * @dev it emits a UserRegistered event when all it's done
   * @dev msgSender() == User SC's address
   * @param _userAcc address of the owner of the new User SC
   */
  function registerUser(address _userAcc, string calldata _username)
    external
    onlyAdmin
    returns (address _tokenAddr)
  {
    address _userAddr = _msgSender();
    // Only one User per Account is allowed
    require(!validUsers[_userAddr], "This account already has a User");

    // store User
    ownerToUser[_userAcc] = _userAddr;
    userToOwner[_userAddr] = _userAcc;
    nameToUser[_username] = _userAddr;
    users.push(_userAddr);
    indexUsers[_userAddr] = users.length; // length -1 +1 = length
    validUsers[_userAddr] = true;

    emit UserRegistered(_userAcc, _userAddr);
    return (tokenAddr);
  }

  function removeUser(string calldata _username) external onlyAdmin {
    address _userAddr = _msgSender();
    address _userAcc = userToOwner[_userAddr];
    // Check if it is registered and valid
    // @notice that onlyAdmin has been checked in User.removed()
    require(validUsers[_userAddr], "This user is not registered yet");

    // remove from users array
    address _lastUserAddr = users[users.length - 1];
    // -- last user overwrites user to rm
    users[indexUsers[_userAddr] - 1] = _lastUserAddr;
    // -- update the last user new index = index of the user to rm
    indexUsers[_lastUserAddr] = indexUsers[_userAddr];
    // -- removed user index to 0
    indexUsers[_userAddr] = 0;
    // -- remove last user, who is duplicated in the _userAddr position
    users.pop();
    // -- end

    // remove from mappings User
    ownerToUser[_userAcc] = address(0);
    userToOwner[_userAddr] = address(0);
    nameToUser[_username] = address(0);
    validUsers[_userAddr] = false;

    emit UserRemoved(_userAcc, _userAddr);
  }

  /**
   * @return an array of all user addresses
   */
  function getUsers() public view onlyAdmin returns (address[] memory) {
    return users;
  }

  /**
   * return the User's list length
   */
  function getUsersLength() public view onlyAdmin returns (uint256) {
    return users.length;
  }

  function getUsersByRol(string memory _rol)
    public
    view
    returns (address[] memory _loans)
  {
    require(validRol(_rol), "User's Rol must be 'borrower' or 'investor'");
    bytes32 _rolHash = hash(_rol);
    address[] memory _usersFiltered = new address[](users.length);
    // loansFiltered index
    uint256 j = 0;
    for (uint256 i = 0; i < users.length; i++) {
      string memory _userRol = IUser(users[i]).getRol();
      if (hash(_userRol) == _rolHash) {
        _usersFiltered[j] = (users[i]);
        j++;
      }
    }
    return _usersFiltered;
  }

  /** Register a new Loan
   * @notice Registers a new loan in the PAAP system
   * @dev A Loan SC must be deployed before
   * @dev This function is meant to be called from the initialize function of
   *      a Loan's SC only
   * @dev it emits a LoanRegistered event when all it's done
   * @param _newLoan address of the new Loan SC
   * @dev msgSender() == User SC's address of the owner
   */
  function registerLoan(address _newLoan) external onlyValidUser {
    address _userAddr = _msgSender();

    loans.push(_newLoan);
    indexLoans[_newLoan] = loans.length; // -1 +1
    validLoans[_newLoan] = true;
    emit LoanRegistered(_newLoan, userToOwner[_userAddr], _userAddr);
  }

  function removeLoan(address _loan) external onlyValidUser {
    address _userAddr = _msgSender();
    address _userAcc = userToOwner[_userAddr];
    require(validLoans[_loan], "This loan is not registered yet");
    require(
      validUsers[_userAddr],
      "Forbidden: This function can only be called from valid SC User's address"
    );

    // remove from loans array
    address _lastLoanAddr = loans[loans.length - 1];
    // -- last loan overwrites loan to rm
    loans[indexLoans[_loan] - 1] = _lastLoanAddr;
    // -- update the last loan new index = index of the loan to rm
    indexLoans[_lastLoanAddr] = indexLoans[_loan];
    // -- removed loan index to 0
    indexLoans[_loan] = 0;
    // -- remove last loan, who is duplicated in the _loan position
    loans.pop();
    // -- end

    // remove from mappings Loan
    validLoans[_loan] = false;

    emit LoanRemoved(_loan, _userAcc, _userAddr);
  }

  function addAdmin(address _newAdmin) public onlyAdmin {
    validAdmins[_newAdmin] = true;
    adminLen++;
    emit AdminAdded(_newAdmin, _msgSender());
  }

  function removeAdmin(address _admin) public onlyAdmin {
    require(adminLen >= 1, "Can't remove because is the only admin");
    validAdmins[_admin] = false;
    adminLen--;
    emit AdminRemoved(_admin, _msgSender());
  }

  /**
   * @return an array of all loan addresses
   */
  function getLoans() public view returns (address[] memory) {
    return loans;
  }

  function getLoansByState(string memory _state)
    public
    view
    returns (address[] memory _loans)
  {
    bytes32 _stateHash = hash(_state);
    address[] memory _loansFiltered = new address[](loans.length);
    // loansFiltered index
    uint256 j = 0;
    for (uint256 i = 0; i < loans.length; i++) {
      string memory _loanState = ILoan(loans[i]).state();
      if (hash(_loanState) == _stateHash) {
        _loansFiltered[j] = (loans[i]);
        j++;
      }
    }
    return _loansFiltered;
  }

  function getLoansByRisk(uint8 _risk)
    public
    view
    returns (address[] memory _loans)
  {
    address[] memory _loansFiltered = new address[](loans.length);
    // loansFiltered index
    uint256 j = 0;
    for (uint256 i = 0; i < loans.length; i++) {
      uint8 _loanRisk = ILoan(loans[i]).risk();
      if (_loanRisk == _risk) {
        _loansFiltered[j] = (loans[i]);
        j++;
      }
    }
    return _loansFiltered;
  }

  function getLoansByQuantity(uint256 _min, uint256 _max)
    public
    view
    returns (address[] memory _loans)
  {
    if (_max == 0) {
      _max = 10000000000000000000000000;
    }
    address[] memory _loansFiltered = new address[](loans.length);
    // loansFiltered index
    uint256 j = 0;
    for (uint256 i = 0; i < loans.length; i++) {
      uint256 _loanQuantity = ILoan(loans[i]).quantity();
      if (_loanQuantity >= _min && _loanQuantity <= _max) {
        _loansFiltered[j] = loans[i];
        j++;
      }
    }
    return _loansFiltered;
  }

  function getLoansByDate(uint256 _min, uint256 _max)
    public
    view
    returns (address[] memory _loans)
  {
    if (_max == 0) {
      _max = 99999999999; // year 5000
    }
    address[] memory _loansFiltered = new address[](loans.length);
    // loansFiltered index
    uint256 j = 0;
    for (uint256 i = 0; i < loans.length; i++) {
      uint256 _loanCreated = ILoan(loans[i]).creationDate();
      if (_loanCreated >= _min && _loanCreated <= _max) {
        _loansFiltered[j] = (loans[i]);
        j++;
      }
    }
    return _loansFiltered;
  }

  /**
   * @return the Loan's list length
   */
  function getLoansLength() public view returns (uint256) {
    return loans.length;
  }

  function isAdmin(address _account) public view returns (bool _valid) {
    return validAdmins[_account];
  }

  function validUser(address _userAddr) public view returns (bool _valid) {
    return validUsers[_userAddr];
  }

  function validLoan(address _loanAddr) public view returns (bool _valid) {
    return validLoans[_loanAddr];
  }

  // HELPERS
  function hash(string memory _param) public pure returns (bytes32) {
    return keccak256(abi.encodePacked(_param));
  }

  function validRol(string memory _rol) public pure returns (bool _valid) {
    if (hash(_rol) == hash("borrower") || hash(_rol) == hash("investor")) {
      return true;
    } else {
      return false;
    }
  }

  // MODIFIERS
  modifier onlyAdmin() {
    address _sender = _msgSender();

    if (isAdmin(_sender)) {
      // direct call from admin
      _;
    } else if (validUsers[_sender]) {
      // redirected call from admin
      _;
    } else if (_sender != tx.origin) {
      address _senderOwner = Ownable(_sender).owner();
      if (isAdmin(_senderOwner)) {
        // User init case
        // redirected call from admin
        _;
      }
    } else {
      revert(
        "You are not allowed to call this method. Only Admins are allowed"
      );
    }
  }

  // call from _sender to _to (User SC)
  modifier onlyOwnerOrAdmin(address _to) {
    address _sender = _msgSender();
    // this owner
    address _toOwner = Ownable(_to).owner();
    // who is the contract's owner
    //address _senderOwner = Ownable(_sender).owner();

    if (isAdmin(_sender)) {
      // direct valid call from an admin
      _;
    } else if (_sender == _toOwner) {
      // direct valid call from the owner of the contract to call
      _;
    } else {
      revert(
        "You are not allowed to call this method. Only owners or admins are allowed"
      );
    }
  }
  modifier onlyValidUser() {
    require(
      validUsers[_msgSender()],
      "Forbbiden: This function can only be called from valid SC User's address"
    );
    _;
  }
}
