const MockUSD = artifacts.require('MockUSD');
const MockUSDYieldProtocol = artifacts.require('MockUSDYieldProtocol');

const BNify = (n, d) => web3.utils.toBN(n).mul(web3.utils.toBN(10).pow(web3.utils.toBN(d)));

contract("MockUSDYieldProtocol", (accounts) => {
    let mockUSDInstance;
    let MockUSDYieldProtocolInstance;

    let usdOwner = accounts[2];
    let yieldProtocolOwner = accounts[4];

    let clientAcc = accounts[9];

    before(async () => {
        mockUSDInstance = await MockUSD.deployed();
        mockUSDYieldProtocolInstance = await MockUSDYieldProtocol.deployed();

        //Mint 500K usd in USD's owner address
        mockUSDInstance.mint(BNify(1_000_000, 18), {from: clientAcc});
    });
    
    describe("Test Yield Protocol", async () => {
        it("Verifies the client can deposit USD into the yield protocol and get yield", async () => {
            clientUsdBalance = await mockUSDInstance.balanceOf(clientAcc);
            assert(BNify(1_000_000, 18).eq(clientUsdBalance), "The balance was "+clientUsdBalance);
        });
    });

});