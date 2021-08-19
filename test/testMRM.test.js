const MockEUR = artifacts.require('MockEUR');
const MockUSD = artifacts.require('MockUSD');
const MarketRiskMitigator = artifacts.require('MarketRiskMitigator');

const BNify = (n, d) => web3.utils.toBN(n).mul(web3.utils.toBN(10).pow(web3.utils.toBN(d)));

contract("MarketRiskMitigator", (accounts) => {
    let mrmInstance;
    let mockEURInstance;
    let mockUSDInstance;

    let mrmOwner = accounts[0];
    let usdOwner = accounts[2];

    let clientAcc = accounts[9];

    before(async () => {
        mrmInstance = await MarketRiskMitigator.deployed(); 
        mockEURInstance = await MockEUR.deployed();
        mockUSDInstance = await MockUSD.deployed();

        //Lets put 1M EUR token in the clientAcc 
        mockEURInstance.mint(BNify(1_000_000, 18), {from: clientAcc});

        //Mint 500K usd in USD's owner address
        mockUSDInstance.mint(BNify(500_000, 18), {from: usdOwner});
    });

    describe("Tests initial balances", async () => {
        it("Verifies the initial client-euro-balance", async () => {
            let clientEurBalance = await mockEURInstance.balanceOf(clientAcc);
            assert(BNify(1_000_000, 18).eq(clientEurBalance), "The balance was "+clientEurBalance);
        });

        it("Verifies the initial usdOwner-usd-balance", async () => {
            let usdOwnerBalance = await mockUSDInstance.balanceOf(usdOwner);
            assert(BNify(500_000, 18).eq(usdOwnerBalance), "The balance was "+usdOwnerBalance);
        });
    });
});