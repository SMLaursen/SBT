const MockEUR = artifacts.require('MockEUR');
const MockUSD = artifacts.require('MockUSD');
const MockEURUSDLendingPool = artifacts.require('MockEURUSDLendingPool');
const MockUSDYieldProtocol = artifacts.require('MockUSDYieldProtocol');

const SBTToken = artifacts.require('SBTToken');

contract("SBTToken", (accounts) => {
    let sbtInstance;
    let mockEURInstance;
    let mockUSDInstance;
    let mockEURUSDLendingPoolInstance;

    let SBTOwner = accounts[0];
    let eurOwner = accounts[1];
    let usdOwner = accounts[2];
    let lendingPoolOwner = accounts[3];
    let yieldProtocolOwner = accounts[4];

    let clientAcc = accounts[9];

    before(async () => {
        sbtInstance = await SBTToken.deployed(); 
        mockEURInstance = await MockEUR.deployed();
        mockUSDInstance = await MockUSD.deployed();
        mockEURUSDLendingPoolInstance = await MockEURUSDLendingPool.deployed();

        //Lets put 100K EUR token in the clientAcc 
        mockEURInstance.mint(web3.utils.toBN("10000000000000000000000"), {from: clientAcc});

        //Mint 500K usd in USD's owner address
        mockUSDInstance.mint(web3.utils.toBN("5000000000000000000000"), {from: usdOwner});

        //Transfer 250K USD to lendingPool
        mockUSDInstance.approve(mockEURUSDLendingPoolInstance.address, web3.utils.toBN("2500000000000000000000"), {from: usdOwner});
        mockUSDInstance.transfer(mockEURUSDLendingPoolInstance.address, web3.utils.toBN("2500000000000000000000"), {from: usdOwner});
    });

    describe("Tests initial balances", async () => {
        it("Verifies the initial client-euro-balance", async () => {
            let clientEurBalance = await mockEURInstance.balanceOf(clientAcc);
            assert(web3.utils.toBN("10000000000000000000000").eq(clientEurBalance), "The balance was "+clientEurBalance);
        });

        it("Verifies the initial usdOwner-usd-balance", async () => {
            let usdOwnerBalance = await mockUSDInstance.balanceOf(usdOwner);
            assert(web3.utils.toBN("2500000000000000000000").eq(usdOwnerBalance), "The balance was "+usdOwnerBalance);
        });

        it("Verifies the initial lending-pool-usd-balance", async () => {
            let lendingPoolUSDBalance = await mockUSDInstance.balanceOf(mockEURUSDLendingPoolInstance.address);
            assert(web3.utils.toBN("2500000000000000000000").eq(lendingPoolUSDBalance), "The balance was "+lendingPoolUSDBalance);
        });
    });

    describe("Tests client deposits", async () => {
        it("Verifies the client can deposit EUR to SBT and receives SBT tokens back", async () => {
            let clientSBTBalance = await sbtInstance.balanceOf(clientAcc);
            assert(web3.utils.toBN("0").eq(clientSBTBalance), "The balance was "+clientSBTBalance);

            await mockEURInstance.approve(sbtInstance.address, web3.utils.toBN("4000000000000000000000"), {from: clientAcc});
            await sbtInstance.depositEUR(web3.utils.toBN("4000000000000000000000"), {from: clientAcc});

            let clientEurBalance = await mockEURInstance.balanceOf(clientAcc);
            assert(web3.utils.toBN("6000000000000000000000").eq(clientEurBalance), "The balance was "+clientEurBalance);

            clientSBTBalance = await sbtInstance.balanceOf(clientAcc);
            assert(web3.utils.toBN("4000000000000000000000").eq(clientSBTBalance), "The balance was "+clientSBTBalance);

        });
    });

    describe("Test lending pool", async () => {
        it("Verifies the client can borrow USD using EUR as collateral", async () => {
            clientEurBalance = await mockEURInstance.balanceOf(clientAcc);
            assert(web3.utils.toBN("6000000000000000000000").eq(clientEurBalance), "The balance was "+clientEurBalance); 
            clientUsdBalance = await mockUSDInstance.balanceOf(clientAcc);
            assert(web3.utils.toBN("0").eq(clientUsdBalance), "The balance was "+clientUsdBalance);

            await mockEURInstance.approve(mockEURUSDLendingPoolInstance.address, web3.utils.toBN("2000000000000000000000"), {from: clientAcc});
            await mockEURUSDLendingPoolInstance.borrowUSD(web3.utils.toBN("2000000000000000000000"), {from: clientAcc});
            
            clientEurBalance = await mockEURInstance.balanceOf(clientAcc);
            assert(web3.utils.toBN("4000000000000000000000").eq(clientEurBalance), "The balance was "+clientEurBalance);

            //200K EUR * 1.2 (EURUSD) * 0.85 (CollateralRatio) = 204K USD
            clientUsdBalance = await mockUSDInstance.balanceOf(clientAcc);
            assert(web3.utils.toBN("2040000000000000000000").eq(clientUsdBalance), "The balance was "+clientUsdBalance);

            //verify the reported utilization for the client is ~85%
            let util = await mockEURUSDLendingPoolInstance.getUtilization({from: clientAcc});
            assert.equal(85, util.toNumber());

        });
    });
});