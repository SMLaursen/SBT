// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7 <0.9.0;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import './interfaces/ILendingPool.sol';
import './interfaces/IYieldProtocol.sol';

contract MarketRiskMitigator is Ownable {
    IERC20 _eurInstance;
	IERC20 _usdInstance;

	ILendingPool _lendingPoolInstance;
	IYieldProtocol _yieldProtocolInstance;

	uint256 totalManagedEURAmount = 0;
	uint256 totalManagedUSDAmount = 0;

	struct Deposit {
		uint8 index;
		uint256 eurAmount;
	}

	mapping(address => Deposit) internal balances;
	address[] internal depositors;

	
	function _addDeposit(address _address, uint256 _eurAmount) internal {
		Deposit storage entry = balances[_address];
		entry.eurAmount += _eurAmount;
		totalManagedEURAmount += _eurAmount;

		if(entry.index > 0){
			// entry exists : do nothing
			return;
		} else {
			depositors.push(_address);
			uint8 depositerIndex = uint8(depositors.length - 1);
			entry.index = depositerIndex + 1;
		}
	}

	constructor (IERC20 eurInstance, IERC20 usdInstance, ILendingPool lendingPool, IYieldProtocol YieldProtocol) Ownable(){
		_eurInstance = eurInstance; 
		_usdInstance = usdInstance;
		_lendingPoolInstance = lendingPool;
		_yieldProtocolInstance = YieldProtocol;
	}

	function depositEUR(uint256 amount) external {
		//Depositer needs to have this transfer approved
		_eurInstance.transferFrom(msg.sender, address(this), amount);
		_addDeposit(msg.sender, amount);

		_rebalance();
	}

	function redeemEUR() external {
		uint256 redeemableBalance = balances[msg.sender].eurAmount;
		require(redeemableBalance > 0);

		//TODO redeem amounts to this SC from yield protocol then loan first

		_eurInstance.approve(address(this), redeemableBalance);
		_eurInstance.transfer(msg.sender, redeemableBalance);

		Deposit storage entry = balances[msg.sender];
		entry.eurAmount = 0;

		totalManagedEURAmount-=redeemableBalance;

		_rebalance();
	}

	function check() external onlyOwner {
		
	}

	function _rebalance() internal {
		
	}

	function getEURBalance() public view returns (uint256){
		return _eurInstance.balanceOf(address(this));
	}

	function getUSDBalance() public view returns (uint256){
		return _usdInstance.balanceOf(address(this));
	}

}