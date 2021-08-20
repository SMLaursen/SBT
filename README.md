# MRM
MRM is a PoC of how to autonomously hedge market risks onchain using a lending pool and a DEX when engaging in foregin currency denominated yield protocols.

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

This has been verified using 
* Truffle v5.4.6
* Ganache CLI v6.12.2 (ganache-core: 2.13.2)

## Motivational Example
Suppose a EUR based client wants to engage in DeFi protocols to generate yield. Currently most yield producing protocols rely on USD-based stablecoins, essentially requiring the client to trade his EUR to USD beforehand. This leaves the client exposed to the currencyrisk of the EURUSD exchangerate at the time of withdrawal.
 
This PoC demonstrates how one can hedge such risks using a lending pool that is constantly rebalanced to reflect the current exchangerate and prevent (costly) liquidations. 

Suppose a clients deposits 1M euro to engage in yield farming, then MRM could use this as collateral to borrow 1.02M USD (assuming an exchange rate of 1.20 and collateralization ratio of 0.85) and put these in a yield farming product. If the rate of EURUSD increases, we borrow additional USD to allocate the yield farming. If the rate of EURUSD decreases, we redeem some of the USD to EUR collateral, to ensure we don't lose our liquidity in the lending pool due to liquidations. Any yield is immediatly traded to EUR via a DEX and put through the same process.

When the client desires to withdraw, we first redeem his share of USD in the yield protocol which in turn is used retreive his collateral in the lending pool. 

### Disclaimer
This is just a PoC of how to do this onchain using a lending pool. It's much more cost-efficient to hedge the currency-risk offchain using conventional financial instruments as the lending pools currently doesn't allow undercollateralized loaning options. 

### Alternative onchain solutions
Another interesting idea to pursue is to buy perpetual futures on a DEX that offers greater leverage ratios - but that will still require us to handle liquidations due to the lack of the possibility of cross-margining it with our position. Another alternative could be to acquire DOWN / BEAR tokens for the hedge, but they only exists with 3X (targetted) leverage ratios.

## Technical Architecture
The stablecoins, lending pool, DEX and yield protocol has all been mocked to ease the testing. Future work includes integrating to real tokens as well as dex, lending pool and yield protocols.

### MRM
The MRM contract pools EUR tokens from its clients and uses them for collateral in the lending pool to retrieve USD tokens. The USD tokens are then deposited in a yield protocol to earn interest which is redeemable via the MRM contract. When ever the EURUSD rate has moved 5% or sufficient interest has been accrued, an offchain oracle ensures that MRM rebalances its deposits in the lending pool to both avoid liquidations when the EURUSD rate falls and to increase the USD deposited in the yield protocol when the EURUSD rate increases.   

### Tokens
EUR and USD has been mocked as ERC20 tokens, see MockEUR.sol and MockUSD.sol respectively

### Lending Pool
See MockEURUSDLendingPool.sol which is a simplified lending pool, that allows borrowing USD using EUR and relies on offchain oracles to set the exchangerate.
The utilization ratio is set to 0.85 where liquidations will happen if the ratio exceeds 0.90 effectively allowing the pool to keep the remaining 10% collateral as a fee. Notice if the utilization exceeds 1.00, the client will actually profit from being liquidated. In this mock theres no incentives for providing liquidity to the pool as well as there is no ongoing interest charged the borrower.

### Yield Protocol
See MockUSDYieldProtocol.sol which is a simplified yield protocol used for testing by minting and distributing yield when called from an outside oracle.

### DEX
See MockDEX.sol which is a simplified DEX allowing one to trade EUR/USD

### Oracles
* MRM relies on an oracle to invoke the `check()` function cyclically to rebalance when appropiate. This check method receives the utilization from the LendingPool instance and the accrued interest from the YieldProtocol.

* DEX relies on an oracle to set the exchange rate for the swaps

* LendingPool relies on an oracle to set the exchange rate used for calculating utilization.   

* YieldProtocol relies on an oracle to model the interest

## Security
This is no way battletested!
Relying on ERC20 based EUR and USD tokens enforces us to preapprove the relevant transactions and using the Ownable modifier helps in preventing unauthorized access.

