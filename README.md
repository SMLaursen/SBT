# SBT
SBT is a PoC of how to hedge the currency exposure onchain using a lending pool for EUR based clients wishing to interact with USD based yield protocols.

## Architecture

### SBT
The SBT contract pools EUR tokens from its clients and uses them for collateral in the lending pool to retrieve USD tokens. The USD tokens are then deposited in a yield protocol to earn interest which is redeemable by the SBTToken holders. When ever the EURUSD rate has moved 5% or sufficient interest has been accrued, an offchain oracle ensures that SBT rebalances its deposits in the lending pool to both avoid costly liquidations when the EURUSD rate falls and to increase the USD deposited in the yield protocol when the EURUSD rate increases.  

### Tokens
EUR and USD has been mocked as ERC20 tokens, see MockEUR.sol and MockUSD.sol respectively

### Lending Pool
See MockEURUSDLendingPool.sol which is a simplified lending pool, that allows borrowing USD using EUR and relies on offchain oracles to set the exchangerate.
The utilization ratio is set to 0.85 where liquidations will happen if the ratio exceeds 0.95 bringing it back to 0.85. In this mock theres no incentives for providing liquidity to the pool as well as there is no ongoing interest charged the borrower.

### Yield Protocol
See MockUSDYieldProtocol.sol

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
