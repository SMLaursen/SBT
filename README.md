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

## Core concept
Suppose a EUR based client wants to engage in DeFi protocols to generate yield. Currently, most yield producing protocols rely on USD-based stablecoins, essentially requiring the client to trade his EUR to USD beforehand. This leaves the client exposed to the currencyrisk of the EURUSD exchangerate at the time of withdrawal assuming he didn't constantly maintained an offchain hedge according to the accrued yield. 
 
This PoC demonstrates how to autonomously hedge such risks onchain using a EURUSD lending pool and a DEX, where the idea is to let MRM monitor and rebalance the lending pool to keep its healtfactor constant while ensuring that every USD handled by the yield protocol can be redeemed for EUR. The later point is achieved by using the DEX to trade USD-based yield back to EUR that in turn is used as collateral to borrow USD to place in the yield protocol.

When the client desires to withdraw, first his share of USD in the yield protocol is redeemed to the MRM smart contract, which in turn is used to redeem his share of collateral in the lending pool, which in turn is returned to him. 
 
### Disclaimer
This is just a PoC of how to do this onchain using a lending pool. It's much more cost-efficient to hedge the currency-risk offchain using conventional financial instruments as the lending pools currently doesn't allow undercollateralized loaning options. 

### Alternative onchain solutions
Another way to achieve onchain hedging could be to buy perpetual futures on a DEX that offers greater leverage ratios. Such solution would also require a mechanism to prevent liquidations. Alternatively, to ease the handling around liquidations, we could acquire DOWN / BEAR tokens for the hedge, but they appear to exists with no more than 3X targetted leverage.

## Technical Architecture
The stablecoins, lending pool, DEX and yield protocol has all been mocked to ease the testing. Future work includes integrating to real tokens as well as dex, lending pool and yield protocols.

![Diagram](https://user-images.githubusercontent.com/7354598/130348655-98624f6d-e529-491a-a103-7efe6e183191.png)

### Mocked Tokens
EUR and USD has been mocked as ERC20 tokens, see [MockEUR.sol](https://github.com/SMLaursen/SBT/blob/main/contracts/mocks/MockEUR.sol) and [MockUSD.sol](https://github.com/SMLaursen/SBT/blob/main/contracts/mocks/MockUSD.sol) respectively

### Mocked DEX
A simplified DEX has been mocked, see [MockDEX.sol](https://github.com/SMLaursen/SBT/blob/main/contracts/mocks/MockDEX.sol). This DEX allows trading EUR to USD and vice versa at an exchangerate set by a contract owner's offchain oracle. 

### Mocked Lending Pool
See [MockEURUSDLendingPool.sol](https://github.com/SMLaursen/SBT/blob/main/contracts/mocks/MockEURUSDLendingPool.sol) which is a simplified lending pool, that allows borrowing USD using EUR as collateral and relies on a contract owner's offchain oracle to set the exchangerate. The healtfactor is set to 0.85 where liquidations will happen if the ratio exceeds 0.90 effectively emulating the liquidation fee. Notice if the healtfactor exceeds 1.00, the client will actually profit from being liquidated, as the borrowed value would exceed his collateral value. In this mock theres no incentives for providing liquidity to the pool as well as there is no ongoing interest charged the borrower. 

The 0.85 health/collateral-factor has been synthesized from the following [pool proposal](https://vote.rari.capital/#/rari/proposal/QmNSdAEikbD9cz9wued9xK4ZQMcoCJfP8o4eSJVpvfFTV2)

### Mocked Yield Protocol
See [MockUSDYieldProtocol.sol](https://github.com/SMLaursen/SBT/blob/main/contracts/mocks/MockUSDYieldProtocol.sol) which is a simplified yield protocol used for testing by minting and distributing yield when called from an outside oracle. 

### Market Risk Mitigator
The [MRM contract](https://github.com/SMLaursen/SBT/blob/main/contracts/MarketRiskMitigator.sol) integrates to the Lending Pool, DEX and Yield protocol. It functions by pooling EUR tokens from its clients and placing them in the lending pool as collateral for borrowing USD tokens. The USD tokens are then deposited in a yield protocol to earn interest that is redeemable via the MRM contract. The contract owner's offchain oracle ensure that MRM constantly `check()` whether the healthfactor is more than 3% outside its target range (due to price movements) or whether more than 5% of the USD under management is unredeemable in the lending pool (due to yield or lending pool liquidations removing collateral), and thereby essentially unhedged. If so the MRM contract rebalances it's funds. 

In this rather crude PoC the rebalancing is made by redeeming everything from the yield protocol then repaying the entire loan to get EUR. Any residual USD is also traded to EUR whereafter the EUR is placed anew after registrering the clients individual PnLs. 

Client withdrawals and deposits also triggers full rebalances to ensure the PnL is correctly recorded for the other clients before adjusting the EUR position. 

Notice the rebalancing relies on MRM being able to withdraw from the Yield Protocol, this may not always be the case with e.g. locked staking 

### Example
* Assume EURUSD rate is 1.20
* Client A deposits 1M EUR to MRM
    * MRM borrows 1.02M USD (1M * 1.20 * 0.85) using the EUR as collateral  
    * MRM deposits 1.02M USD in the Yield Protocol
* EURUSD rate changes to 1.22
* Yield Protocol generates 10% yield (1,122,000 USD)
* Offchain oracle calls MRMs check() triggering a rebalnce  
    * MRM redeems the 1,122,000 USD from the yield protocol
    * MRM redeems the 1M EUR using the 1.02M USD
    * MRM trades the remaining 102K USD to 83.6K EUR using the DEX
    * MRM distributes PnL internally (Client A's balance is set to 1,083,600 EUR)
    * MRM borrows 1,123,700M USD (1,083,600 * 1.22 * 0.85) using the EUR as collateral  
    * MRM deposits 1,123,700M USD in the Yield Protocol
* Client A withdraws
    * MRM redeems the 1,123,700M USD from the yield protocol
    * MRM redeems the 1,083,600 EUR using the 1,123,700M USD
    * MRM transfers the 1,083,600 EUR to the clientt

Had the client interacted directly with the DEX and the yield protocol, he would've exchanged his 1M EUR to 1.20M USD (@1.20) - where the 10% yield would bring his balance to 1.32M USD. As at the time of withdrawal the EURUSD exchange rate is 1.22, his 1.32M USD would be worth 1,082,000 EUR.

This example along with many other have been modelled as test-cases in [testMRM.test.js](https://github.com/SMLaursen/SBT/blob/main/test/testMRM.test.js)

## Security
This is no way battletested!
Relying on ERC20 based EUR and USD tokens enforces us to preapprove the relevant transactions and using the Ownable modifier helps in preventing unauthorized access.

## Further work
* Attempt to interact with real 3rd party lending pools, DEXs and yield protocol.
* Take spreads and potential lack of liquidity into consideration when interacting with the DEX
* Model interest rates in the lending pool, and take these into consideration when interacting with it.
* Make support for partial liquidations in the lending pool
* Improve the MRM bookkeeping to only rebalance what's necessary, instead of rebalancing everything
* ...
