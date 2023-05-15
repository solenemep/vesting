require('@nomicfoundation/hardhat-toolbox');
require('@nomiclabs/hardhat-solhint');
require('hardhat-docgen');
require('@nomiclabs/hardhat-ethers');
require('@nomiclabs/hardhat-etherscan');
require('@nomiclabs/hardhat-web3');
require('@nomicfoundation/hardhat-chai-matchers');
require('web3-eth');

require('dotenv').config();
const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;
const PRIVATE_KEY_DEPLOYER = process.env.PRIVATE_KEY_DEPLOYER;
const PRIVATE_KEY_RESERVE = process.env.PRIVATE_KEY_RESERVE;
const PRIVATE_KEY_OWNER = process.env.PRIVATE_KEY_OWNER;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: '0.8.10',
};
