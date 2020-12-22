pragma solidity >=0.6.0 <0.8.0;

import "./lib/Ownable.sol";
import { Invest, PayPlan } from "./Structs.sol";
import {
  ITokenInLoan as IToken,
  IPAAPinLoan as IPAAP,
  IUserInLoan as IUser
} from "./Interfaces.sol";

// SPDX-License-Identifier: UNLICENSED
/**
 * @title Loan Contract for PAAP proyect
 * @author Miguel Gómez Carpena, Izertis Blockchain
 * @dev Loan should be only called through User Contract
 */
contract Loan is OwnableUpgradeSafe {
  event LoanInitialized(
    address indexed loanAddress,
    address indexed owner,
    uint256 quantity,
    string indexed state,
    uint8 minInterest,
    uint8 maxInterest,
    uint256 date,
    uint256 deadline,
    uint256 refundTime
  );
  // new Investment is successfully made
  event NewInvest(
    address indexed loanAddress,
    address indexed investorAddress,
    uint256 amount,
    uint8 interest,
    uint256 indexed date
  );
  // loan has been cancelled
  event LoanCancelled(
    address indexed loanAddress,
    string indexed reason,
    uint256 indexed date
  );
  // loan has been published
  event LoanPublished(
    address indexed loanAddress,
    uint8 risk,
    uint8 minInterest,
    uint8 maxInterest,
    uint256 indexed quantity,
    uint256 indexed date
  );
  // loan has been invested
  event LoanInvested(address indexed loanAddress, uint256 indexed date);
  // loan has been approved
  event LoanAccepted(address indexed loanAddress, uint256 indexed date);
  // loan has been refunded
  event LoanRefunded(address indexed loanAdress, uint256 indexed date);
  // Loan's Payment Plan has been created
  event PayPlanCreated(
    address indexed loanAddress,
    uint256[] indexed payAmounts,
    uint256[] indexed dates
  );
  // a paiy back has been made
  event PaidBack(
    string message,
    address indexed loanAddress,
    bool indexed completed,
    uint256 paidAmount,
    uint256 payPeriod,
    uint256 indexed date
  );

  // the address of the PAAP's contract
  address paapAddr;
  // Address of the PAAP token
  address tokenAddr;
  // the address of the User's contract
  address userAddr;
  // total quantity of the Loan
  uint256 public quantity;
  /** Loan's current state
   *   @notice
   *       draft,
   *       cancelled,
   *       published,
   *       invested,
   *       accepted,
   *       refunded
   */
  string public state = "draft";
  mapping(string => uint8) stateToUint;
  // associated Loan's risk
  uint8 public risk = 200;
  uint8 public minInterest;
  uint8 public maxInterest;
  // date in which the loan should be completly invested
  uint256 public deadLine;
  // number of months is which the loan should be paid back once is accepted by the owner
  uint16 public refundTime;
  // keeps track of the total invested until now
  uint256 public investedTotal;
  // Loan's creation date (Unix format)
  uint256 public creationDate;
  // array that record the invests made to this loan
  Invest[] invested;
  // Payments Plan struct to calculate how much and when a user should pay back
  PayPlan payPlan;

  // This constructor should be only invoked through User contract's createLoan() function
  function initialize(
    address _userAddr,
    uint256 _quantity,
    uint8 _minInterest,
    uint8 _maxInterest,
    uint256 _deadLine,
    uint16 _refundTime
  ) public initializer {
    /** constructor **/
    __Ownable_init();
    // **** CHECK INPUT (CANNOT BE DONE WITH MODIFIER (STACK))
    // Quantity
    // - 18 decimals
    require(
      _quantity > 100000000000000000000,
      "Minimum loan quantity is 100 paap"
    );
    require(
      _quantity < 10000000000000000000000000,
      "Maximun loan quantity is 10000000 paap"
    );
    // Min Interest
    require(_minInterest > 0, "Minimum interest must be greater than 0%");
    require(_minInterest < 100, "Minimum interest must be less than 100%");
    require(
      _minInterest < _maxInterest,
      "Minimum interest must be less than Maximum Interest"
    );
    // Max Interest
    require(_maxInterest > 0, "Maximum interest must be greater than 0%");
    require(_maxInterest < 100, "Maximum interest must be less than 100%");
    require(
      _maxInterest > _minInterest,
      "Maximum interest must be greater than Minimum Interest"
    );
    // Dead Line (43200‬s = 12h) (15.552.000 = 6months(30d per m))
    require(
      _deadLine > (block.timestamp + 43200),
      "DeadLine must be greater than block.timestamp + 12 hours"
    );
    require(
      _deadLine <= (block.timestamp + 15552000),
      "DeadLine must be less than block.timestamp + 24 months"
    );
    // Refund Time in months
    require(_refundTime > 0, "Refund time must be greater than 0 months");
    require(_refundTime < 65535, "Refund time must be less than 65,535 months");
    // User Address
    require(_userAddr != address(0), "User SC's address equals 0x0");
    // Initialize
    userAddr = _userAddr;
    quantity = _quantity;
    minInterest = _minInterest;
    maxInterest = _maxInterest;
    creationDate = block.timestamp;
    deadLine = _deadLine;
    refundTime = _refundTime;
    // Init states
    stateToUint["draft"] = 0;
    stateToUint["cancelled"] = 1;
    stateToUint["published"] = 2;
    stateToUint["invested"] = 3;
    stateToUint["accepted"] = 4;
    stateToUint["refunded"] = 5;
    // Register loan to user contract
    (paapAddr, tokenAddr) = IUser(_userAddr).registerLoan();

    emit LoanInitialized(
      address(this),
      owner(),
      _quantity,
      state,
      _minInterest,
      _maxInterest,
      block.timestamp,
      _deadLine,
      _refundTime
    );
  }

  // SETTERS AND GETTERS

  /**
   * return this loan info by its public properties */
  function get()
    public
    view
    returns (
      address _owner,
      address _loanAddress,
      uint256 _quantity,
      string memory _state,
      uint8 _risk,
      uint8 _minInterest,
      uint8 _maxInterest,
      uint256 _deadLine,
      uint16 _refundTime,
      uint256 _investedTotal,
      uint256 _creationDate
    )
  {
    return (
      owner(),
      address(this),
      quantity,
      state,
      risk,
      minInterest,
      maxInterest,
      deadLine,
      refundTime,
      investedTotal,
      creationDate
    );
  }

  function remove(string memory _message) external onlyAdmin {
    require(
      hash(_message) == hash("I KNOW WHAT I AM DOING"),
      "DANGER: You have to know what are you doing... really"
    );
    // =================== Start LLC =========================
    // FROM_SC: Loan TO_SC: User, TO_FUNC: removeLoan
    bytes memory _payload = abi.encodeWithSignature("removeLoan()");
    (bool _success, ) = userAddr.call(_payload);
    require(_success, "LLC ERROR: Loan.remove --> User.removeLoan");
    // =================== End LLC ===========================
    selfdestruct(_msgSender());
  }

  /// sets a new dead Line
  function setDeadLine(uint256 _deadLine) public onlyOwnerOrAdmin {
    deadLine = _deadLine;
  }

  /** Creates a new Invest Struct
   * @dev the new invest is stored inside an array with (uint) id
   * @notice it is called from PAAP main contract ONLY to keep coherence with Investments
   */
  function invest(uint256 _amount, uint8 _interest) public {
    address _investorAcc = _msgSender();
    require(_investorAcc != owner(), "Cannot be invested by the owner");
    require(stateToUint[state] < 3, "This loan has been already invested");
    require(
      _interest >= minInterest && _interest <= maxInterest,
      "Interest must be between the min and max Interest of the loan"
    );
    require(
      _amount <= (quantity - investedTotal),
      "This invest's amount is greater than the total left"
    );
    // Get investor's SC address and rol
    address _investorAddr = IPAAP(paapAddr).getAddrFromOwner(_investorAcc);
    string memory _investorRol = IUser(_investorAddr).getRol();
    require(hash(_investorRol) == hash("investor"), "User must be investor");
    // Transfer from investor account to this loan's SC
    IToken(tokenAddr).transferFrom(_investorAcc, address(this), _amount);
    // Calcs
    investedTotal = investedTotal + _amount;
    if (investedTotal == quantity) {
      state = "invested"; // Loan Invested
      emit LoanInvested(address(this), block.timestamp);
    }

    invested.push(
      Invest({
        investorAddress: _investorAddr,
        investorAccount: _investorAcc,
        amount: _amount,
        percentQuantity: uint8((_amount * 100) / quantity),
        interest: _interest,
        date: block.timestamp
      })
    );
    // Record investment in the investor user's SC
    IUser(_investorAddr).recordInvestment(_amount, _interest);

    emit NewInvest(
      address(this),
      _investorAddr,
      _amount,
      _interest,
      invested[invested.length - 1].date
    );
  }

  /// return a Invest struct
  function getInvest(uint256 _id)
    public
    view
    onlyOwnerOrAdmin
    returns (
      address _investorAddress,
      address _investorAccount,
      uint256 _amount,
      uint8 _percentQuantity,
      uint8 _interest,
      uint256 _date
    )
  {
    Invest memory inv = invested[_id];
    return (
      inv.investorAddress,
      inv.investorAccount,
      inv.amount,
      inv.percentQuantity,
      inv.interest,
      inv.date
    );
  }

  /// @return the Investments Array's length
  function getInvestedLength() public view returns (uint256) {
    return invested.length;
  }

  /** Generates the Payment Plan for each Loan
   * @dev calculates the amount to pay each month and when it should be paid
   * Amount is always the same in first versión but culd be changed in the future
   * Dates starts now and then calculates the next refundTime months
   * The paid field is initialiced to false
   * Penalties not used (future implementation)
   * It requiers that the state of the loan equals 3
   */
  function generatePayPlan() internal {
    require(
      hash(state) == hash("accepted"),
      "This Loan should be in 'accepted' state before generate the payment plan"
    );
    // get decimals from token
    uint8 _decimals = IToken(tokenAddr).decimals();
    // Calculatre PayPlan
    uint256[1000] memory _monthlyPayments; // has to be initialiced
    uint256 _totalMonth;
    uint256 _datePointer = block.timestamp; // date pointer to calculate dates for each month
    // Calculate the monthly payment per investor

    uint256 i;
    for (i = 0; i < invested.length; i++) {
      _monthlyPayments[i] =
        (invested[i].amount +
          ((invested[i].amount * invested[i].interest) / 100)) /
        refundTime;
    }
    // calculates the total monthly payment
    for (i = 0; i < invested.length; i++) {
      _totalMonth = _totalMonth + _monthlyPayments[i];
    }
    // calculates the percent by investor
    for (i = 0; i < invested.length; i++) {
      payPlan.percents.push(
        (_monthlyPayments[i] * (10**uint256(_decimals))) / _totalMonth
      ); // percentWEI
    }
    // Calculate payment dates
    for (i = 0; i < refundTime; i++) {
      payPlan.amounts.push(_totalMonth);
      //!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      //datePointer = datePointer + 2592000; // + 30 days ~ 1 month
      _datePointer = _datePointer + 5; // TESTing propouses only
      //!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      payPlan.dates.push(_datePointer);
    }
    payPlan.debt = 0;
    payPlan.lastPaidMonth = -1;
    emit PayPlanCreated(address(this), payPlan.amounts, payPlan.dates);
  }

  // OTHER FUNCTIONS
  /// return the payment plan
  function getPayPlan()
    public
    view
    onlyOwnerOrAdmin
    returns (
      uint256[] memory _amounts,
      uint256[] memory _percents,
      uint256[] memory _dates,
      int256 _lastPaidMonth,
      uint256 _debt,
      uint256 _penalties
    )
  {
    require(stateToUint[state] > 3, "Payment plan not generated yet");
    return (
      payPlan.amounts,
      payPlan.percents,
      payPlan.dates,
      payPlan.lastPaidMonth,
      payPlan.debt,
      payPlan.penalties
    );
  }

  function cancel(string memory _reason) public onlyOwner() {
    require(stateToUint[state] < 4, "This loan has been alrready accepted");
    IToken _token = IToken(tokenAddr);
    uint256 _loanBalance = _token.balanceOf(address(this));
    require(
      _loanBalance >= investedTotal,
      "This loan's balance should equal investedTotal"
    );

    // return money to investors
    for (uint256 i; i < invested.length; i++) {
      _token.transfer(invested[i].investorAccount, invested[i].amount);
    }
    state = "cancelled";
    emit LoanCancelled(address(this), _reason, block.timestamp);
  }

  function publish(
    uint8 _risk,
    uint8 _minInterest,
    uint8 _maxInterest,
    uint256 _quantity
  ) public onlyAdmin {
    // Set always
    risk = _risk;
    // Optional parameters if != 0
    if (_minInterest != 0) {
      minInterest = _minInterest;
    }
    if (_maxInterest != 0) {
      maxInterest = _maxInterest;
    }
    if (_quantity != 0) {
      quantity = _quantity;
    }
    state = "published";
    emit LoanPublished(
      address(this),
      _risk,
      minInterest,
      maxInterest,
      quantity,
      block.timestamp
    );
  }

  /** accept this Loan, transfer funds to the owner and generate payment plan
   * @notice owner should approve this Loan
   */
  function accept() public onlyOwner {
    require(
      hash(state) == hash("invested"),
      "This Loan should be in 'invested' state"
    );
    require(
      quantity == investedTotal,
      "This loan should be completly founded by now"
    );

    state = "accepted"; // approved
    // transfer the quantity invested to the owner (borrower)
    IToken(tokenAddr).transfer(owner(), quantity);

    emit LoanAccepted(address(this), block.timestamp);
    generatePayPlan();
  }

  /**
   * Pays all pending payments
   * @notice this loan should be allowed to transfer at least one months amount from owner
   *  toDate indicates the date of the last month to be paid
   */
  function payBack() public onlyAdmin {
    require(
      hash(state) == hash("accepted"),
      "This Loan should be in 'accepted' state"
    );
    IToken _token = IToken(tokenAddr);
    address _owner = owner();
    uint8 _decimals8 = _token.decimals();
    uint256 _ownersBalance = _token.balanceOf(_owner);

    uint256 _decimals = uint256(_decimals8);
    int256 _end = int256(payPlan.dates.length - 1); // last position
    uint256 _monthTotal;
    uint256 _transferAmount; // for partial payments

    if (payPlan.lastPaidMonth == _end) {
      // only penalties left
      if (payPlan.penalties < _ownersBalance) {
        _transferAmount = payPlan.penalties;
        for (uint256 j; j < invested.length; j++) {
          _token.transferFrom(
            _owner,
            invested[j].investorAccount,
            (_transferAmount * payPlan.percents[j]) / (10**_decimals)
          );
        }
        payPlan.penalties = 0;
        emit PaidBack(
          "Penalties paid successfully",
          address(this),
          true,
          _transferAmount,
          payPlan.dates[uint256(_end)],
          block.timestamp
        );
        complete();
      } else if (_ownersBalance > 0) {
        // Owner can pay some penalties
        _transferAmount = _ownersBalance;
        for (uint256 j; j < invested.length; j++) {
          _token.transferFrom(
            _owner,
            invested[j].investorAccount,
            (_transferAmount * payPlan.percents[j]) / (10**_decimals)
          );
        }
        payPlan.penalties = payPlan.penalties - _transferAmount;
        emit PaidBack(
          "Partial penalties paid ",
          address(this),
          true,
          _transferAmount,
          payPlan.dates[uint256(_end)],
          block.timestamp
        );
      } else {
        // Owner's balance = 0
        emit PaidBack(
          "No penalties paid",
          address(this),
          true,
          0,
          payPlan.dates[uint256(_end)],
          block.timestamp
        );
      }
    } else {
      // Nomal payment flow
      // For each month not paid
      for (
        uint256 i = uint256(payPlan.lastPaidMonth + 1);
        (i < payPlan.amounts.length) && (payPlan.dates[i] <= block.timestamp);
        i++
      ) {
        _ownersBalance = _token.balanceOf(_owner);
        _monthTotal = payPlan.amounts[i] + payPlan.penalties;
        if (_monthTotal <= _ownersBalance) {
          // Owner has funds to pay this month and older penalties
          _transferAmount = _monthTotal;
          for (uint256 j; j < invested.length; j++) {
            _token.transferFrom(
              _owner,
              invested[j].investorAccount,
              (_transferAmount * payPlan.percents[j]) / (10**_decimals)
            );
          }
          payPlan.amounts[i] = 0;
          payPlan.penalties = 0;
          payPlan.lastPaidMonth = int256(i);
          emit PaidBack(
            "Payment successful",
            address(this),
            true,
            _transferAmount,
            payPlan.dates[i],
            block.timestamp
          );
        } else if (payPlan.amounts[i] <= _ownersBalance) {
          // Owner has funds to pay this month's amount but not older penalties
          _transferAmount =
            payPlan.amounts[i] +
            (_ownersBalance - payPlan.amounts[i]);
          for (uint256 j; j < invested.length; j++) {
            _token.transferFrom(
              _owner,
              invested[j].investorAccount,
              (_transferAmount * payPlan.percents[j]) / (10**_decimals)
            );
          }
          payPlan.amounts[i] = 0;
          payPlan.penalties =
            payPlan.penalties -
            (_ownersBalance - payPlan.amounts[i]);
          payPlan.lastPaidMonth = int256(i);
          emit PaidBack(
            "Payment successful, but penalties not paid",
            address(this),
            true,
            _transferAmount,
            payPlan.dates[i],
            block.timestamp
          );
        } else if (_ownersBalance > 0) {
          // Owner does not have enough funds to pay amount
          _transferAmount = _ownersBalance;
          for (uint256 j; j < invested.length; j++) {
            _token.transferFrom(
              _owner,
              invested[j].investorAccount,
              (_transferAmount * payPlan.percents[j]) / (10**_decimals)
            );
          }
          payPlan.penalties =
            payPlan.penalties +
            ((payPlan.amounts[i] * 2) / 100); // Penalties + 2% of amount
          payPlan.amounts[i] = payPlan.amounts[i] - _transferAmount;
          emit PaidBack(
            "Partial amount payment, penalties added",
            address(this),
            false,
            _transferAmount,
            payPlan.dates[i],
            block.timestamp
          );
        } else {
          // Owner's balance equals 0
          payPlan.penalties =
            payPlan.penalties +
            ((payPlan.amounts[i] * 2) / 100); // Penalties + 2% of amount
          emit PaidBack(
            "Owner's balance 0, penalties added",
            address(this),
            false,
            0,
            payPlan.dates[i],
            block.timestamp
          );
        }
      }
      // Check if loan is completly paid back
      if ((payPlan.lastPaidMonth == _end) && (payPlan.penalties == 0) && (payPlan.debt == 0)) {
        complete();
      }
    }
    // update the accumulated debt
    // @notice the amounts are = 0 if paid
    payPlan.debt = 0;
    for (
      uint256 i = 0;
      (i < payPlan.amounts.length) && (payPlan.dates[i] <= block.timestamp);
      i++
    ) {
      payPlan.debt = payPlan.debt + payPlan.amounts[i];
    }
    payPlan.debt = payPlan.debt + payPlan.penalties;
  }

  function complete() internal {
    require(
      hash(state) == hash("accepted"),
      "This loan is not accepted yet, so it can't be completed"
    );
    require(
      payPlan.lastPaidMonth == int256(payPlan.dates.length - 1),
      "Something went wrong, payments are not completed yet"
    );
    require(
      payPlan.penalties == 0,
      "Something went wrong, penalties are not completely paid yet"
    );
    // Check this loan's token balance
    uint256 _loanBalance = IToken(tokenAddr).balanceOf(address(this));
    require(_loanBalance == 0, "this loan has balance");
    // change state to completly refunded
    state = "refunded";
    emit LoanRefunded(address(this), block.timestamp);
  }

  // HELPERS
  function hash(string memory _param) public pure returns (bytes32) {
    return keccak256(abi.encodePacked(_param));
  }

  // MODIFIERS
  modifier onlyAdmin() {
    bool _isAdmin = IPAAP(paapAddr).isAdmin(_msgSender());
    require(_isAdmin, "Only admins have access");
    _;
  }
  modifier onlyOwnerOrAdmin() {
    address _sender = _msgSender();
    bool _isAdmin = IPAAP(paapAddr).isAdmin(_sender);

    require(
      (_sender == owner() || _isAdmin),
      "Only owner or admin have access"
    );
    _;
  }
}
