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
    let lendingPoolOwner = accounts[3];
    let yieldProtocolOwner = accounts[4];
    let dexOwner = accounts[5];

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

        //Bootstrap the DEX with 2M EUR and USD tokens 
        await mockUSDInstance.mint(BNify(2_000_000, 18), {from: usdOwner});
        await mockUSDInstance.approve(dexInstance.address, BNify(2_000_000, 18), {from: usdOwner});
        await mockUSDInstance.transfer(dexInstance.address, BNify(2_000_000, 18), {from: usdOwner});

        await mockEURInstance.mint(BNify(2_000_000, 18), {from: eurOwner});
        await mockEURInstance.approve(dexInstance.address, BNify(2_000_000, 18), {from: eurOwner});
        await mockEURInstance.transfer(dexInstance.address, BNify(2_000_000, 18), {from: eurOwner});

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
            assert(BNify(2_000_000, 18).eq(dexUSDBalance));

            let dexEURBalance = await mockEURInstance.balanceOf(dexInstance.address)
            assert(BNify(2_000_000, 18).eq(dexEURBalance));
            
            let lendingPoolUSDBalance = await mockUSDInstance.balanceOf(mockEURUSDLendingPoolInstance.address)
            assert(BNify(2_000_000, 18).eq(lendingPoolUSDBalance));
        });

        it("Verifies the client can deposit to MRM", async () => {
            await mockEURInstance.approve(mrmInstance.address, BNify(1_000_000, 18), {from: clientAcc});
            await mrmInstance.depositEUR(BNify(1_000_000, 18), {from: clientAcc});

            clientEurBalance = await mockEURInstance.balanceOf(clientAcc);
            assert(BNify(0, 18).eq(clientEurBalance), "The balance was "+clientEurBalance);
        });

        it("Verifies that yield can be redeemed by the client", async () => {
            await mockUSDYieldProtocolInstance.generateYield(10, {from: yieldProtocolOwner});

            await mrmInstance.redeemEUR({from: clientAcc});

            //10% yield = 85K due to 15% of the funds being allocated the hedge
            clientEurBalance = await mockEURInstance.balanceOf(clientAcc);
            assert(BNify(1_085_000, 18).eq(clientEurBalance), "The balance was "+clientEurBalance);
        });

        it("Verifies MRM rebalances", async () => {
            //Set EURUSD to 1.18
            await mockEURUSDLendingPoolInstance.setEURUSDExchangeRate(BNify(118, 8), {from: lendingPoolOwner});
            await dexInstance.setEURUSDExchangeRate(BNify(118, 8), {from: dexOwner});
            await mrmInstance.check({from: mrmOwner});

            await mockEURInstance.approve(mrmInstance.address, BNify(1_000_000, 18), {from: clientAcc});
            await mrmInstance.depositEUR(BNify(1_000_000, 18), {from: clientAcc});

            let borrowedUSD = await mockEURUSDLendingPoolInstance.getBorrowedUSD(mrmInstance.address);
            assert(BNify(1_003_000, 18).eq(borrowedUSD), "The borrowed USD balance was "+borrowedUSD)
            
            let collateralizedEUR = await mockEURUSDLendingPoolInstance.getCollateralizedEUR(mrmInstance.address);
            assert(BNify(1_000_000, 18).eq(collateralizedEUR), "The collateralized EUR balance was "+collateralizedEUR);

            let yieldProtocolBalance = await mockUSDYieldProtocolInstance.balanceOf(mrmInstance.address);
            assert(borrowedUSD.eq(yieldProtocolBalance), "The yieldProtocol USD balance was "+yieldProtocolBalance);

            //Then EURUSD increases to 1.20
            await mockEURUSDLendingPoolInstance.setEURUSDExchangeRate(BNify(120, 8), {from: lendingPoolOwner});
            await dexInstance.setEURUSDExchangeRate(BNify(120, 8), {from: dexOwner});
            await mrmInstance.check({from: mrmOwner});

            //Verify it doesn't trigger a rebalance
            borrowedUSD = await mockEURUSDLendingPoolInstance.getBorrowedUSD(mrmInstance.address);
            assert(BNify(1_003_000, 18).eq(borrowedUSD), "The borrowed USD balance was "+borrowedUSD)
            
            collateralizedEUR = await mockEURUSDLendingPoolInstance.getCollateralizedEUR(mrmInstance.address);
            assert(BNify(1_000_000, 18).eq(collateralizedEUR), "The collateralized EUR balance was "+collateralizedEUR);

            yieldProtocolBalance = await mockUSDYieldProtocolInstance.balanceOf(mrmInstance.address);
            assert(borrowedUSD.eq(yieldProtocolBalance), "The yieldProtocol USD balance was "+yieldProtocolBalance);

            //Then EURUSD increases from 1.18 to 1.25
            await mockEURUSDLendingPoolInstance.setEURUSDExchangeRate(BNify(125, 8), {from: lendingPoolOwner});
            await dexInstance.setEURUSDExchangeRate(BNify(125, 8), {from: dexOwner});
            await mrmInstance.check({from: mrmOwner});

            //Verify that the positions have been rebalanced
            borrowedUSD = await mockEURUSDLendingPoolInstance.getBorrowedUSD(mrmInstance.address);
            assert(BNify(1_062_500, 18).eq(borrowedUSD), "The borrowed USD balance was "+borrowedUSD)
            
            collateralizedEUR = await mockEURUSDLendingPoolInstance.getCollateralizedEUR(mrmInstance.address);
            assert(BNify(1_000_000, 18).eq(collateralizedEUR), "The collateralized EUR balance was "+collateralizedEUR);

            yieldProtocolBalance = await mockUSDYieldProtocolInstance.balanceOf(mrmInstance.address);
            assert(borrowedUSD.eq(yieldProtocolBalance), "The yieldProtocol USD balance was "+yieldProtocolBalance);

            //Then 10% yield is generated
            await mockUSDYieldProtocolInstance.generateYield(10, {from: yieldProtocolOwner});
            await mrmInstance.check({from: mrmOwner});

            //Which again should trigger a rebalance to hedge the yield
            borrowedUSD = await mockEURUSDLendingPoolInstance.getBorrowedUSD(mrmInstance.address);
            //1_062_500 * 1.085
            assert(BNify(1_152_812_5, 17).eq(borrowedUSD), "The borrowed USD balance was "+borrowedUSD)

            collateralizedEUR = await mockEURUSDLendingPoolInstance.getCollateralizedEUR(mrmInstance.address);
            //1_000_000 * 1.085
            assert(BNify(1_085_000, 18).eq(collateralizedEUR), "The collateralized EUR balance was "+collateralizedEUR);

            yieldProtocolBalance = await mockUSDYieldProtocolInstance.balanceOf(mrmInstance.address);
            assert(borrowedUSD.eq(yieldProtocolBalance), "The yieldProtocol USD balance was "+yieldProtocolBalance);

            await mrmInstance.redeemEUR({from: clientAcc});
            clientEurBalance = await mockEURInstance.balanceOf(clientAcc);
            //And again we getadditional 85K EUR deposited in our account (despite the rebalances and change in exchange-rates)
            assert(BNify(1_170_000, 18).eq(clientEurBalance), "The balance was "+clientEurBalance);
        });

        it("Verifies unhegded residuals are distributed to the clients at the current market rate", async () => {
            //Set EURUSD to 1.20
            await mockEURUSDLendingPoolInstance.setEURUSDExchangeRate(BNify(120, 8), {from: lendingPoolOwner});
            await dexInstance.setEURUSDExchangeRate(BNify(120, 8), {from: dexOwner});
            await mrmInstance.check({from: mrmOwner});

            await mockEURInstance.approve(mrmInstance.address, BNify(1_000_000, 18), {from: clientAcc});
            await mrmInstance.depositEUR(BNify(1_000_000, 18), {from: clientAcc});

            //Then 1% yield is generated and the market moves from 1.20 to 1.22
            await mockUSDYieldProtocolInstance.generateYield(1, {from: yieldProtocolOwner});
            await mockEURUSDLendingPoolInstance.setEURUSDExchangeRate(BNify(122, 8), {from: lendingPoolOwner});
            await dexInstance.setEURUSDExchangeRate(BNify(122, 8), {from: dexOwner});
            await mrmInstance.check({from: mrmOwner});

            //Verify it doesn't trigger a rebalance
            borrowedUSD = await mockEURUSDLendingPoolInstance.getBorrowedUSD(mrmInstance.address);
            assert(BNify(1_020_000, 18).eq(borrowedUSD), "The borrowed USD balance was "+borrowedUSD)
            
            collateralizedEUR = await mockEURUSDLendingPoolInstance.getCollateralizedEUR(mrmInstance.address);
            assert(BNify(1_000_000, 18).eq(collateralizedEUR), "The collateralized EUR balance was "+collateralizedEUR);

            yieldProtocolBalance = await mockUSDYieldProtocolInstance.balanceOf(mrmInstance.address);
            //Borrowed USD + 1% in yield
            assert(BNify(1_030_200, 18).eq(yieldProtocolBalance), "The yieldProtocol USD balance was "+yieldProtocolBalance);
       
            await mrmInstance.redeemEUR({from: clientAcc});

            clientEurBalance = await mockEURInstance.balanceOf(clientAcc);

            //The 10_200 USD residual is traded to EUR at the current market price (1.22) = 8360EUR
            assert(BNify(1_178_360, 18).eq(clientEurBalance), "The balance was "+clientEurBalance);

            //Make the client go back to 1M
            await mockEURInstance.approve(eurOwner, BNify(178_360, 18), {from: clientAcc});
            await mockEURInstance.transfer(eurOwner, BNify(178_360, 18), {from: clientAcc});

            clientEurBalance = await mockEURInstance.balanceOf(clientAcc);
            assert(BNify(1_000_000, 18).eq(clientEurBalance), "The balance was "+clientEurBalance);
        });

        it("Verifies MRM bookkeeping on lending pool liquidations", async () => {
            //Set EURUSD to 1.20
            await mockEURUSDLendingPoolInstance.setEURUSDExchangeRate(BNify(120, 8), {from: lendingPoolOwner});
            await dexInstance.setEURUSDExchangeRate(BNify(120, 8), {from: dexOwner});
            await mrmInstance.check({from: mrmOwner});

            //Deposit 1M EUR to MRM
            await mockEURInstance.approve(mrmInstance.address, BNify(1_000_000, 18), {from: clientAcc});
            await mrmInstance.depositEUR(BNify(1_000_000, 18), {from: clientAcc});

            //Set EURUSD to 1.10 triggering a liquidation
            await mockEURUSDLendingPoolInstance.setEURUSDExchangeRate(BNify(110, 8), {from: lendingPoolOwner});
            await dexInstance.setEURUSDExchangeRate(BNify(110, 8), {from: dexOwner});

            await mrmInstance.redeemEUR({from: clientAcc});

            //The client should now be left with
            //1M EUR -(1.20)-> 1.02M USD -(1.10) -> 927_273EUR
            clientEurBalance = await mockEURInstance.balanceOf(clientAcc);
            assert(BNify(927_273, 18).eq(clientEurBalance), "The balance was "+clientEurBalance);
        });

    });
});