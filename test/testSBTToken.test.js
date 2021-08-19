const MockEUR = artifacts.require('MockEUR');
const MockUSD = artifacts.require('MockUSD');
const MockEURUSDLendingPool = artifacts.require('MockEURUSDLendingPool');
const MockUSDYieldProtocol = artifacts.require('MockUSDYieldProtocol');

const SBTToken = artifacts.require('SBTToken');

const BNify = (n, d) => web3.utils.toBN(n).mul(web3.utils.toBN(10).pow(web3.utils.toBN(d)));

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

        //Lets put 1M EUR token in the clientAcc 
        mockEURInstance.mint(BNify(1_000_000, 18), {from: clientAcc});

        //Mint 500K usd in USD's owner address
        mockUSDInstance.mint(BNify(500_000, 18), {from: usdOwner});

        //Transfer 250K USD to lendingPool
        mockUSDInstance.approve(mockEURUSDLendingPoolInstance.address, BNify(250_000, 18), {from: usdOwner});
        mockUSDInstance.transfer(mockEURUSDLendingPoolInstance.address, BNify(250_000, 18), {from: usdOwner});
    });

    describe("Tests initial balances", async () => {
        it("Verifies the initial client-euro-balance", async () => {
            let clientEurBalance = await mockEURInstance.balanceOf(clientAcc);
            assert(BNify(1_000_000, 18).eq(clientEurBalance), "The balance was "+clientEurBalance);
        });

        it("Verifies the initial usdOwner-usd-balance", async () => {
            let usdOwnerBalance = await mockUSDInstance.balanceOf(usdOwner);
            assert(BNify(250_000, 18).eq(usdOwnerBalance), "The balance was "+usdOwnerBalance);
        });

        it("Verifies the initial lending-pool-usd-balance", async () => {
            let lendingPoolUSDBalance = await mockUSDInstance.balanceOf(mockEURUSDLendingPoolInstance.address);
            assert(BNify(250_000, 18).eq(lendingPoolUSDBalance), "The balance was "+lendingPoolUSDBalance);
        });
    });

    describe("Tests client deposits", async () => {
        it("Verifies the client can deposit EUR to SBT and receives SBT tokens back", async () => {
            let clientSBTBalance = await sbtInstance.balanceOf(clientAcc);
            assert(BNify(0, 18).eq(clientSBTBalance), "The balance was "+clientSBTBalance);

            await mockEURInstance.approve(sbtInstance.address, BNify(400_000, 18), {from: clientAcc});
            await sbtInstance.depositEUR(BNify(400_000, 18), {from: clientAcc});

            let clientEurBalance = await mockEURInstance.balanceOf(clientAcc);
            assert(BNify(600_000, 18).eq(clientEurBalance), "The balance was "+clientEurBalance);

            clientSBTBalance = await sbtInstance.balanceOf(clientAcc);
            assert(BNify(400_000, 18).eq(clientSBTBalance), "The balance was "+clientSBTBalance);

        });
    });

    describe("Test lending pool", async () => {
        it("Verifies the client can borrow USD using EUR as collateral", async () => {
            clientEurBalance = await mockEURInstance.balanceOf(clientAcc);
            assert(BNify(600_000, 18).eq(clientEurBalance), "The balance was "+clientEurBalance); 
            clientUsdBalance = await mockUSDInstance.balanceOf(clientAcc);
            assert(BNify(0, 18).eq(clientUsdBalance), "The balance was "+clientUsdBalance);

            await mockEURInstance.approve(mockEURUSDLendingPoolInstance.address, BNify(200000, 18), {from: clientAcc});
            await mockEURUSDLendingPoolInstance.borrowUSD(BNify(200000, 18), {from: clientAcc});
            
            clientEurBalance = await mockEURInstance.balanceOf(clientAcc);
            assert(BNify(400_000, 18).eq(clientEurBalance), "The balance was "+clientEurBalance);

            //200K EUR * 1.2 (EURUSD) * 0.85 (CollateralRatio) = 204K USD
            clientUsdBalance = await mockUSDInstance.balanceOf(clientAcc);
            assert(BNify(204_000, 18).eq(clientUsdBalance), "The balance was "+clientUsdBalance);
        });

        it("Verfies the clients utilization correctly reflects the exchange rate", async () => {
            //verify the reported utilization for the client is ~85%
            let util = await mockEURUSDLendingPoolInstance.getUtilization({from: clientAcc});
            assert.equal(85, util.toNumber())

            await mockEURUSDLendingPoolInstance.setEURUSDExchangeRate(BNify(130, 8), {from: lendingPoolOwner})

            //204K USD * 1/1.3 => 156.9K EUR worth ~ 156.9/200 ~ 78%
            util = await mockEURUSDLendingPoolInstance.getUtilization({from: clientAcc});
            assert.equal(78, util.toNumber())

            await mockEURUSDLendingPoolInstance.setEURUSDExchangeRate(BNify(110, 8), {from: lendingPoolOwner})

            //204K USD * 1/1.1 => 185K EUR worth ~ 185/200 ~ 92.5%
            util = await mockEURUSDLendingPoolInstance.getUtilization({from: clientAcc});
            assert.equal(92, util.toNumber())

            await mockEURUSDLendingPoolInstance.setEURUSDExchangeRate(BNify(100, 8), {from: lendingPoolOwner})

            //204K USD * 1/1.0 => 204K EUR worth ~ 204/200 ~ 102% (insolvent: TODO STOPOUT would prevent this)
            util = await mockEURUSDLendingPoolInstance.getUtilization({from: clientAcc});
            assert.equal(102, util.toNumber())
        });

  

    });

});