// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7 <0.9.0;

interface IYieldProtocol {

    /** Deposits funds for yield farming */
    function deposit(uint256 usdAmount) external;
    
    /** Redeems the pool share of liqudity for yield farming */
    function redeem() external;

    /** Retrieves the redeemable amount */
    function balanceOf(address adr) external view returns (uint256);
}