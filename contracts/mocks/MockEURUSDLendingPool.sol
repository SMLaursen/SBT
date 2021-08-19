// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7 <0.9.0;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import '../interfaces/ILendingPool.sol';

contract MockEURUSDLendingPool is ILendingPool, Ownable {
    IERC20 _eurInstance;
	IERC20 _usdInstance;
    
	uint256 exchangeRate = 1 * 10**10;

	uint8 precheckRatio = 85;
	uint8 liquidationRatio = 95;

    constructor (IERC20 eurInstance, IERC20 usdInstance) Ownable(){
		_eurInstance = eurInstance; 
		_usdInstance = usdInstance;
	}

 	function setEURUSDExchangeRate(uint256 _exchangeRate) external onlyOwner{
        exchangeRate = _exchangeRate;
    }

	function borrowUSD(uint256 eurAmount) external {
		_eurInstance.transferFrom(msg.sender, address(this), eurAmount);

		uint256 usdAmount = eurAmount * exchangeRate / 10**10;
		_usdInstance.approve(address(this), usdAmount);
		_usdInstance.transfer(msg.sender, usdAmount);
	}
}