const MockEUR = artifacts.require('MockEUR');
const MockUSD = artifacts.require('MockUSD');

const MockDEX = artifacts.require('MockDEX');
const MockEURUSDLendingPool = artifacts.require('MockEURUSDLendingPool');
const MockUSDYieldProtocol = artifacts.require('MockUSDYieldProtocol');


const MarketRiskMitigator = artifacts.require('MarketRiskMitigator');

const BNify = (n, d) => web3.utils.toBN(n).mul(web3.utils.toBN(10).pow(web3.utils.toBN(d)));

contract("MarketRiskMitigator", (accounts) => {
    let mrmInstance;
    let mockEURInstance;
    let mockUSDInstance;
    let dexInstance;
    let mockEURUSDLendingPoolInstance;
    let mockUSDYieldProtocolInstance;

    let mrmOwner = accounts[0];
    let eurOwner = accounts[1];
    let usdOwner = accounts[2];
    let yieldProtocolOwner = accounts[4];

    let clientAcc = accounts[9];

    before(async () => {
        mrmInstance = await MarketRiskMitigator.deployed(); 
        mockEURInstance = await MockEUR.deployed();
        mockUSDInstance = await MockUSD.deployed();
        dexInstance = await MockDEX.deployed();
        mockEURUSDLendingPoolInstance = await MockEURUSDLendingPool.deployed();
        mockUSDYieldProtocolInstance = await MockUSDYieldProtocol.deployed();

        //Lets put 1M EUR token in the clientAcc 
        await mockEURInstance.mint(BNify(1_000_000, 18), {from: clientAcc});

        //Bootstrap the DEX with 1M EUR and USD tokens 
        await mockUSDInstance.mint(BNify(1_000_000, 18), {from: usdOwner});
        await mockUSDInstance.approve(dexInstance.address, BNify(1_000_000, 18), {from: usdOwner});
        await mockUSDInstance.transfer(dexInstance.address, BNify(1_000_000, 18), {from: usdOwner});

        await mockEURInstance.mint(BNify(1_000_000, 18), {from: eurOwner});
        await mockEURInstance.approve(dexInstance.address, BNify(1_000_000, 18), {from: eurOwner});
        await mockEURInstance.transfer(dexInstance.address, BNify(1_000_000, 18), {from: eurOwner});

        //Bootstrap the Lending Pool with 2M USD 
        await mockUSDInstance.mint(BNify(2_000_000, 18), {from: usdOwner});
        await mockUSDInstance.approve(mockEURUSDLendingPoolInstance.address, BNify(2_000_000, 18), {from: usdOwner});
        await mockUSDInstance.transfer(mockEURUSDLendingPoolInstance.address, BNify(2_000_000, 18), {from: usdOwner});
    });

    describe("Verifies the MRM", async () => {
        it("Verifies the inital balances", async () => {
            let clientEurBalance = await mockEURInstance.balanceOf(clientAcc);
            assert(BNify(1_000_000, 18).eq(clientEurBalance), "The balance was "+clientEurBalance);

            let dexUSDBalance = await mockUSDInstance.balanceOf(dexInstance.address)
            assert(BNify(1_000_000, 18).eq(dexUSDBalance));

            let dexEURBalance = await mockEURInstance.balanceOf(dexInstance.address)
            assert(BNify(1_000_000, 18).eq(dexEURBalance));
            
            let lendingPoolUSDBalance = await mockUSDInstance.balanceOf(mockEURUSDLendingPoolInstance.address)
            assert(BNify(2_000_000, 18).eq(lendingPoolUSDBalance));
        });

        it("Verifies the client can deposit to MRM", async () => {
            await mockEURInstance.approve(mrmInstance.address, BNify(1_000_000, 18), {from: clientAcc});
            await mrmInstance.depositEUR(BNify(1_000_000, 18), {from: clientAcc});

            let clientEurBalance = await mockEURInstance.balanceOf(clientAcc);
            assert(BNify(0, 18).eq(clientEurBalance), "The balance was "+clientEurBalance);
        });

        it("Verifies that yield can be redeemed by the client", async () => {
            await mockUSDYieldProtocolInstance.generateYield(10, {from: yieldProtocolOwner});

            await mrmInstance.redeemEUR({from: clientAcc});

            //10% yield = 85K due to 15% of the funds being allocated the hedge
            let clientEurBalance = await mockEURInstance.balanceOf(clientAcc);
            assert(BNify(1_085_000, 18).eq(clientEurBalance), "The balance was "+clientEurBalance);
        });
    });

});