// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "./TestInit.t.sol";

/// @dev test related to STBL transfers

contract VestingTest is TestInit {
    uint256 public constant MAX_LENGTH = 30;

    IVesting.Sale[] private _sales = [IVesting.Sale.SEED, IVesting.Sale.PRIVATE, IVesting.Sale.PUBLIC];

    uint256 private _maxSupplySEED = 50000000;
    uint256 private _maxSupplyPRIVATE = 102500000;
    uint256 private _maxSupplyPUBLIC = 30000000;
    uint256[] private _maxSupplies = [
        _maxSupplySEED * DECIMALS18,
        _maxSupplyPRIVATE * DECIMALS18,
        _maxSupplyPUBLIC * DECIMALS18
    ];

    uint256 private _lockedSupplySEED = 50000;
    uint256 private _lockedSupplyPRIVATE = 500000;
    uint256 private _lockedSupplyPUBLIC = 30000;

    uint256 private _vestedAmountSEED = 5000;
    uint256 private _vestedAmountPRIVATE = 50000;
    uint256 private _vestedAmountPUBLIC = 3000;

    uint256[] private _releasesTGE = [5 * PRECISION, 5 * PRECISION, 50 * PRECISION];
    uint256[] private _cliffs = [6, 6, 0];
    uint256[] private _periods = [24, 20, 6];

    address[] private _wallets = [USER1, USER2, USER3];

    uint256 public startBlock;

    function testRefillStage(uint96 lockedSupplySEED, uint96 lockedSupplyPRIVATE, uint96 lockedSupplyPUBLIC) public {
        _initVesting();

        vm.assume(
            lockedSupplySEED <= _maxSupplySEED &&
                lockedSupplyPRIVATE <= _maxSupplyPRIVATE &&
                lockedSupplyPUBLIC <= _maxSupplyPUBLIC &&
                (lockedSupplySEED + lockedSupplyPRIVATE + lockedSupplyPUBLIC) <= 1000000
        );

        uint256 balanceOBefore = token.balanceOf(address(this));
        uint256 balanceVBefore = token.balanceOf(address(vesting));

        vesting.refillStage(IVesting.Sale.SEED, lockedSupplySEED * DECIMALS18);
        vesting.refillStage(IVesting.Sale.PRIVATE, lockedSupplyPRIVATE * DECIMALS18);
        vesting.refillStage(IVesting.Sale.PUBLIC, lockedSupplyPUBLIC * DECIMALS18);

        uint256 balanceOAfter = token.balanceOf(address(this));
        uint256 balanceVAfter = token.balanceOf(address(vesting));

        assertEq(
            (balanceOBefore - balanceOAfter),
            (lockedSupplySEED + lockedSupplyPRIVATE + lockedSupplyPUBLIC) * DECIMALS18
        );
        assertEq(
            (balanceVAfter - balanceVBefore),
            (lockedSupplySEED + lockedSupplyPRIVATE + lockedSupplyPUBLIC) * DECIMALS18
        );
    }

    function testEmptyStage(uint96 vestedAmountSEED, uint96 vestedAmountPRIVATE, uint96 vestedAmountPUBLIC) public {
        _initVesting();

        vm.assume(
            vestedAmountSEED <= _lockedSupplySEED &&
                vestedAmountPRIVATE <= _lockedSupplyPRIVATE &&
                vestedAmountPUBLIC <= _lockedSupplyPUBLIC
        );

        vesting.refillStage(IVesting.Sale.SEED, _lockedSupplySEED * DECIMALS18);
        vesting.refillStage(IVesting.Sale.PRIVATE, _lockedSupplyPRIVATE * DECIMALS18);
        vesting.refillStage(IVesting.Sale.PUBLIC, _lockedSupplyPUBLIC * DECIMALS18);

        uint256[] memory vestedAmounts = new uint256[](3);
        vestedAmounts[0] = uint256(vestedAmountSEED * DECIMALS18);
        vestedAmounts[1] = uint256(vestedAmountPRIVATE * DECIMALS18);
        vestedAmounts[2] = uint256(vestedAmountPUBLIC * DECIMALS18);

        vesting.addVestingBatch(_wallets, _sales, vestedAmounts);

        uint256 balanceOBefore = token.balanceOf(address(this));
        uint256 balanceVBefore = token.balanceOf(address(vesting));

        vesting.emptyStage(IVesting.Sale.SEED);
        vesting.emptyStage(IVesting.Sale.PRIVATE);
        vesting.emptyStage(IVesting.Sale.PUBLIC);

        uint256 balanceOAfter = token.balanceOf(address(this));
        uint256 balanceVAfter = token.balanceOf(address(vesting));

        assertEq(
            (balanceOAfter - balanceOBefore),
            ((_lockedSupplySEED - vestedAmountSEED) +
                (_lockedSupplyPRIVATE - vestedAmountPRIVATE) +
                (_lockedSupplyPUBLIC - vestedAmountPUBLIC)) * DECIMALS18
        );
        assertEq(
            (balanceVBefore - balanceVAfter),
            ((_lockedSupplySEED - vestedAmountSEED) +
                (_lockedSupplyPRIVATE - vestedAmountPRIVATE) +
                (_lockedSupplyPUBLIC - vestedAmountPUBLIC)) * DECIMALS18
        );
    }

    function testClaimSEED(uint96 vestedAmountSEED, uint96 elapse) public {
        _initVesting();

        vm.assume(vestedAmountSEED <= _lockedSupplySEED);
        vm.assume(elapse <= _periods[0] * BLOCKS_PER_MONTH);

        vesting.refillStage(IVesting.Sale.SEED, _lockedSupplySEED * DECIMALS18);
        vesting.refillStage(IVesting.Sale.PRIVATE, _lockedSupplyPRIVATE * DECIMALS18);
        vesting.refillStage(IVesting.Sale.PUBLIC, _lockedSupplyPUBLIC * DECIMALS18);

        uint256[] memory vestedAmounts = new uint256[](3);
        vestedAmounts[0] = uint256(vestedAmountSEED * DECIMALS18);
        vestedAmounts[1] = uint256(_vestedAmountPRIVATE * DECIMALS18);
        vestedAmounts[2] = uint256(_vestedAmountPUBLIC * DECIMALS18);

        vesting.addVestingBatch(_wallets, _sales, vestedAmounts);

        // *** BEFORE TGE / BEFORE CLIFF / BEFORE PERIOD ***
        vm.roll(startBlock + BLOCKS_PER_MONTH);

        uint256 balanceUBefore = token.balanceOf(USER1);
        uint256 balanceVBefore = token.balanceOf(address(vesting));

        vm.prank(USER1);
        vesting.claim();

        uint256 balanceUAfter = token.balanceOf(USER1);
        uint256 balanceVAfter = token.balanceOf(address(vesting));

        assertEq((balanceUAfter - balanceUBefore), 0);
        assertEq((balanceVBefore - balanceVAfter), 0);

        // *** AFTER TGE / BEFORE CLIFF / BEFORE PERIOD ***
        vm.roll(startBlock + (2 * BLOCKS_PER_MONTH));

        balanceUBefore = token.balanceOf(USER1);
        balanceVBefore = token.balanceOf(address(vesting));

        vm.prank(USER1);
        vesting.claim();

        balanceUAfter = token.balanceOf(USER1);
        balanceVAfter = token.balanceOf(address(vesting));

        uint256 result = ((vestedAmountSEED * DECIMALS18) * _releasesTGE[0]) / PERCENTAGE_100;

        assertEq((balanceUAfter - balanceUBefore), result);
        assertEq((balanceVBefore - balanceVAfter), result);

        // *** AFTER TGE / AFTER CLIFF / BEFORE PERIOD ***
        vm.roll(startBlock + (2 * BLOCKS_PER_MONTH) + (_cliffs[0] * BLOCKS_PER_MONTH) + elapse);

        balanceUBefore = token.balanceOf(USER1);
        balanceVBefore = token.balanceOf(address(vesting));

        vm.prank(USER1);
        vesting.claim();

        balanceUAfter = token.balanceOf(USER1);
        balanceVAfter = token.balanceOf(address(vesting));

        uint256 leftAmount = (vestedAmountSEED * DECIMALS18) - result;
        result = (leftAmount * elapse) / (_periods[0] * BLOCKS_PER_MONTH);

        assertEq((balanceUAfter - balanceUBefore), result);
        assertEq((balanceVBefore - balanceVAfter), result);

        // *** AFTER TGE / AFTER CLIFF / AFTER PERIOD ***
        vm.roll(
            startBlock + (2 * BLOCKS_PER_MONTH) + (_cliffs[0] * BLOCKS_PER_MONTH) + (_periods[0] * BLOCKS_PER_MONTH)
        );

        balanceUBefore = token.balanceOf(USER1);
        balanceVBefore = token.balanceOf(address(vesting));

        vm.prank(USER1);
        vesting.claim();

        balanceUAfter = token.balanceOf(USER1);
        balanceVAfter = token.balanceOf(address(vesting));

        leftAmount = leftAmount - result;
        result = leftAmount;

        assertEq((balanceUAfter - balanceUBefore), result);
        assertEq((balanceVBefore - balanceVAfter), result);
    }

    function testClaimPRIVATE(uint96 vestedAmountPRIVATE, uint96 elapse) public {
        _initVesting();

        vm.assume(vestedAmountPRIVATE <= _lockedSupplyPRIVATE);
        vm.assume(elapse <= _periods[1] * BLOCKS_PER_MONTH);

        vesting.refillStage(IVesting.Sale.SEED, _lockedSupplySEED * DECIMALS18);
        vesting.refillStage(IVesting.Sale.PRIVATE, _lockedSupplyPRIVATE * DECIMALS18);
        vesting.refillStage(IVesting.Sale.PUBLIC, _lockedSupplyPUBLIC * DECIMALS18);

        uint256[] memory vestedAmounts = new uint256[](3);
        vestedAmounts[0] = uint256(_vestedAmountSEED * DECIMALS18);
        vestedAmounts[1] = uint256(vestedAmountPRIVATE * DECIMALS18);
        vestedAmounts[2] = uint256(_vestedAmountPUBLIC * DECIMALS18);

        vesting.addVestingBatch(_wallets, _sales, vestedAmounts);

        // *** BEFORE TGE / BEFORE CLIFF / BEFORE PERIOD ***
        vm.roll(startBlock + BLOCKS_PER_MONTH);

        uint256 balanceUBefore = token.balanceOf(USER2);
        uint256 balanceVBefore = token.balanceOf(address(vesting));

        vm.prank(USER2);
        vesting.claim();

        uint256 balanceUAfter = token.balanceOf(USER2);
        uint256 balanceVAfter = token.balanceOf(address(vesting));

        assertEq((balanceUAfter - balanceUBefore), 0);
        assertEq((balanceVBefore - balanceVAfter), 0);

        // *** AFTER TGE / BEFORE CLIFF / BEFORE PERIOD ***
        vm.roll(startBlock + (2 * BLOCKS_PER_MONTH));

        balanceUBefore = token.balanceOf(USER2);
        balanceVBefore = token.balanceOf(address(vesting));

        vm.prank(USER2);
        vesting.claim();

        balanceUAfter = token.balanceOf(USER2);
        balanceVAfter = token.balanceOf(address(vesting));

        uint256 result = ((vestedAmountPRIVATE * DECIMALS18) * _releasesTGE[1]) / PERCENTAGE_100;

        assertEq((balanceUAfter - balanceUBefore), result);
        assertEq((balanceVBefore - balanceVAfter), result);

        // *** AFTER TGE / AFTER CLIFF / BEFORE PERIOD ***
        vm.roll(startBlock + (2 * BLOCKS_PER_MONTH) + (_cliffs[1] * BLOCKS_PER_MONTH) + elapse);

        balanceUBefore = token.balanceOf(USER2);
        balanceVBefore = token.balanceOf(address(vesting));

        vm.prank(USER2);
        vesting.claim();

        balanceUAfter = token.balanceOf(USER2);
        balanceVAfter = token.balanceOf(address(vesting));

        uint256 leftAmount = (vestedAmountPRIVATE * DECIMALS18) - result;
        result = (leftAmount * elapse) / (_periods[1] * BLOCKS_PER_MONTH);

        assertEq((balanceUAfter - balanceUBefore), result);
        assertEq((balanceVBefore - balanceVAfter), result);

        // *** AFTER TGE / AFTER CLIFF / AFTER PERIOD ***
        vm.roll(
            startBlock + (2 * BLOCKS_PER_MONTH) + (_cliffs[1] * BLOCKS_PER_MONTH) + (_periods[1] * BLOCKS_PER_MONTH)
        );

        balanceUBefore = token.balanceOf(USER2);
        balanceVBefore = token.balanceOf(address(vesting));

        vm.prank(USER2);
        vesting.claim();

        balanceUAfter = token.balanceOf(USER2);
        balanceVAfter = token.balanceOf(address(vesting));

        leftAmount = leftAmount - result;
        result = leftAmount;

        assertEq((balanceUAfter - balanceUBefore), result);
        assertEq((balanceVBefore - balanceVAfter), result);
    }

    function testClaimPUBLIC(uint96 vestedAmountPUBLIC, uint96 elapse) public {
        _initVesting();

        vm.assume(vestedAmountPUBLIC <= _lockedSupplyPUBLIC);
        vm.assume(elapse <= _periods[2] * BLOCKS_PER_MONTH);

        vesting.refillStage(IVesting.Sale.SEED, _lockedSupplySEED * DECIMALS18);
        vesting.refillStage(IVesting.Sale.PRIVATE, _lockedSupplyPRIVATE * DECIMALS18);
        vesting.refillStage(IVesting.Sale.PUBLIC, _lockedSupplyPUBLIC * DECIMALS18);

        uint256[] memory vestedAmounts = new uint256[](3);
        vestedAmounts[0] = uint256(_vestedAmountSEED * DECIMALS18);
        vestedAmounts[1] = uint256(_vestedAmountPRIVATE * DECIMALS18);
        vestedAmounts[2] = uint256(vestedAmountPUBLIC * DECIMALS18);

        vesting.addVestingBatch(_wallets, _sales, vestedAmounts);

        // *** BEFORE TGE / BEFORE CLIFF / BEFORE PERIOD ***
        vm.roll(startBlock + BLOCKS_PER_MONTH);

        uint256 balanceUBefore = token.balanceOf(USER3);
        uint256 balanceVBefore = token.balanceOf(address(vesting));

        vm.prank(USER3);
        vesting.claim();

        uint256 balanceUAfter = token.balanceOf(USER3);
        uint256 balanceVAfter = token.balanceOf(address(vesting));

        assertEq((balanceUAfter - balanceUBefore), 0);
        assertEq((balanceVBefore - balanceVAfter), 0);

        // *** AFTER TGE / BEFORE CLIFF / BEFORE PERIOD ***
        vm.roll(startBlock + (2 * BLOCKS_PER_MONTH));

        balanceUBefore = token.balanceOf(USER3);
        balanceVBefore = token.balanceOf(address(vesting));

        vm.prank(USER3);
        vesting.claim();

        balanceUAfter = token.balanceOf(USER3);
        balanceVAfter = token.balanceOf(address(vesting));

        uint256 result = ((vestedAmountPUBLIC * DECIMALS18) * _releasesTGE[2]) / PERCENTAGE_100;

        assertEq((balanceUAfter - balanceUBefore), result);
        assertEq((balanceVBefore - balanceVAfter), result);

        // *** AFTER TGE / AFTER CLIFF / BEFORE PERIOD ***
        vm.roll(startBlock + (2 * BLOCKS_PER_MONTH) + (_cliffs[2] * BLOCKS_PER_MONTH) + elapse);

        balanceUBefore = token.balanceOf(USER3);
        balanceVBefore = token.balanceOf(address(vesting));

        vm.prank(USER3);
        vesting.claim();

        balanceUAfter = token.balanceOf(USER3);
        balanceVAfter = token.balanceOf(address(vesting));

        uint256 leftAmount = (vestedAmountPUBLIC * DECIMALS18) - result;
        result = (leftAmount * elapse) / (_periods[2] * BLOCKS_PER_MONTH);

        assertEq((balanceUAfter - balanceUBefore), result);
        assertEq((balanceVBefore - balanceVAfter), result);

        // *** AFTER TGE / AFTER CLIFF / AFTER PERIOD ***
        vm.roll(
            startBlock + (2 * BLOCKS_PER_MONTH) + (_cliffs[2] * BLOCKS_PER_MONTH) + (_periods[2] * BLOCKS_PER_MONTH)
        );

        balanceUBefore = token.balanceOf(USER3);
        balanceVBefore = token.balanceOf(address(vesting));

        vm.prank(USER3);
        vesting.claim();

        balanceUAfter = token.balanceOf(USER3);
        balanceVAfter = token.balanceOf(address(vesting));

        leftAmount = leftAmount - result;
        result = leftAmount;

        assertEq((balanceUAfter - balanceUBefore), result);
        assertEq((balanceVBefore - balanceVAfter), result);
    }

    function _initVesting() internal {
        token.approve(address(vesting), 1000000 * DECIMALS18);

        startBlock = block.number;
        vesting.setBlockTGE(startBlock + (2 * BLOCKS_PER_MONTH));

        vesting.setStageBatch(_sales, _maxSupplies, _releasesTGE, _cliffs, _periods);
    }
}
