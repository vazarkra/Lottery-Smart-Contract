const assert = require("assert"); //std lib to assert in tests
const ganache = require("ganache-cli");
const Web3 = require("web3"); //Note capital 'W' as we are invoking constructor function
const provider = ganache.provider(); //provider for connecting to the ganache local network
const web3 = new Web3(provider);
const { abi, evm } = require("../compile"); // compile is one dir up in the proj structure so we add ../

//Before each test, fetch an account from ganache and deploy the contract using that account
let accountList;
let lottery;
beforeEach(async () => {
  //Get a list of all accounts from Ganache - function returns a promise and has to be resolved
  accountList = await web3.eth.getAccounts();
  //Deploy the contract
  lottery = await new web3.eth.Contract(abi) //tells what methods the inbox contract has
    .deploy({ data: "0x" + evm.bytecode.object }) //tells we want to deploy an instance
    .send({ from: accountList[0], gas: "1000000" }); //sends a transactions to create the contract
  //lottery variable will now be the actual contract deployed on the blockchain and we can call functions on it
});

describe("Lottery Contract", () => {
  it("Contract assigned an Address", () => {
    assert.ok(lottery.options.address); //if the address property has truthy value this assert test will pass
  });

  it("Player entered successfully", async () => {
    await lottery.methods
      .enter()
      .send({ from: accountList[0], value: web3.utils.toWei("0.02", "ether") });
    const players = await lottery.methods.getPlayers().call();
    assert.strictEqual(accountList[0], players[0]);
  });

  it("Enter Multiple Players", async () => {
    await lottery.methods
      .enter()
      .send({ from: accountList[0], value: web3.utils.toWei("0.02", "ether") });
    await lottery.methods
      .enter()
      .send({ from: accountList[1], value: web3.utils.toWei("0.02", "ether") });
    await lottery.methods
      .enter()
      .send({ from: accountList[2], value: web3.utils.toWei("0.02", "ether") });
    const players = await lottery.methods.getPlayers().call();
    assert.strictEqual(3, players.length);
  });

  it("Minimum required ether sent for entry", async () => {
    try {
      await lottery.methods.enter().send({ from: accountList[0], value: 0 }); //Send zero wei
      assert(false); //Mark test as failed if there is no error from the enter method which would be an unexpected result
    } catch (err) {
      assert(err);
    }
  });

  it("Only Manager can call Pick Winner", async () => {
    try {
      await lottery.methods.pickWinner().send({ from: accountList[0] }); //Account[1] is not the manager
      assert(false); //Mark test as failed if there is no error from the enter method which would be an unexpected result
    } catch (err) {
      assert(err);
    }
  });

  it("Sends money to winner and re-set players array", async () => {
    await lottery.methods
      .enter()
      .send({ from: accountList[0], value: web3.utils.toWei("2", "ether") });
    const initialBalance = await web3.eth.getBalance(accountList[0]);
    await lottery.methods.pickWinner().send({
      from: accountList[0],
    });
    const finalBalance = await web3.eth.getBalance(accountList[0]);
    const difference = finalBalance - initialBalance;
    assert(difference > web3.utils.toWei("1.8", "ether"));
  });
});
