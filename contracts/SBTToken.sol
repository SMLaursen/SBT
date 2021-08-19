// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7 <0.9.0;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import './interfaces/ILendingPool.sol';
import './interfaces/IYieldProtocol.sol';

contract SBTToken is ERC20, Ownable {
    IERC20 _eurInstance;
	IERC20 _usdInstance;

	ILendingPool _lendingPoolInstance;
	IYieldProtocol _yieldProtocolInstance;

	constructor (IERC20 eurInstance, IERC20 usdInstance, ILendingPool lendingPool, IYieldProtocol YieldProtocol) ERC20("SBTToken", "SBT") Ownable(){
		_eurInstance = eurInstance; 
		_usdInstance = usdInstance;
		_lendingPoolInstance = lendingPool;
		_yieldProtocolInstance = YieldProtocol;
	}

	function depositEUR(uint256 _amount) external {
		//Depositer needs to have this transfer approved
		_eurInstance.transferFrom(msg.sender, address(this), _amount);

		_mint(msg.sender, _getSBTAmount(_amount));

		_rebalance();
	}

	//TODO
	function withdrawEUR(uint256 _amount) external {
		_burn(msg.sender, _amount);

		//TODO figure out how to approve this transfer on behalf of the smart contract
		_eurInstance.transferFrom(address(this), msg.sender, _getEURAmount(_amount));

		_rebalance();
	}

	function check() external onlyOwner {
		
	}

	function _rebalance() internal {

	}

	function _getSBTAmount(uint256 _eurAmount) internal pure returns (uint256){
		return _eurAmount;
	}

	function _getEURAmount(uint256 _sbtAmount) internal pure returns (uint256){
		return _sbtAmount;
	}

	function getEURBalance() public view returns (uint256){
		return _eurInstance.balanceOf(address(this));
	}

	function getUSDBalance() public view returns (uint256){
		return _usdInstance.balanceOf(address(this));
	}

}