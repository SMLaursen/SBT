// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7 <0.9.0;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import '../interfaces/ILendingPool.sol';

contract MockEURUSDLendingPool is ILendingPool, Ownable {
    IERC20 _eurInstance;
	IERC20 _usdInstance;

	mapping(address => uint256) eurCollateral;
	mapping(address => uint256) borrowedUSDAmount;

	//1.20
	uint256 exchangeRateEURUSD = 120 * 10**8;

	uint8 collateralRatio = 85;
	uint8 liquidationRatio = 95;

    constructor (IERC20 eurInstance, IERC20 usdInstance) Ownable(){
		_eurInstance = eurInstance; 
		_usdInstance = usdInstance;
	}

 	function setEURUSDExchangeRate(uint256 _exchangeRate) external onlyOwner{
        exchangeRateEURUSD = _exchangeRate;
		_checkLiquidations();
    }

	function _checkLiquidations() internal {
		//TODO Perform liquidation if needed
	}

	function borrowUSD(uint256 eurAmount) external {
		require(borrowedUSDAmount[msg.sender] == 0, "You already have a loan");
		_eurInstance.transferFrom(msg.sender, address(this), eurAmount);

		uint256 usdAmount = eurAmount * exchangeRateEURUSD / 10**10 * collateralRatio / 100;

		_usdInstance.approve(address(this), usdAmount);
		_usdInstance.transfer(msg.sender, usdAmount);
	
		eurCollateral[msg.sender] = eurAmount;
		borrowedUSDAmount[msg.sender] = usdAmount;
	}

	function redeemEUR() external {
		require(borrowedUSDAmount[msg.sender] > 0, "You don't have any loans");

		uint256 usdAmount = borrowedUSDAmount[msg.sender];
		uint256 eurAmount = eurCollateral[msg.sender];

		_usdInstance.transferFrom(msg.sender, address(this), usdAmount);

		_eurInstance.approve(address(this), eurAmount);
		_eurInstance.transfer(msg.sender, eurAmount);

		eurCollateral[msg.sender] = 0;
		borrowedUSDAmount[msg.sender] = 0;
	}

	function getUtilization() external view returns (uint8) {
		return uint8(getBorrowedValueUSD() * 100 / getCollateralValueUSD()); 
	}

	function getBorrowedValueUSD() public view returns (uint256) {
		return borrowedUSDAmount[msg.sender];
	}

	function getCollateralValueUSD() public view returns (uint256) {
		return eurCollateral[msg.sender] * exchangeRateEURUSD / 10**10;
	}
} 