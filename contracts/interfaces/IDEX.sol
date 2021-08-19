// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7 <0.9.0;

interface IDEX {
    
    function setEURUSDExchangeRate(uint256 exchangeRate) external;

    function tradeEURtoUSD(uint256 eurAmount) external;

    function tradeUSDtoEUR(uint256 usdAmount) external;
}