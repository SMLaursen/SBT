// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7 <0.9.0;

interface ILendingPool {

    /** Sets the exhange rate by the SCs owner and performs liquidations if necessary*/ 
    function setEURUSDExchangeRate(uint256 exchangeRate) external;

    /** borrows USD from the supplied EUR at the LendingProtocols current exchange rate and utilization ratio. */
    function borrowUSD(uint256 eurAmount) external;

    /** Redeems the loan, and return the collateral. This requires the USD transfer to be approved */
    function redeemEUR() external;    

    /** Returns the clients collateral / borrow ratio */
    function getUtilization(address add) external view returns (uint8);
    
    /** Returns the borrowed USD amount that can be redeemed for the EUR collateral */
    function getBorrowedUSD(address add) external view returns (uint256);

    /** Returns collateralized EUR amount */
    function getCollateralizedEUR(address add) external view returns (uint256);

}