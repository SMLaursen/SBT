const MockEUR = artifacts.require('MockEUR');
const MockUSD = artifacts.require('MockUSD');
const SBTToken = artifacts.require('SBTToken');

const BNify = (n, d) => web3.utils.toBN(n).mul(web3.utils.toBN(10).pow(web3.utils.toBN(d)));

contract("SBTToken", (accounts) => {
    let sbtInstance;
    let mockEURInstance;
    let mockUSDInstance;

    let SBTOwner = accounts[0];
    let usdOwner = accounts[2];

    let clientAcc = accounts[9];

    before(async () => {
        sbtInstance = await SBTToken.deployed(); 
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

    describe("Tests client deposits to SBT", async () => {
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
});