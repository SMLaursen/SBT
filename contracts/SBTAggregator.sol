// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import '@openzeppelin/contracts/access/Ownable.sol';

contract SBTAggregator is Ownable {
    //TODO to/from respectively is redundant
    event Deposited(address indexed _from, address indexed _to, uint _value);
    event Withdrawn(address indexed _from, address indexed _to, uint _value);
    event ReportYield();

    //The amount locked up in external contracts
    uint256 private unrealizedBalance = 0;

    receive() external payable {
        emit Deposited(msg.sender, address(this), msg.value);
    }

    function withdraw(uint _amount) external onlyOwner {
        require(getBalance() >= _amount, "Insufficient funds");

        //If we have enough idle liquidity, we just withdraw. Else we'll need to pull sufficient funds from the protocols first
        if(address(this).balance >= _amount){
            payable(msg.sender).transfer(_amount);
        } else {
            //TODO pull funds from external protocols. Fail if not possible
            revert();
        }
        emit Withdrawn(address(this), msg.sender, _amount);
    }

    function getBalance() public view returns(uint256){
        return address(this).balance + unrealizedBalance;
    } 
}