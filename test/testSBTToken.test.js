const MockEUR = artifacts.require('MockEUR');
const MockUSD = artifacts.require('MockEUR');
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

            // mockEURInstance.approve(sbtInstance.address, web3.utils.toBN("4000000000000000000000"), {from: usdOwner});
            // mockEURInstance.transfer(sbtInstance.address, web3.utils.toBN("4000000000000000000000"), {from: usdOwner});
            await mockEURInstance.approve(sbtInstance.address, web3.utils.toBN("4000000000000000000000"), {from: clientAcc});
            await sbtInstance.depositEUR(web3.utils.toBN("4000000000000000000000"), {from: clientAcc});

            let clientEurBalance = await mockEURInstance.balanceOf(clientAcc);
            assert(web3.utils.toBN("6000000000000000000000").eq(clientEurBalance), "The balance was "+clientEurBalance);

            clientSBTBalance = await sbtInstance.balanceOf(clientAcc);
            assert(web3.utils.toBN("4000000000000000000000").eq(clientSBTBalance), "The balance was "+clientSBTBalance);

        });
    });
})


/* contract("SBTAggregator", (accounts) => {
    let instance;
    
    before(async () => {
        instance = await SBTAggregator.deployed(); 
    });
    
    describe("Tests initial balance", async () => {
        it("Verifies the initial balance is zero", async () => {
            let balance = await instance.getBalance();
            assert.equal(0, balance, "The balance should be 0");
        });

        it("Verifies getBalance() reflects deposits from accounts[1] and accounts[2]", async () => {
            let amount = web3.utils.toWei("10", "ether");
            await instance.sendTransaction({from : accounts[1], value: amount});
            await instance.sendTransaction({from : accounts[2], value: amount});

            let balance = await instance.getBalance();
            assert.equal(2 * amount, balance, "The balance should be 20 eth");
        });

        it("Verifies withdraw function]", async () => {
            let contractBalanceBefore = await instance.getBalance();
            let ownerBalanceBefore = await web3.eth.getBalance(accounts[0]);

            await instance.withdraw(contractBalanceBefore, {from : accounts[0]});

            let contractBalanceAfter = await instance.getBalance();
            let ownerBalanceAfter = await web3.eth.getBalance(accounts[0]);

            assert.equal(0, contractBalanceAfter, "The contract balance should be 0");

            //TODO failint due to gas-fees?
            assert.equal(contractBalanceBefore, ownerBalanceAfter - ownerBalanceBefore, "The contract balance should've been withdrawn to the owner");
        });
    });
}); */