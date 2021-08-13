const SBTAggregator = artifacts.require("SBTAggregator");

contract("SBTAggregator", (accounts) => {
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
            assert.equal(contractBalanceBefore, ownerBalanceAfter - ownerBalanceBefore, "The contract balance should've been withdrawn to the owner");
        });
    });
});