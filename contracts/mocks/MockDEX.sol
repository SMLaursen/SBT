// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7 <0.9.0;

import '@openzeppelin/contracts/access/Ownable.sol';

import '../mocks/MockUSD.sol';
import '../mocks/MockEUR.sol';
import '../interfaces/IDEX.sol';

//MockedDEX that can trade EUR to USD and vice-versa
contract MockDEX is IDEX, Ownable {
	MockUSD private _usdInstance;
	MockEUR private _eurInstance;

	//1.20
	uint256 private exchangeRateEURUSD = 120 * 10**8;

    constructor(MockEUR eurInstance, MockUSD usdInstance) Ownable() {
       _usdInstance = usdInstance;
       _eurInstance = eurInstance;
    }

    function setEURUSDExchangeRate(uint256 exchangeRate) external override onlyOwner {
        exchangeRateEURUSD = exchangeRate;
    }

    function tradeEURtoUSD(uint256 eurAmount) external override {
        _eurInstance.transferFrom(msg.sender, address(this), eurAmount);

        uint256 usdAmount = eurAmount * exchangeRateEURUSD / 10**10;
		_usdInstance.approve(address(this), usdAmount);
		_usdInstance.transfer(msg.sender, usdAmount);    
    }

    function tradeUSDtoEUR(uint256 usdAmount) external override {
        _usdInstance.transferFrom(msg.sender, address(this), usdAmount);

        uint256 eurAmount = usdAmount * 10**10 / exchangeRateEURUSD;
		_eurInstance.approve(address(this), eurAmount);
		_eurInstance.transfer(msg.sender, eurAmount);    
    }
}