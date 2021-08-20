// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7 <0.9.0;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import './interfaces/ILendingPool.sol';
import './interfaces/IYieldProtocol.sol';
import './interfaces/IDEX.sol';

// Tracks client deposits and hedges EUR to USD using a lending pool and a DEX. The resulting USD is placed in the yield protocol
// The MRM tracks the lendings pools utilization ratio and the Yield protocols accrued interest to rebalance (and hedge) accordingly 
contract MarketRiskMitigator is Ownable {
 	IERC20 private _eurInstance;
	IERC20 private _usdInstance;

	ILendingPool private _lendingPoolInstance;
	IYieldProtocol private _yieldProtocolInstance;
	IDEX private _dexInstance;

	uint256 private pooledEURDeposits = 0;

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

	/** Deposits fund in MRM pool. 
	The transfer needs to be approved beforehand*/ 
	function depositEUR(uint256 amount) external {
		_redeemFundsToEUR();
		_distributePnL();
		
		//Depositer needs to have this transfer approved
		_eurInstance.transferFrom(msg.sender, address(this), amount);
		_addDeposit(msg.sender, amount);

		_allocateFunds();
	}


	/** Redeems the callers share in EUR*/ 
	function redeemEUR() external {
		uint256 redeemableBalance = balances[msg.sender].eurAmount;
		if(redeemableBalance == 0){
			//Nothing to redeem
			return;
		}

		_redeemFundsToEUR();
		_distributePnL();

		redeemableBalance = balances[msg.sender].eurAmount;
		_eurInstance.approve(address(this), redeemableBalance);
		_eurInstance.transfer(msg.sender, redeemableBalance);

		Deposit storage entry = balances[msg.sender];
		entry.eurAmount = 0;
		pooledEURDeposits-=redeemableBalance;

		_allocateFunds();
	}

	/** The owner of this contract is expected to call this function at regular intervals.
		Triggers rebalance when : 
		a) utilization imbalances in the lending protocol of 3% or more is detected 
		b) More than 5% of the USD amount in the yield protocol is unhedged in the lending pool
	*/ 
	function check() external onlyOwner {		
		//Check lending pool is within +/- 3% of the optimum
		uint8 currentUtil = _lendingPoolInstance.getUtilization(address(this));
		bool isUtilizationOK = currentUtil > 82 && currentUtil < 88;

		//Check that at most 5% of the USD position may remain unhedged 
		uint256 usdBalance = _yieldProtocolInstance.balanceOf(address(this));
		if(currentUtil == 0 && usdBalance == 0){
			return;
		}

		uint256 borrowedAmount = _lendingPoolInstance.getBorrowedUSD(address(this));
		bool isEURSufficientlyHedged = borrowedAmount * 100 / usdBalance > 95;  
		
		if(isUtilizationOK && isEURSufficientlyHedged){
			return;
		}
		_rebalance();
	}

	// Simplified rebalance function that settles everything to eur and reinvest the pool
	// This could be greatly improved by tracking deltas instead
	function _rebalance() internal onlyOwner {
		_redeemFundsToEUR();
		_distributePnL();
		_allocateFunds();
	}

	//Redeems everything to EUR
	function _redeemFundsToEUR() internal {
		_yieldProtocolInstance.redeem();
		
		uint256 borrowedUSD = _lendingPoolInstance.getBorrowedUSD(address(this));
		if(borrowedUSD > 0){
			_usdInstance.approve(address(_lendingPoolInstance), borrowedUSD);
			_lendingPoolInstance.redeemEUR();
		}

		//Trade lefterover USD (from e.g. yields and) to EUR
		uint256 remainingUSD = _usdInstance.balanceOf(address(this));
		if(remainingUSD > 0){
			_usdInstance.approve(address(_dexInstance), remainingUSD);
			_dexInstance.tradeUSDtoEUR(remainingUSD);
		}
	}

	//Adjusts the client balances propertionally according to the current SCs holdings
	function _distributePnL() internal {
		if(pooledEURDeposits == 0){
			return;
		}

		uint256 eurBalance = _eurInstance.balanceOf(address(this));
		uint256 pnlRatio = eurBalance * 1000000 / pooledEURDeposits;
		
		//No need to do anything
		if(pnlRatio == 1000000){
			return;
		}

		//Distribute PnL to depositors
		for(uint8 i = 0; i < depositors.length; i++){
			Deposit storage entry = balances[depositors[i]];
			entry.eurAmount = entry.eurAmount * pnlRatio / 1000000;
		}
		pooledEURDeposits = pooledEURDeposits * pnlRatio / 1000000;
	}

	//Borrows USD for the entire EUR-balance and places all the USD in the yield protocol
	function _allocateFunds() internal {
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

			_usdInstance.approve(address(_yieldProtocolInstance), idleUsd);
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