require('@nomiclabs/hardhat-waffle');
require('@nomiclabs/hardhat-solhint');
require('hardhat-docgen');

require('dotenv').config();
const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;
const PRIVATE_KEY_DEPLOYER = process.env.PRIVATE_KEY_DEPLOYER;
const PRIVATE_KEY_RESERVE = process.env.PRIVATE_KEY_RESERVE;
const PRIVATE_KEY_OWNER = process.env.PRIVATE_KEY_OWNER;

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: '0.8.4',
  networks: {
    mainnet: {
      url: `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts: [`0x${PRIVATE_KEY_DEPLOYER}`, `0x${PRIVATE_KEY_RESERVE}`, `0x${PRIVATE_KEY_OWNER}`],
    },
    ropsten: {
      url: `https://ropsten.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts: [`0x${PRIVATE_KEY_DEPLOYER}`, `0x${PRIVATE_KEY_RESERVE}`, `0x${PRIVATE_KEY_OWNER}`],
    },
    kovan: {
      url: `https://kovan.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts: [`0x${PRIVATE_KEY_DEPLOYER}`, `0x${PRIVATE_KEY_RESERVE}`, `0x${PRIVATE_KEY_OWNER}`],
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts: [`0x${PRIVATE_KEY_DEPLOYER}`, `0x${PRIVATE_KEY_RESERVE}`, `0x${PRIVATE_KEY_OWNER}`],
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts: [`0x${PRIVATE_KEY_DEPLOYER}`, `0x${PRIVATE_KEY_RESERVE}`, `0x${PRIVATE_KEY_OWNER}`],
    },
  },
  docgen: {
    path: './docs',
    clear: true,
    runOnCompile: true,
  },
};
