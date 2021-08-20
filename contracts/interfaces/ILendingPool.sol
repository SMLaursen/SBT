// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7 <0.9.0;

interface ILendingPool {

    function setEURUSDExchangeRate(uint256 exchangeRate) external;

    function borrowUSD(uint256 eurAmount) external;

    function redeemEUR() external;    

    function getUtilization(address add) external view returns (uint8);

    function getBorrowedUSD(address add) external view returns (uint256);

    function getCollateralizedEUR(address add) external view returns (uint256);

}