// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7 <0.9.0;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import '../interfaces/IYieldProtocol.sol';

contract MockUSDYieldProtocol is IYieldProtocol, Ownable {
	IERC20 _usdInstance;
    
    constructor (IERC20 usdInstance) Ownable(){
		_usdInstance = usdInstance;
	}
}