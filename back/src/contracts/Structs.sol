// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.6.0 <0.8.0;

// USERS
struct Investment {
  address loanAddress;
  uint256 amount;
  uint8 interest;
  uint256 date;
}

// LOANS
struct Invest {
  address investorAddress;
  address investorAccount;
  uint256 amount;
  uint8 percentQuantity; // unused
  uint8 interest;
  uint256 date;
}

struct PayPlan {
  uint256[] amounts; // [month] [invest]
  // Percent that indicates the amount corresponding to each investor in percWEI (10**6)
  // Example: 25% = 0.25 --> [250000] stored
  uint256[] percents;
  uint256[] dates;
  int256 lastPaidMonth;
  uint256 debt;
  uint256 penalties;
}
