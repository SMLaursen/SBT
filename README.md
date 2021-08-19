# SBT
SBT is a PoC of how to autonomously hedge market risks onchain using a lending pool when engaging in foregin currency denominated yield protocols.

## Motivational Example
Suppose a EUR based client wants to engage in DeFi protocols to generate yield. Currently most yield producing protocols rely on USD-based stablecoins, essentially requiring the client to trade his EUR to USD beforehand. This leaves the client exposed to the currencyrisk of the EURUSD exchangerate at the time of withdrawal.
 
This PoC demonstrates how one can hedge such risks using a lending pool that is constantly rebalanced to reflect the current exchangerate and prevent (costly) liquidations. 

Suppose a clients deposits 1M euro to engage in yield farming, then SBT could use this as collateral to borrow 1.02M USD (assuming an exchange rate of 1.20 and collateralization ratio of 0.85) and put these in a yield farming product. If the rate of EURUSD increases, we borrow additional USD to allocate the yield farming. If the rate of EURUSD decreases, we redeem some of the USD to EUR collateral, to ensure we don't lose our liquidity in the lending pool. Any yield is immediatly traded to EUR and put through the same process.

When the client desires to withdraw, we first redeem his share of USD in the yield protocol which in turn is used retreive his collateral in the lending pool. 

## Technical Architecture
The stablecoins, lending pool and yield protocol has all been mocked to ease the testing. Future work includes integrating to real lending and yield protocols.

### SBT
The SBT contract pools EUR tokens from its clients and uses them for collateral in the lending pool to retrieve USD tokens. The USD tokens are then deposited in a yield protocol to earn interest which is redeemable by the SBTToken holders. When ever the EURUSD rate has moved 5% or sufficient interest has been accrued, an offchain oracle ensures that SBT rebalances its deposits in the lending pool to both avoid costly liquidations when the EURUSD rate falls and to increase the USD deposited in the yield protocol when the EURUSD rate increases.  

### Tokens
EUR and USD has been mocked as ERC20 tokens, see MockEUR.sol and MockUSD.sol respectively

### Lending Pool
See MockEURUSDLendingPool.sol which is a simplified lending pool, that allows borrowing USD using EUR and relies on offchain oracles to set the exchangerate.
The utilization ratio is set to 0.85 where liquidations will happen if the ratio exceeds 0.95 bringing it back to 0.85. In this mock theres no incentives for providing liquidity to the pool as well as there is no ongoing interest charged the borrower.

### Yield Protocol
See MockUSDYieldProtocol.sol which is a simplified yield protocol used for testing by minting and distributing yield when called from an outside oracle.

## Installation
To retrieve dependencies 
```
npm install
```

## Testing using ganache
Fire up ganache using :
```
ganache-cli
```
Whereafter the test-suite can be executed using
```
truffle test
```
