const MockEUR = artifacts.require('MockEUR');
const MockUSD = artifacts.require('MockUSD');
const MockEURUSDLendingPool = artifacts.require('MockEURUSDLendingPool');
const MockUSDYieldProtocol = artifacts.require('MockUSDYieldProtocol');
const MockDEX = artifacts.require('MockDEX');

const MarketRiskMitigator = artifacts.require('MarketRiskMitigator');

module.exports = async function(deployer, network, accounts) {
    if (network == "development") {
        let MRMOwner = accounts[0];
        let eurOwner = accounts[1];
        let usdOwner = accounts[2];
        let lendingPoolOwner = accounts[3];
        let yieldProtocolOwner = accounts[4];
        let dexOwner = accounts[5];

        let clientAcc = accounts[9];

        await deployer.deploy(MockEUR, {from: eurOwner});
        await deployer.deploy(MockUSD, {from: usdOwner});
        await deployer.deploy(MockEURUSDLendingPool, MockEUR.address, MockUSD.address, {from: lendingPoolOwner}); 
        await deployer.deploy(MockUSDYieldProtocol, MockUSD.address, {from: yieldProtocolOwner}); 
        await deployer.deploy(MockDEX, MockEUR.address, MockUSD.address, {from: dexOwner}); 

        await deployer.deploy(MarketRiskMitigator, MockEUR.address, MockUSD.address, MockEURUSDLendingPool.address, MockUSDYieldProtocol.address, MockDEX.address, {from: MRMOwner});
    } else {
        throw "NOT SUPPORTED!"
    }
    
};