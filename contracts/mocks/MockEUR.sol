// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7 <0.9.0;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract MockEUR is ERC20 {
    constructor() ERC20("MockEURToken", "EUR"){
       
    }

    function mint(uint256 amount) external{
        _mint(msg.sender, amount);
    }

    function burn(uint256 amount) external{
        _burn(msg.sender, amount);
    }
}