const MockEUR = artifacts.require('MockEUR');
const MockUSD = artifacts.require('MockEUR');
const MockEURUSDLendingPool = artifacts.require('MockEURUSDLendingPool');
const MockUSDYieldProtocol = artifacts.require('MockUSDYieldProtocol');

const SBTToken = artifacts.require('SBTToken');

const BNify = n => new BN(String(n));

module.exports = async function(deployer, network, accounts) {
    if (network == "development") {
        let SBTOwner = accounts[0];
        let eurOwner = accounts[1];
        let usdOwner = accounts[2];
        let lendingPoolOwner = accounts[3];
        let yieldProtocolOwner = accounts[4];

        let clientAcc = accounts[9];

        await deployer.deploy(MockEUR, {from: eurOwner});
        await deployer.deploy(MockUSD, {from: usdOwner});
        await deployer.deploy(MockEURUSDLendingPool, MockEUR.address, MockUSD.address, {from: lendingPoolOwner}); 
        await deployer.deploy(MockUSDYieldProtocol, MockUSD.address, {from: yieldProtocolOwner}); 
    
        await deployer.deploy(SBTToken, MockEUR.address, MockUSD.address, MockEURUSDLendingPool.address, MockUSDYieldProtocol.address, {from: SBTOwner});
    } else {
        throw "NOT SUPPORTED!"
    }
    
};