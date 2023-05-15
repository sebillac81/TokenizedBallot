import { ethers } from "hardhat";
import { MyVoteToken, MyVoteToken__factory, TokenizedBallot, TokenizedBallot__factory } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const MINT_VALUE = ethers.utils.parseUnits("10");
const TARGET_BLOCK_NUMBER = 6;

async function main(){
    const [deployer, acc1,acc2] = await ethers.getSigners();
    
    //Deploy VoteContract
    const myVotecontractFactory = new MyVoteToken__factory(deployer);
    const myVotecontract = await myVotecontractFactory.deploy();
    const deployVoteContractTxReceipt = await myVotecontract.deployTransaction.wait();
    console.log(`The contract MyVoteToken was deployed at address ${myVotecontract.address} at the block ${deployVoteContractTxReceipt.blockNumber} \n`);

    const proposals = process.argv.slice(2) as string[];
    console.log("Proposals to Ballot: ");
    proposals.forEach((element, index) => {
      console.log(`Proposal N. ${index + 1}: ${element}`);
    });

    //Deploy TokenizedBallotContract
    const tokenizedBallotContractFactory = new TokenizedBallot__factory(deployer);
    const tokenizedBallotContract = await tokenizedBallotContractFactory.deploy(
        convertStringArrayToBytes32(proposals),
        myVotecontract.address,
        TARGET_BLOCK_NUMBER
    );

    const deployTokenizedBallotTxReceipt = await tokenizedBallotContract.deployTransaction.wait();
    console.log(`The contract TokenizedBallot was deployed at address ${tokenizedBallotContract.address} at the block ${deployTokenizedBallotTxReceipt.blockNumber} \n`);

    await mint(myVotecontract,acc1);
    await delegateVote(myVotecontract, acc1);

    await mint(myVotecontract,acc2);
    await delegateVote(myVotecontract, acc2);

    await showBalanceOf(myVotecontract, acc1);
    await showBalanceOf(myVotecontract, acc2);

    await vote(tokenizedBallotContract,acc1, 1, 3);
    await vote(tokenizedBallotContract,acc2, 2, 5);
}
async function vote(
    tokenizedBallotContract: TokenizedBallot,
    account: SignerWithAddress,
    proposalNumber: number,
    voteAmount: number){

        try{
            const voteTx = await tokenizedBallotContract
            .connect(account)
            .vote(proposalNumber, voteAmount);

          const voteTxR = await voteTx.wait();

            const remainingVotes = await tokenizedBallotContract.connect(account).votingPower(account.address);
            console.log("votingPower()");
    
          console.log(`vote successfully: Account: ${account.address} for proposal #${ proposalNumber} at block ${voteTxR.blockNumber}\n`);
          console.log(`Remaining votes ${ethers.utils.formatUnits(remainingVotes)}`);
        }catch (error) {
      console.log(`Error: ${error}`);
        }
}

async function mint(contract: MyVoteToken, account: SignerWithAddress){
    const mintTx = await contract.mint(account.address, MINT_VALUE);
    const mintTxReceipt = await mintTx.wait();

    console.log(`Minted ${ethers.utils.formatUnits(MINT_VALUE)} tokens to the address ${account.address} at the block ${mintTxReceipt.blockNumber}\n`);
}
async function delegateVote(contract: MyVoteToken, account: SignerWithAddress){
    const delegateTx = await contract.connect(account).delegate(account.address);
    await delegateTx.wait();

    const votes = await contract.getVotes(account.address);
    console.log(`Account ${account.address} has ${ethers.utils.formatUnits(votes)} voting powers after self delegating\n`);
}
async function  showBalanceOf(contract: MyVoteToken, account: SignerWithAddress) {
    const balanceBN = await contract.balanceOf(account.address);
    console.log(`Account ${account.address} has ${ethers.utils.formatUnits(balanceBN)} MyVoteToken\n`);
}

function convertStringArrayToBytes32(array: string[]) {
    return array.map(ethers.utils.formatBytes32String);
}

main().catch((err)=> {
    console.error(err);
    process.exitCode = 1;
});

