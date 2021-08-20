const MockEUR = artifacts.require('MockEUR');
const MockUSD = artifacts.require('MockUSD');
const MockEURUSDLendingPool = artifacts.require('MockEURUSDLendingPool');

const BNify = (n, d) => web3.utils.toBN(n).mul(web3.utils.toBN(10).pow(web3.utils.toBN(d)));

contract("MockEURUSDLendingPool", (accounts) => {
    let mockEURInstance;
    let mockUSDInstance;
    let mockEURUSDLendingPoolInstance;

    let usdOwner = accounts[2];
    let lendingPoolOwner = accounts[3];

    let clientAcc = accounts[9];

    before(async () => {
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
    
    describe("Test lending pool", async () => {
        it("Verifies the client can borrow USD using EUR as collateral", async () => {
            clientEurBalance = await mockEURInstance.balanceOf(clientAcc);
            assert(BNify(1_000_000, 18).eq(clientEurBalance), "The balance was "+clientEurBalance); 
            clientUsdBalance = await mockUSDInstance.balanceOf(clientAcc);
            assert(BNify(0, 18).eq(clientUsdBalance), "The balance was "+clientUsdBalance);

            await mockEURInstance.approve(mockEURUSDLendingPoolInstance.address, BNify(200000, 18), {from: clientAcc});
            await mockEURUSDLendingPoolInstance.borrowUSD(BNify(200000, 18), {from: clientAcc});
            
            clientEurBalance = await mockEURInstance.balanceOf(clientAcc);
            assert(BNify(800_000, 18).eq(clientEurBalance), "The balance was "+clientEurBalance);

            //200K EUR * 1.2 (EURUSD) * 0.85 (CollateralRatio) = 204K USD
            clientUsdBalance = await mockUSDInstance.balanceOf(clientAcc);
            assert(BNify(204_000, 18).eq(clientUsdBalance), "The balance was "+clientUsdBalance);
        });

        it("Verfies the clients utilization correctly reflects the exchange rate", async () => {
            //verify the reported utilization for the client is ~85%
            let util = await mockEURUSDLendingPoolInstance.getUtilization(clientAcc);
            assert.equal(85, util.toNumber())

            await mockEURUSDLendingPoolInstance.setEURUSDExchangeRate(BNify(130, 8), {from: lendingPoolOwner})

            //204K USD * 1/1.3 => 156.9K EUR worth ~ 156.9/200 ~ 78%
            util = await mockEURUSDLendingPoolInstance.getUtilization(clientAcc);
            assert.equal(78, util.toNumber())

            await mockEURUSDLendingPoolInstance.setEURUSDExchangeRate(BNify(115, 8), {from: lendingPoolOwner})

            //204K USD * 1/1.15 => 177K EUR worth ~ 177/200 ~ 88.5%
            util = await mockEURUSDLendingPoolInstance.getUtilization(clientAcc);
            assert.equal(88, util.toNumber())
        });

        it("Verfies that liquidations reduce positions correctly", async () => {
            //Trigger a liquidation
            await mockEURUSDLendingPoolInstance.setEURUSDExchangeRate(BNify(100, 8), {from: lendingPoolOwner})

            //204K USD * 1/1.1 => 185K EUR worth ~ 185/200 ~ 92.5% so a liquidation should happen
            let usdReedemable = await mockEURUSDLendingPoolInstance.getBorrowedUSD(clientAcc);
            assert(BNify(0, 18).eq(usdReedemable), "Was "+usdReedemable);

            //But it shouldn't affect the clients current holdings (meaning he have lost ~15K EUR)
            clientUsdBalance = await mockUSDInstance.balanceOf(clientAcc);
            assert(BNify(204_000, 18).eq(clientUsdBalance), "The balance was "+clientUsdBalance);
            clientEurBalance = await mockEURInstance.balanceOf(clientAcc);
            assert(BNify(800_000, 18).eq(clientEurBalance), "The balance was "+clientEurBalance);
        });
    });

});