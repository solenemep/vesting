const BigNumber = require('bignumber.js');
const { time } = require('@openzeppelin/test-helpers');
const { takeSnapshot } = require('@nomicfoundation/hardhat-network-helpers');

const { toWei } = web3.utils;
function toBN(number) {
  return new BigNumber(number);
}

let _snapshot;
async function snapshot() {
  _snapshot = await takeSnapshot();
}

async function restore() {
  await _snapshot.restore();
}

async function increaseTime(duration) {
  await time.increase(duration);
}

async function increaseTimeTo(target) {
  await time.increaseTo(target);
}

async function advanceBlocks(blockAmount) {
  const lastBlock = await time.latestBlock();

  await time.advanceBlockTo(toBN(lastBlock).plus(blockAmount).toString());
}

async function advanceBlockTo(target) {
  await time.advanceBlockTo(target);
}

async function getCurrentBlockTimestamp() {
  return (await web3.eth.getBlock('latest')).timestamp;
}

async function getPreviousBlockTimestamp() {
  const latest = toBN(await web3.eth.getBlockNumber());
  return (await web3.eth.getBlock(latest.minus(1))).timestamp;
}

async function getCurrentBlock() {
  const block = await web3.eth.getBlock('latest');
  return block.number;
}

const getTransactionBlock = (tx) => tx.receipt.blockNumber;

module.exports = {
  increaseTime,
  increaseTimeTo,
  advanceBlocks,
  advanceBlockTo,
  snapshot,
  restore,
  getCurrentBlockTimestamp,
  getPreviousBlockTimestamp,
  getCurrentBlock,
  getTransactionBlock,
  toWei,
  toBN,
};
