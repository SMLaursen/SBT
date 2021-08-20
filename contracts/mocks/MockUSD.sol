// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7 <0.9.0;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

//MockedUSD token that can be minted and burned at will
contract MockUSD is ERC20 {
    constructor() ERC20("MockUSDToken", "USD"){
       
    }

    function mint(uint256 amount) external{
        _mint(msg.sender, amount);
    }

    function burn(uint256 amount) external{
        _burn(msg.sender, amount);
    }
}