const MockUSD = artifacts.require('MockUSD');
const MockUSDYieldProtocol = artifacts.require('MockUSDYieldProtocol');

const BNify = (n, d) => web3.utils.toBN(n).mul(web3.utils.toBN(10).pow(web3.utils.toBN(d)));

contract("MockUSDYieldProtocol", (accounts) => {
    let mockUSDInstance;
    let mockUSDYieldProtocolInstance;

    let yieldProtocolOwner = accounts[4];

    let clientAcc1 = accounts[8];
    let clientAcc2 = accounts[9];

    before(async () => {
        mockUSDInstance = await MockUSD.deployed();
        mockUSDYieldProtocolInstance = await MockUSDYieldProtocol.deployed();

        //Mint 1M usd in client1 and client2
        mockUSDInstance.mint(BNify(1_000_000, 18), {from: clientAcc1});
        mockUSDInstance.mint(BNify(1_000_000, 18), {from: clientAcc2});
    });
    
    describe("Test Yield Protocol", async () => {
        it("Verifies the clients can deposit USD into the yield protocol", async () => {
            let client1UsdBalance = await mockUSDInstance.balanceOf(clientAcc1);
            assert(BNify(1_000_000, 18).eq(client1UsdBalance), "The balance was "+client1UsdBalance);
            let client2UsdBalance = await mockUSDInstance.balanceOf(clientAcc2);
            assert(BNify(1_000_000, 18).eq(client2UsdBalance), "The balance was "+client2UsdBalance);

            await mockUSDInstance.approve(mockUSDYieldProtocolInstance.address, BNify(600_000, 18), {from: clientAcc1});
            await mockUSDYieldProtocolInstance.deposit(BNify(600_000, 18), {from: clientAcc1});

            await mockUSDInstance.approve(mockUSDYieldProtocolInstance.address, BNify(400_000, 18), {from: clientAcc2});
            await mockUSDYieldProtocolInstance.deposit(BNify(400_000, 18), {from: clientAcc2});

            client1UsdBalance = await mockUSDInstance.balanceOf(clientAcc1);
            assert(BNify(400_000, 18).eq(client1UsdBalance), "The balance was "+client1UsdBalance);
            client2UsdBalance = await mockUSDInstance.balanceOf(clientAcc2);
            assert(BNify(600_000, 18).eq(client2UsdBalance), "The balance was "+client2UsdBalance);

            client1UsdBalance = await mockUSDYieldProtocolInstance.balanceOf(clientAcc1);
            assert(BNify(600_000, 18).eq(client1UsdBalance), "The balance was "+client1UsdBalance);
            
            client2UsdBalance = await mockUSDYieldProtocolInstance.balanceOf(clientAcc2);
            assert(BNify(400_000, 18).eq(client2UsdBalance), "The balance was "+client2UsdBalance);
        });

        it("Verifies yield is distributed (internally) in the contract", async () => {
            await mockUSDYieldProtocolInstance.generateYield(10, {from: yieldProtocolOwner});

            client1UsdBalance = await mockUSDInstance.balanceOf(clientAcc1);
            assert(BNify(400_000, 18).eq(client1UsdBalance), "The balance was "+client1UsdBalance);

            client2UsdBalance = await mockUSDInstance.balanceOf(clientAcc2);
            assert(BNify(600_000, 18).eq(client2UsdBalance), "The balance was "+client2UsdBalance);

            client1UsdBalance = await mockUSDYieldProtocolInstance.balanceOf(clientAcc1);
            assert(BNify(660_000, 18).eq(client1UsdBalance), "The balance was "+client1UsdBalance);

            client2UsdBalance = await mockUSDYieldProtocolInstance.balanceOf(clientAcc2);
            assert(BNify(440_000, 18).eq(client2UsdBalance), "The balance was "+client2UsdBalance);
        });

        it("Verifies one account can redeem amount+interest without interfering the other account", async () => {
            await mockUSDYieldProtocolInstance.redeem({from: clientAcc1});

            client1UsdBalance = await mockUSDInstance.balanceOf(clientAcc1);
            assert(BNify(1_060_000, 18).eq(client1UsdBalance), "The balance was "+client1UsdBalance);

            client1UsdBalance = await mockUSDYieldProtocolInstance.balanceOf(clientAcc1);
            assert(BNify(0, 18).eq(client1UsdBalance), "The balance was "+client1UsdBalance);

            client2UsdBalance = await mockUSDInstance.balanceOf(clientAcc2);
            assert(BNify(600_000, 18).eq(client2UsdBalance), "The balance was "+client2UsdBalance);

            client2UsdBalance = await mockUSDYieldProtocolInstance.balanceOf(clientAcc2);
            assert(BNify(440_000, 18).eq(client2UsdBalance), "The balance was "+client2UsdBalance);
        });

        it("Verifies only the other account gets yield next time", async () => {
            await mockUSDYieldProtocolInstance.generateYield(5, {from: yieldProtocolOwner});

            client1UsdBalance = await mockUSDInstance.balanceOf(clientAcc1);
            assert(BNify(1_060_000, 18).eq(client1UsdBalance), "The balance was "+client1UsdBalance);

            client1UsdBalance = await mockUSDYieldProtocolInstance.balanceOf(clientAcc1);
            assert(BNify(0, 18).eq(client1UsdBalance), "The balance was "+client1UsdBalance);

            client2UsdBalance = await mockUSDInstance.balanceOf(clientAcc2);
            assert(BNify(600_000, 18).eq(client2UsdBalance), "The balance was "+client2UsdBalance);

            client2UsdBalance = await mockUSDYieldProtocolInstance.balanceOf(clientAcc2);
            assert(BNify(462_000, 18).eq(client2UsdBalance), "The balance was "+client2UsdBalance);
        });

    });

});