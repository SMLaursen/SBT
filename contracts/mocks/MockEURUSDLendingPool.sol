// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7 <0.9.0;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import '../interfaces/ILendingPool.sol';

contract MockEURUSDLendingPool is ILendingPool, Ownable {
    IERC20 _eurInstance;
	IERC20 _usdInstance;
    
	uint256 exchangeRate;

    constructor (IERC20 eurInstance, IERC20 usdInstance) Ownable(){
		_eurInstance = eurInstance; 
		_usdInstance = usdInstance;
	}

 	function setEURUSDExchangeRate(uint256 _exchangeRate) external onlyOwner{
        exchangeRate = _exchangeRate;
    }

	function borrowUSD(uint256 amount) external {
		uint256 eurCollateral = amount;
		_eurInstance.transfer(address(this), eurCollateral);

		_usdInstance.approve(address(this), amount);
		_usdInstance.transferFrom(address(this), msg.sender, amount);
	}

}