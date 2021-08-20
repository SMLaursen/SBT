// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7 <0.9.0;

interface IDEX {
    
    /** Sets the exhange rate by the SCs owner*/ 
    function setEURUSDExchangeRate(uint256 exchangeRate) external;
    
    /** Trades EUR to USD at the current exchange rate*/ 
    function tradeEURtoUSD(uint256 eurAmount) external;
    
    /** Trades USD to EUR at the current exchange rate*/ 
    function tradeUSDtoEUR(uint256 usdAmount) external;
}