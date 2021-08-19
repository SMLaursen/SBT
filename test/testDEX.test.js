const MockEUR = artifacts.require('MockEUR');
const MockUSD = artifacts.require('MockUSD');
const MockDEX = artifacts.require('MockDEX');

const BNify = (n, d) => web3.utils.toBN(n).mul(web3.utils.toBN(10).pow(web3.utils.toBN(d)));

contract("DEX", (accounts) => {
    let dexInstance;
    let mockEURInstance;
    let mockUSDInstance;

    let eurOwner = accounts[1];
    let usdOwner = accounts[2];

    let clientAcc = accounts[9];

    before(async () => {
        dexInstance = await MockDEX.deployed(); 
        mockEURInstance = await MockEUR.deployed();
        mockUSDInstance = await MockUSD.deployed();

        //Lets put 500K EUR token in the clientAcc 
        await mockEURInstance.mint(BNify(500_000, 18), {from: clientAcc});

        //And 1M EUR and USD tokens in the DEX
        await mockUSDInstance.mint(BNify(1_000_000, 18), {from: usdOwner});
        await mockUSDInstance.approve(dexInstance.address, BNify(1_000_000, 18), {from: usdOwner});
        await mockUSDInstance.transfer(dexInstance.address, BNify(1_000_000, 18), {from: usdOwner});

        await mockEURInstance.mint(BNify(1_000_000, 18), {from: eurOwner});
        await mockEURInstance.approve(dexInstance.address, BNify(1_000_000, 18), {from: eurOwner});
        await mockEURInstance.transfer(dexInstance.address, BNify(1_000_000, 18), {from: eurOwner});
    });

    describe("Tests the DEX", async () => {
        it("Verifies the initial dex-balance", async () => {
            let dexUSDBalance = await mockUSDInstance.balanceOf(dexInstance.address)
            assert(BNify(1_000_000, 18).eq(dexUSDBalance));

            let dexEURBalance = await mockEURInstance.balanceOf(dexInstance.address)
            assert(BNify(1_000_000, 18).eq(dexEURBalance));
        });

        it("Verifies the client can trade at the DEX", async () => {
            let clientUSDBalance = await mockUSDInstance.balanceOf(clientAcc);
            assert(BNify(0, 18).eq(clientUSDBalance));

            let clientEURBalance = await mockEURInstance.balanceOf(clientAcc);
            assert(BNify(500_000, 18).eq(clientEURBalance));

            await mockEURInstance.approve(dexInstance.address, BNify(400_000, 18), {from: clientAcc});
            await dexInstance.tradeEURtoUSD(BNify(400_000, 18), {from: clientAcc});

            clientUSDBalance = await mockUSDInstance.balanceOf(clientAcc);
            assert(BNify(480_000, 18).eq(clientUSDBalance), "was "+clientUSDBalance);

            clientEURBalance = await mockEURInstance.balanceOf(clientAcc);
            assert(BNify(100_000, 18).eq(clientEURBalance), "was "+clientEURBalance);

            dexUSDBalance = await mockUSDInstance.balanceOf(dexInstance.address)
            assert(BNify(520_000, 18).eq(dexUSDBalance), "was "+dexUSDBalance);

            dexEURBalance = await mockEURInstance.balanceOf(dexInstance.address)
            assert(BNify(1_400_000, 18).eq(dexEURBalance), "was "+dexEURBalance);

            //Trade back again
            await mockUSDInstance.approve(dexInstance.address, BNify(480_000, 18), {from: clientAcc});
            await dexInstance.tradeUSDtoEUR(BNify(480_000, 18), {from: clientAcc});

            clientUSDBalance = await mockUSDInstance.balanceOf(clientAcc);
            assert(BNify(0, 18).eq(clientUSDBalance));

            clientEURBalance = await mockEURInstance.balanceOf(clientAcc);
            assert(BNify(500_000, 18).eq(clientEURBalance));

            dexUSDBalance = await mockUSDInstance.balanceOf(dexInstance.address)
            assert(BNify(1_000_000, 18).eq(dexUSDBalance));

            dexEURBalance = await mockEURInstance.balanceOf(dexInstance.address)
            assert(BNify(1_000_000, 18).eq(dexEURBalance));
            
        });
        
    });
});