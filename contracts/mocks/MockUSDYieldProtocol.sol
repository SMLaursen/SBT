// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7 <0.9.0;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import '../interfaces/IYieldProtocol.sol';
import '../mocks/MockUSD.sol';

//Mocked Yield pool that distributes redeemable yield when generateYield(ratio) is called  
contract MockUSDYieldProtocol is IYieldProtocol, Ownable {
	MockUSD private _usdInstance;
	uint256 private totalInvestment = 0;

	struct Deposit {
		uint8 index;
		uint256 usdAmount;
	}

	mapping(address => Deposit) internal balances;
	address[] internal depositors;

    constructor (MockUSD usdInstance) Ownable(){
		_usdInstance = usdInstance;
	}

	/** Deposits funds in the yield protocol. 
	The transfer needs to be approved beforehand*/ 
	function deposit(uint256 usdAmount) external override {
		_usdInstance.transferFrom(msg.sender, address(this), usdAmount);
		_addDeposit(msg.sender, usdAmount);
	}

	/** Deposits funds in the yield protocol. 
	The transfer needs to be approved beforehand*/ 
	function redeem() external override {
		uint256 redeemableBalance = balances[msg.sender].usdAmount;
		//Nothing to redeem
		if(redeemableBalance == 0){
			return;
		}

		_usdInstance.approve(address(this), redeemableBalance);
		_usdInstance.transfer(msg.sender, redeemableBalance);
		
		Deposit storage entry = balances[msg.sender];
		entry.usdAmount = 0;

		totalInvestment-=redeemableBalance;
	}

	/** Returns the balance deposited for generating yield*/ 
	function balanceOf(address adr) external override view returns(uint256){
		return balances[adr].usdAmount;
	}

	/** Test function to generate yield to the SmartContract every time invoked */
	function generateYield(uint8 apy) external onlyOwner {
		uint256 currentBalance =_usdInstance.balanceOf(address(this));
		uint256 mint = currentBalance * apy / 100;
		_usdInstance.mint(mint);

		require(_usdInstance.balanceOf(address(this)) == currentBalance+mint);

		uint256 currentTotalInvestment = totalInvestment;
		for(uint8 i = 0; i < depositors.length; i++){
			address adr = depositors[i];
			uint256 ratio = balances[adr].usdAmount * 100 / currentTotalInvestment;
			_addDeposit(adr, ratio * mint / 100);
		}

		require(currentTotalInvestment + mint == totalInvestment, "Sanity error - the old balance + mint should equal the new balance");
	}

	function _addDeposit(address _address, uint256 _usdAmount) internal {
		Deposit storage entry = balances[_address];
		entry.usdAmount += _usdAmount;
		totalInvestment += _usdAmount;
		if(entry.index > 0){
			// entry exists : do nothing
			return;
		} else {
			depositors.push(_address);
			uint8 depositerIndex = uint8(depositors.length - 1);
			entry.index = depositerIndex + 1;
		}
	}
}