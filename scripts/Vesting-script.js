/* eslint-disable space-before-function-paren */
/* eslint-disable no-undef */
const hre = require('hardhat');
const BigNumber = require('bignumber.js');
const { deployed } = require('../helpers/deployed');

const { toBN, toWei } = require('../helpers/utils');

const tokenAddress = '';
const BLOCKS_PER_DAY = 7200;
const SALES = { SEED: 0, PRIVATE: 1, PUBLIC: 2 };
const PRECISION = new BigNumber('10').pow('25');

async function main() {
  // DEPLOY
  const [deployer] = await ethers.getSigners();
  console.log('Deploying contracts with the account:', deployer.address);

  const Vesting = await hre.ethers.getContractFactory('Vesting');
  const vesting = await Vesting.deploy(tokenAddress);
  await vesting.deployed();

  await deployed('Vesting', hre.network.name, vesting.address);

  // CONFIG
  const block = await web3.eth.getBlock('latest');
  const blockNumber = block.number;
  await vesting.setBlockTGE(toBN(blockNumber).plus(BLOCKS_PER_DAY));

  const sales = [SALES.SEED, SALES.PRIVATE, SALES.PUBLIC];
  const maxSupplies = [toWei('50000000'), toWei('102500000'), toWei('30000000')];
  const releasesTGE = [toBN(PRECISION).times(5), toBN(PRECISION).times(5), toBN(PRECISION).times(50)];
  const cliffs = [6, 6, 0];
  const periods = [24, 20, 6];
  await vesting.setStageBatch(sales, maxSupplies, releasesTGE, cliffs, periods);

  // refill stages in config for testing purpose
  const lockedSupplies = [toWei('500000'), toWei('500000'), toWei('500000')];
  // first need approval
  await vesting.refillStage(SALES.SEED, lockedSupplies[0]);
  await vesting.refillStage(SALES.PRIVATE, lockedSupplies[1]);
  await vesting.refillStage(SALES.PUBLIC, lockedSupplies[2]);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
