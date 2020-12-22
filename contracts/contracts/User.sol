// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.6.0 <0.8.0;

import { OwnableUpgradeSafe as Ownable } from "./libs/access/OwnableUS.sol";

/**
 * @title User Contract
 * @author Miguel Gómez Carpena
 */
contract User is Ownable {
  // User is successfully created
  event UserInitialized(
    address indexed userAcc,
    address indexed userAddr,
    string indexed username,
    string rol
  );

  // the address of the PAAP's owner
  //address private admin;
  // the address of the PAAP's contract
  address paapAddr;
  // token representing real money
  address tokenAddr;
  // the username
  string username;
  // user's password, should be hashed/encripted
  string password;
  // user's creation date (Unix format)
  uint256 creationDate;

  /**
   * @dev This constructor should be only invoked through PAAP contract's signup() function
   * @param _username internal name for this user
   * @param _password encrypted hashed password to login with this username
   * @param _rol rol for this user (0 = borrwer, 1 = investor)
   */
  function initialize(
    address _paapAddr,
    address _userAcc,
    string memory _username,
    string memory _password,
    string memory _rol
  )
    public
    initializer
    userInputReq(_paapAddr, _userAcc, _username, _password, _rol)
  {
    // Init the owner to the sender, should be Admin
    __Ownable_init();

    // Initialice
    paapAddr = _paapAddr;
    username = _username;
    password = _password;
    rol = _rol;
    creationDate = block.timestamp;
    // register to Paap contract
    tokenAddr = IPAAP(_paapAddr).registerUser(_userAcc, _username);
    // Once It's registered successfully,
    // change Ownership to true owner, the User's account
    transferOwnership(_userAcc);
    emit UserInitialized(_userAcc, address(this), _username, _rol);
  }

  /** Get User
   * @dev get the public info from this user
   * @return _owner the address of the owner
   * @return _userAddress the address of the User's SC
   * @return _username the username
   * @return _password the password (hash encrypted)
   * @return _rol the rol of the user
   * @return _creationDate the cration date as unix epoch time
   */
  function get()
    public
    view
    onlyOwnerOrAdmin
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
    uint256 balance = IToken(tokenAddr).balanceOf(owner());
    return (
      owner(),
      address(this),
      username,
      password,
      rol,
      creationDate,
      balance
    );
  }

  function remove(string memory _message) external onlyAdmin {
    require(
      hash(_message) == hash("I KNOW WHAT I AM DOING"),
      "DANGER: You have to know what are you doing... really"
    );
    IPAAP(paapAddr).removeUser(username);
    selfdestruct(_msgSender());
  }

  /// @return _username the username of this User
  function getUsername() public view onlyOwnerOrAdmin returns (string memory _username) {
    return username;
  }

  /// change this User's username
  /// @param _username new username
  function setUsername(string memory _username) public onlyOwner {
    username = _username;
  }

  /// @return _password the password hash of this User
  function getPassword() public view onlyOwnerOrAdmin returns (string memory _password) {
    return password;
  }

  /// change this User's password for future change password functionality
  /// @param _password new password
  function setPassword(string memory _password) public onlyOwner {
    password = _password;
  }

  function getRol() public view returns (string memory _rol) {
    return rol;
  }

  function setRol(string memory _rol) public onlyAdmin {
    require(
      IPAAP(paapAddr).validRol(_rol),
      "User's Rol must be 'borrower' or 'investor'"
    );
    rol = _rol;
  }

  // INTERNAL
  // PRIVATE

  function getLoans() public view ifBorrower returns (address[] memory _loans) {
    return loans;
  }

  function getLoansByState(string memory _state)
    public
    view
    ifBorrower
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
    ifBorrower
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
    ifBorrower
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
        _loansFiltered[j] = (loans[i]);
        j++;
      }
    }
    return _loansFiltered;
  }

  function getLoansByDate(uint256 _min, uint256 _max)
    public
    view
    ifBorrower
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

  /** Register a new Loan
   * @dev registers a loan when it is initialiced
   * @notice it can be called from an owned contract only and it should only
   *         be called from the initialice function of a loan's contract
   * @notice msg.sender == loan contrac's address
   * @return _paapAddr the Main PAAP contract's address
   * @return _tokenAddr the Token contract's address
   */
  function registerLoan()
    external
    onlyOwned
    ifBorrower
    returns (address _paapAddr, address _tokenAddr)
  {
    // sender of this call is loan, origin should be owner
    address _loanAddr = _msgSender();

    // store Loan in User contract
    loans.push(_loanAddr);
    indexLoans[_loanAddr] = loans.length; // -1 +1
    // Register Loan in PAAP contract
    IPAAP(paapAddr).registerLoan(_loanAddr);

    emit LoanRegistered(_loanAddr, owner(), address(this));
    return (paapAddr, tokenAddr);
  }

  function removeLoan() external onlyOwned ifBorrower {
    address _loan = _msgSender();

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
    // Remove loan register from PAAP contract
    IPAAP(paapAddr).removeLoan();

    emit LoanRemoved(_loan, owner(), address(this));
  }

  /** Creates a new Investment Struct
   * @dev the new investment is stored inside an array with (uint) id
   * @notice it is called from PAAP main contract ONLY to keep coherence with Invests
   * @param _amount amount to be invested
   * @param _interest interest of the investment
   */
  function recordInvestment(uint256 _amount, uint8 _interest)
    external
    ifInvestor
  {
    address _loanAddr = _msgSender();
    // @notice loan is not owned by this user
    require(
      IPAAP(paapAddr).validLoan(_loanAddr),
      "Loan (sender) is not a valid one or is not registered"
    );

    // Set new investment in User
    investments.push(
      Investment({
        loanAddress: _loanAddr,
        amount: _amount,
        interest: _interest,
        date: block.timestamp
      })
    );

    emit NewInvestment(
      _loanAddr,
      _amount,
      _interest,
      investments[investments.length - 1].date
    );
  }

  ///
  function getInvestment(uint256 _id)
    public
    view
    onlyOwnerOrAdmin
    returns (
      address _loanAddress,
      uint256 _amount,
      uint8 _interest,
      uint256 _date
    )
  {
    Investment memory inv = investments[_id];
    return (inv.loanAddress, inv.amount, inv.interest, inv.date);
  }

  /// @return the Investments Array's length
  function getInvestmentsLength() public view returns (uint256) {
    return investments.length;
  }

  // HELPERS
  function hash(string memory _param) internal pure returns (bytes32) {
    return keccak256(abi.encodePacked(_param));
  }

  // MODIFIERS
  modifier onlyAdmin() {
    bool _isAdmin = IPAAP(paapAddr).isAdmin(_msgSender());
    require(_isAdmin, "Only admins have access");
    _;
  }
  modifier onlyOwned() {
    address senderOwner = Ownable(_msgSender()).owner();
    require(
      senderOwner == owner(),
      "Forbidden: This function can only be called from a owned contract"
    );
    _;
  }
  modifier onlyOwnerOrAdmin() {
    address _sender = _msgSender();
    // this owner
    address _owner = owner();
    // check if sender is admin
    bool _isAdmin = IPAAP(paapAddr).isAdmin(_sender);

    if (_sender == _owner || _isAdmin) {
      // Direct valid call from an admin or an owner
      _;
    } else if (_sender != tx.origin) {
      // redirected call
      // who is the contract's owner
      address _senderOwner = Ownable(_sender).owner();
      if (_sender == paapAddr) {
        // Redirected call from PAAP
        // PAAP function that have check access
        _;
      } else if (_senderOwner == _owner) {
        // Redirected call from an owned Contract
        // loans case
        _;
      }
    } else {
      revert("You are not allowed to call this method");
    }
  }

  modifier ifBorrower() {
    require(hash(rol) == hash("borrower"), "This user is not borrower");
    _;
  }
  modifier ifInvestor() {
    require(hash(rol) == hash("investor"), "This user is not investor");
    _;
  }
  modifier userInputReq(
    address _paapAddr,
    address _userAcc,
    string memory _username,
    string memory _password,
    string memory _rol
  ) {
    // Rol
    require(IPAAP(_paapAddr).validRol(_rol), "User must be borrower or investor");
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
    // Addresses
    require(_paapAddr != address(0), "PAAP address equals 0x0");
    require(_userAcc != address(0), "User account address equals 0x0");
    _;
  }
}
