// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {
  IERC20Upgradeable as IERC20
} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {
  OwnableUpgradeable as Ownable
} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./IUsers.sol";

/**
 * @title iobuilders exercise
 */
contract IobManager is Ownable {
  // EVENTS
  event UserCreated(
    bytes32 indexed id,
    string indexed name,
    string password
    // uint256 indexed date // Not needed -- use Block.timestamp
  );
  event UserEdited(bytes32 indexed id, string indexed newName, string newPassword);
  event UserDeleted(bytes32 indexed id);

  event Deposit(bytes32 indexed recipient, uint256 indexed amount);
  event Withdraw(bytes32 indexed spender, uint256 indexed amount);
  event Transfer(bytes32 indexed spender, bytes32 indexed recipient, uint256 indexed amount);
  event Approval(bytes32 indexed spender, uint256 indexed amount);

  IERC20 myToken;
  IUsers users;
  // maps the owner's account with the user's id
  mapping(address => bytes32) internal ownerToUser;
  // flag to mark the initialization state of the contract
  bool internal initComplete;

  // FUNCTIONS
  function initialize(address _users) external initializer {
    // initializate the owner as the msg.sender through ownable contract
    __Ownable_init();
    users = IUsers(_users);
    users.initManager();
  }

  function initToken() external onlyOnce {
    myToken = IERC20(_msgSender());
    initComplete = true;
  }

  function newUser(string memory _name, string memory _password) public initialized {
    address sender = _msgSender();
    require(ownerToUser[sender] == bytes32(0), "Cannot have more than one user with one account");
    bytes32 userId = users.newUser(_name, _password, sender);
    ownerToUser[sender] = userId;
    emit UserCreated(userId, _name, _password);
  }

  function editUser(
    bytes32 _id,
    string memory _newName,
    string memory _newPass
  ) public {
    require(_id == ownerToUser[_msgSender()], "This user is not yours");
    users.editUser(_id, _newName, _newPass);
    emit UserEdited(_id, _newName, _newPass);
  }

  function deleteUser(bytes32 _id) public {
    address sender = _msgSender();
    require(ownerToUser[sender] == _id, "This user is not yours");
    users.deleteUser(_id);
    ownerToUser[sender] = bytes32(0);
    emit UserDeleted(_id);
  }

  function getUser(bytes32 _id) external view onlyOwner returns (User memory) {
    return users.getUser(_id);
  }

  function getMyUser() external view returns (User memory) {
    return users.getUser(ownerToUser[_msgSender()]);
  }

  function getUserByOwner(address _owner) external view onlyOwner returns (User memory) {
    return users.getUser(ownerToUser[_owner]);
  }

  function getAllUsers() public view onlyOwner returns (User[] memory) {
    return users.getAllUsers();
  }

  // Token Functions -------
  function deposit(bytes32 _recipientId, uint256 _amount) public onlyOwner {
    User memory recipient = users.getUser(_recipientId);
    // from: Manager to: recipient amount: _amount
    myToken.transfer(recipient.owner, _amount);
    emit Deposit(recipient.id, _amount);
  }
  
  // carefull need to approve first
  function withdraw(bytes32 _spenderId, uint256 _amount) public onlyOwner {
    User memory spender = users.getUser(_spenderId);
    // from: spender to: Manager amount: _amount
    myToken.transferFrom(spender.owner, address(this), _amount);
    emit Withdraw(spender.id, _amount);
  }

  // carefull need to approve first
  function transfer(bytes32 _spenderId, bytes32 _recipientId, uint256 _amount) public onlyOwner {
    User memory spender = users.getUser(_spenderId);
    User memory recipient = users.getUser(_recipientId);
    // from: spender to: recipient amount: _amount
    myToken.transferFrom(spender.owner, recipient.owner, _amount);
    emit Transfer(spender.id, recipient.id, _amount);
  }

  function approve(uint256 _amount) public {
    // from: msg.sender to: Manager amount: _amount
    myToken.approve(address(this), _amount);
    emit Approval(ownerToUser[_msgSender()], _amount);
  }

  // MODIFIERS
  modifier onlyOnce() {
    require(!initComplete, "Initialization already completed");
    _;
  }
  modifier initialized() {
    require(initComplete, "Initialization not completed");
    _;
  }
}
