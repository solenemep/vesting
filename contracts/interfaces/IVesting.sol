// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

interface IVesting {
    enum Sale {
        SEED,
        PRIVATE,
        PUBLIC
    }

    struct StageInfo {
        uint256 maxSupply; // max stage tokens
        uint256 lockedSupply; // total owner provided tokens
        uint256 vestedSupply; // total investor invested tokens
        uint256 claimedSupply; // total claimed
        uint256 releaseTGE;
        uint256 cliff;
        uint256 period;
    }

    struct StagePublicInfo {
        uint256 maxSupply; // max stage tokens
        uint256 lockedSupply; // total owner provided tokens
        uint256 currentSupply; // current owner provided tokens
        uint256 vestedSupply; // total investor invested tokens
        uint256 claimedSupply; // total claimed
        uint256 unalocatedSupply; // locked but not vested
    }

    struct VestingInfo {
        address wallet;
        Sale sale;
        uint256 amount;
        uint256 paid;
    }

    function stageInfo(
        Sale sale
    )
        external
        view
        returns (
            uint256 maxSupply,
            uint256 lockedSupply,
            uint256 vestedSupply,
            uint256 claimedSupply,
            uint256 releaseTGE,
            uint256 cliff,
            uint256 period
        );

    function vestingInfo(
        uint256 vestingIndex
    ) external view returns (address wallet, Sale sale, uint256 amount, uint256 paid);
}
