// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "contracts/Vesting.sol";

contract VestingMock is Vesting {
    using SafeMath for uint256;

    uint256 public constant BLOCKS_TEST = 10;

    constructor(address tokenAddress) Vesting(tokenAddress) {}

    function _balanceOfSale(uint256 vestingIndex) internal view virtual override returns (uint256) {
        VestingInfo memory vesting = vestingInfo[vestingIndex];
        StageInfo memory stage = stageInfo[vesting.sale];

        uint256 amountReleasedTGE = vesting.amount.mul(stage.releaseTGE).div(PERCENTAGE_100);

        uint256 amountToPay = amountReleasedTGE;

        uint256 cliffBlock = blockTGE.add(stage.cliff.mul(BLOCKS_TEST));
        uint256 periodBlock = cliffBlock.add(stage.period.mul(BLOCKS_TEST));

        if (block.number > cliffBlock) {
            uint256 elapsedBlocks = _getElapsedBlocksFromCliff(cliffBlock, periodBlock);
            uint256 leftAmount = vesting.amount.sub(amountReleasedTGE);

            amountToPay = amountToPay.add(leftAmount.mul(elapsedBlocks).div(periodBlock.sub(cliffBlock)));
        }
        return amountToPay.sub(vesting.paid);
    }
}
