// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7 <0.9.0;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import '../interfaces/ILendingPool.sol';

contract MockEURUSDLendingPool is ILendingPool, Ownable {
    IERC20 private _eurInstance;
	IERC20 private _usdInstance;

	//1.20
	uint256 private exchangeRateEURUSD = 120 * 10**8;

	uint8 private collateralRatio = 85; //The collateral ratio
	uint8 private liquidationRatio = 95; //The liquidation ratio
	uint8 private liquidationPenalty = 10; //10% collateral as fee on a liquidation

	struct Loan {
		uint8 index;
		uint256 eurCollateral;
		uint256 borrowedUSDAmount;
	}

	mapping(address => Loan) internal loans;
	address[] internal borrowers;

    constructor (IERC20 eurInstance, IERC20 usdInstance) Ownable(){
		_eurInstance = eurInstance; 
		_usdInstance = usdInstance;
	}

 	function setEURUSDExchangeRate(uint256 exchangeRate) external override onlyOwner{
        exchangeRateEURUSD = exchangeRate;
		_checkLiquidations();
    }

	function borrowUSD(uint256 eurAmount) external override  {
		Loan memory entry = loans[msg.sender];
		require(entry.borrowedUSDAmount == 0, "You already have a loan");
		_eurInstance.transferFrom(msg.sender, address(this), eurAmount);

		uint256 usdAmount = eurAmount * exchangeRateEURUSD / 10**10 * collateralRatio / 100;

		_usdInstance.approve(address(this), usdAmount);
		_usdInstance.transfer(msg.sender, usdAmount);

		_setLoan(msg.sender, eurAmount, usdAmount);
	}

	function redeemEUR() external override  {
		Loan memory entry = loans[msg.sender];
		require(entry.borrowedUSDAmount > 0, "You don't have any loans");

		uint256 usdAmount = entry.borrowedUSDAmount;
		uint256 eurAmount = entry.eurCollateral;

		_usdInstance.transferFrom(msg.sender, address(this), usdAmount);

		_eurInstance.approve(address(this), eurAmount);
		_eurInstance.transfer(msg.sender, eurAmount);

		_setLoan(msg.sender, 0, 0);
	}

	function getUtilization(address adr) external override view returns (uint8) {
		return _getUtilization(adr);
	}

    function getBorrowedUSD(address adr) external override view returns (uint256) {
		return _getBorrowedValueUSD(adr);
	}

    function getCollateralizedEUR(address adr) external override view returns (uint256) {
		return _getCollateralValueEUR(adr);
	}

	//Internal helper functions : 
	function _setLoan(address _address, uint256 _eurCollateral, uint256 _usdBorrowed) internal {
		Loan storage entry = loans[_address];
		entry.eurCollateral = _eurCollateral;
		entry.borrowedUSDAmount = _usdBorrowed;
		if(entry.index > 0){
			// entry exists : do nothing
			return;
		} else {
			borrowers.push(_address);
			uint8 borrowersIndex = uint8(borrowers.length - 1);
			entry.index = borrowersIndex + 1;
		}
	}
	
	/** liquidates positions that have exceeded the liquidation ratio. 
	  	A liquidation removes the redemmable collateral back to the collateral ratio + a liquidation penalty and sets the redeemable USD amount accordingly.
	  */
	function _checkLiquidations() internal onlyOwner {
		for(uint8 i=0; i < borrowers.length; i++ ){
			address adr = borrowers[i];
			if(_getUtilization(adr) > liquidationRatio){
				uint8 liquidation = _getUtilization(adr) - collateralRatio + liquidationPenalty;
				Loan storage entry = loans[adr];
				entry.eurCollateral = entry.eurCollateral - (entry.eurCollateral * liquidation / 100);
				uint256 borrowedUSDAmountBefore = entry.borrowedUSDAmount;
				entry.borrowedUSDAmount = entry.eurCollateral * exchangeRateEURUSD / 10**10 * collateralRatio / 100;

				require(_getUtilization(adr) <= liquidationRatio, "Sanity error - liqudation should've reduced the utilization!");
				require(borrowedUSDAmountBefore > entry.borrowedUSDAmount, "Sanity error - the redeemable USD amount should've been reduced!");
			}
		}
	}

	function _getUtilization(address adr) internal view returns (uint8) {
		uint256 collateral = _getCollateralValueUSD(adr);
		if(collateral == 0){
			require(_getBorrowedValueUSD(adr) == 0, "Sanity Error - no collateral but borrowed amount");
			return 0;
		}
		return uint8(_getBorrowedValueUSD(adr) * 100 / collateral); 
	}

	function _getBorrowedValueUSD(address adr) internal view returns (uint256) {
		return loans[adr].borrowedUSDAmount;
	}

	function _getBorrowedValueEUR(address adr) internal view returns (uint256) {
		return loans[adr].borrowedUSDAmount * 10**10 / exchangeRateEURUSD;
	}

	function _getCollateralValueUSD(address adr) internal view returns (uint256) {
		return loans[adr].eurCollateral * exchangeRateEURUSD / 10**10;
	}

	function _getCollateralValueEUR(address adr) internal view returns (uint256) {
		return loans[adr].eurCollateral;
	}

} 