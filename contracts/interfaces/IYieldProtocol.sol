// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7 <0.9.0;

interface IYieldProtocol {

    function deposit(uint256 usdAmount) external;
    
    function redeem() external;

    function balanceOf(address adr) external view returns (uint256);
}