// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7 <0.9.0;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import './interfaces/ILendingPool.sol';
import './interfaces/IYieldProtocol.sol';
import './interfaces/IDEX.sol';

contract MarketRiskMitigator is Ownable {
    IERC20 _eurInstance;
	IERC20 _usdInstance;

	ILendingPool _lendingPoolInstance;
	IYieldProtocol _yieldProtocolInstance;
	IDEX _dexInstance;

	uint256 pooledEURDeposits = 0;

	struct Deposit {
		uint8 index;
		uint256 eurAmount;
	}

	mapping(address => Deposit) internal balances;
	address[] internal depositors;

	constructor (IERC20 eurInstance, IERC20 usdInstance, ILendingPool lendingPool, IYieldProtocol yieldProtocol, IDEX dex) Ownable(){
		_eurInstance = eurInstance; 
		_usdInstance = usdInstance;
		_lendingPoolInstance = lendingPool;
		_yieldProtocolInstance = yieldProtocol;
		_dexInstance = dex;
	}

	function depositEUR(uint256 amount) external {
		_redeemFundsToEUR();
		_distributePnL();
		
		//Depositer needs to have this transfer approved
		_eurInstance.transferFrom(msg.sender, address(this), amount);
		_addDeposit(msg.sender, amount);

		_rebalanceFunds();
	}

	function redeemEUR() external {
		uint256 redeemableBalance = balances[msg.sender].eurAmount;
		require(redeemableBalance > 0);

		_redeemFundsToEUR();
		_distributePnL();

		redeemableBalance = balances[msg.sender].eurAmount;
		_eurInstance.approve(address(this), redeemableBalance);
		_eurInstance.transfer(msg.sender, redeemableBalance);

		Deposit storage entry = balances[msg.sender];
		entry.eurAmount = 0;
		pooledEURDeposits-=redeemableBalance;

		_rebalanceFunds();
	}

	function check() external onlyOwner {
		//TODO check utilization of lending pool within 5%
		//TODO check current hedge is within 5%
		_rebalance();
	}

	function _rebalance() internal onlyOwner {
		_redeemFundsToEUR();
		_distributePnL();
		_rebalanceFunds();
	}

	function _redeemFundsToEUR() internal {
		_yieldProtocolInstance.redeem();
		
		uint256 borrowedUSD = _lendingPoolInstance.getBorrowedUSD(address(this));
		_usdInstance.approve(address(_lendingPoolInstance), borrowedUSD);
		_lendingPoolInstance.redeemEUR();

		//Trade lefterover USD (from e.g. yields) to EUR
		uint256 leftoverUSD = _usdInstance.balanceOf(address(this));
		if(leftoverUSD > 0){
			_usdInstance.approve(address(_dexInstance), leftoverUSD);
			_dexInstance.tradeUSDtoEUR(leftoverUSD);
		}
	}

	function _distributePnL() internal {
		uint256 eurBalance = _eurInstance.balanceOf(address(this));
		uint256 pnlRatio = eurBalance * 100 / pooledEURDeposits;
		
		//No need to do anything
		if(pnlRatio == 100){
			return;
		}

		//Distribute PnL to depositors
		for(uint8 i = 0; i < depositors.length; i++){
			Deposit storage entry = balances[depositors[i]];
			entry.eurAmount = entry.eurAmount * pnlRatio / 100;
		}
		pooledEURDeposits = pooledEURDeposits * pnlRatio / 100;
	}

	function _rebalanceFunds() internal {
		//Trade any residual USD to EUR
		uint256 idleUsd = _usdInstance.balanceOf(address(this));
		if(idleUsd > 0){
			_usdInstance.approve(address(_dexInstance), idleUsd);
			_dexInstance.tradeUSDtoEUR(idleUsd);

			require(idleUsd > 0, "Sanity Error");
		}

		//Then borrow USD using EUR as collateral to ensure it's hedged and place it in the yield protocol
		uint256 idleEur = _eurInstance.balanceOf(address(this));
		if(idleEur > 0){
			_eurInstance.approve(address(_lendingPoolInstance), idleEur);
			_lendingPoolInstance.borrowUSD(idleEur);

			idleUsd = _usdInstance.balanceOf(address(this));
			require(idleUsd > 0, "Sanity Error");

			_usdInstance.approve(address(_lendingPoolInstance), idleEur);
			_yieldProtocolInstance.deposit(idleUsd);
		}
	}
		
	function _addDeposit(address _address, uint256 _eurAmount) internal {
		Deposit storage entry = balances[_address];
		entry.eurAmount += _eurAmount;
		pooledEURDeposits += _eurAmount;

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