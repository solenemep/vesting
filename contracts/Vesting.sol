// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./interfaces/IVesting.sol";

contract Vesting is IVesting, Ownable {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;
    using Math for uint256;
    using EnumerableSet for EnumerableSet.UintSet;

    uint256 public constant PERIOD_DURATION = 30 days;
    uint256 public constant PRECISION = 10 ** 25;
    uint256 public constant PERCENTAGE_100 = 100 * PRECISION;
    uint256 public constant MAX_LENGTH = 30;
    uint256 public constant BLOCKS_PER_MONTH = 7200 * 30;

    IERC20 public token;

    // stage related
    uint256 public blockTGE;
    mapping(Sale => StageInfo) public override stageInfo; // sale -> stage info

    // vesting related
    uint256 private _vestingIndex; // last vesting index
    mapping(uint256 => VestingInfo) public override vestingInfo; // vestingIndex -> Vesting info
    mapping(address => EnumerableSet.UintSet) internal _ownedVestings; // wallet -> vestingIndexes

    mapping(address => mapping(Sale => uint256)) internal _vestingsToIndex; // wallet -> sale -> vestingIndex

    event StageSet(Sale sale, uint256 maxSupply, uint256 releaseTGE, uint256 cliff, uint256 period);
    event StageRefilled(Sale indexed sale, uint256 amountRefilled);
    event StageEmptied(Sale indexed sale, uint256 amountEmptied);
    event VestingAdded(uint256 indexed vestingIndex, address indexed wallet, uint256 amountVested);
    event VestingCanceled(uint256 indexed vestingIndex, address indexed wallet, uint256 amountUnvested);
    event VestingClaimed(uint256 indexed vestingIndex, address indexed wallet, uint256 amountClaimed);

    constructor(address tokenAddress) {
        _vestingIndex = 1;

        token = IERC20(tokenAddress);
    }

    modifier withExistingVesting(address wallet, Sale sale) {
        require(_vestingExists(wallet, sale), "Vesting: This vesting doesn't exist");
        _;
    }

    // STAGE MANAGEMENT

    modifier ulteriorTGE() {
        require(blockTGE > block.number, "Vesting: Block TGE has passed");
        _;
    }

    function setBlockTGE(uint256 _blockTGE) external onlyOwner {
        if (blockTGE != 0) {
            require(_blockTGE < blockTGE, "Vesting: Block TGE already set");
        }
        require(_blockTGE > block.number, "Vesting: Should set block in future");
        blockTGE = _blockTGE;
    }

    function setStageBatch(
        Sale[] calldata sales,
        uint256[] calldata maxSupplies,
        uint256[] calldata releasesTGE,
        uint256[] calldata cliffs,
        uint256[] calldata periods
    ) external onlyOwner {
        require(
            sales.length == maxSupplies.length &&
                maxSupplies.length == releasesTGE.length &&
                releasesTGE.length == cliffs.length &&
                cliffs.length == periods.length,
            "Vesting: Length mismatch"
        );

        for (uint256 i = 0; i < sales.length; i++) {
            _setStage(sales[i], maxSupplies[i], releasesTGE[i], cliffs[i], periods[i]);
        }
    }

    function setStage(
        Sale sale,
        uint256 maxSupply,
        uint256 releaseTGE,
        uint256 cliff,
        uint256 period
    ) external onlyOwner {
        _setStage(sale, maxSupply, releaseTGE, cliff, period);
    }

    function _setStage(Sale sale, uint256 maxSupply, uint256 releaseTGE, uint256 cliff, uint256 period) internal {
        stageInfo[sale].maxSupply = maxSupply;
        stageInfo[sale].releaseTGE = releaseTGE;
        stageInfo[sale].cliff = cliff;
        stageInfo[sale].period = period;

        emit StageSet(sale, maxSupply, releaseTGE, cliff, period);
    }

    function refillStage(Sale sale, uint256 amountToRefill) external onlyOwner {
        require(
            stageInfo[sale].lockedSupply.add(amountToRefill) <= stageInfo[sale].maxSupply,
            "Vesting: Amount exceeds max supply"
        );

        stageInfo[sale].lockedSupply = stageInfo[sale].lockedSupply.add(amountToRefill);

        token.safeTransferFrom(_msgSender(), address(this), amountToRefill);

        emit StageRefilled(sale, amountToRefill);
    }

    function emptyStage(Sale sale) external onlyOwner {
        StageInfo storage stage = stageInfo[sale];
        uint256 amountExceeding = getUnlocatedSupply(stage);

        if (amountExceeding > 0) {
            stage.lockedSupply = stage.lockedSupply.sub(amountExceeding);

            token.safeTransfer(_msgSender(), amountExceeding);

            emit StageEmptied(sale, amountExceeding);
        }
    }

    function getStageInfo(Sale sale) external view returns (StagePublicInfo memory stagePublicInfo) {
        StageInfo memory stage = stageInfo[sale];

        stagePublicInfo.maxSupply = stage.maxSupply;
        stagePublicInfo.lockedSupply = stage.lockedSupply;
        stagePublicInfo.currentSupply = getCurrentSupply(stage);
        stagePublicInfo.vestedSupply = stage.vestedSupply;
        stagePublicInfo.claimedSupply = stage.claimedSupply;
        stagePublicInfo.unalocatedSupply = getUnlocatedSupply(stage);
    }

    function getCurrentSupply(StageInfo memory stage) public pure returns (uint256) {
        return stage.lockedSupply.sub(stage.claimedSupply);
    }

    function getUnlocatedSupply(StageInfo memory stage) public pure returns (uint256) {
        return stage.lockedSupply.sub(stage.vestedSupply);
    }

    // VESTING MANAGEMENT

    function _vestingExists(address wallet, Sale sale) internal view returns (bool) {
        uint256 vestingIndex = _vestingsToIndex[wallet][sale];
        return _ownedVestings[wallet].contains(vestingIndex);
    }

    function countOwnedVestings(address wallet) external view returns (uint256) {
        return _ownedVestings[wallet].length();
    }

    function getVestingIndex(address wallet, Sale sale) external view returns (uint256) {
        return _vestingsToIndex[wallet][sale];
    }

    /// @dev use with countOwnedVestings() if listOption == ListOption.OWNED
    function getListVestings(uint256 offset, uint256 limit) external view returns (VestingInfo[] memory vestingInfos) {
        uint256 count = _ownedVestings[_msgSender()].length();

        uint256 to = (offset.add(limit)).min(count).max(offset);
        vestingInfos = new VestingInfo[](to.sub(offset));

        for (uint256 i = offset; i < to; i++) {
            uint256 vestingIndex = _ownedVestings[_msgSender()].at(i);

            uint256 newIndex = i.sub(offset);
            vestingInfos[newIndex] = vestingInfo[vestingIndex];
        }
    }

    function addVestingBatch(
        address[] calldata wallets,
        Sale[] calldata sales,
        uint256[] calldata amounts
    ) external onlyOwner ulteriorTGE {
        require(wallets.length <= MAX_LENGTH, "Vesting: Too many arguments");
        require(wallets.length == sales.length && sales.length == amounts.length, "Vesting: Length mismatch");

        for (uint256 i = 0; i < wallets.length; i++) {
            _addVesting(wallets[i], sales[i], amounts[i]);
        }
    }

    function addVesting(address wallet, Sale sale, uint256 amount) external onlyOwner ulteriorTGE {
        _addVesting(wallet, sale, amount);
    }

    function _addVesting(address wallet, Sale sale, uint256 amount) internal {
        require(!_vestingExists(wallet, sale), "Vesting: Already invested");

        StageInfo storage stage = stageInfo[sale];
        require(stage.vestedSupply.add(amount) <= stage.lockedSupply, "Vesting: Insufisant locked supply");

        stage.vestedSupply = stage.vestedSupply.add(amount);

        vestingInfo[_vestingIndex].wallet = wallet;
        vestingInfo[_vestingIndex].sale = sale;
        vestingInfo[_vestingIndex].amount = amount;

        _ownedVestings[wallet].add(_vestingIndex);
        _vestingsToIndex[wallet][sale] = _vestingIndex;

        _vestingIndex = _vestingIndex.add(1);

        emit VestingAdded(_vestingIndex, wallet, amount);
    }

    function cancelVesting(address wallet, Sale sale) external onlyOwner withExistingVesting(wallet, sale) {
        uint256 vestingIndex = _vestingsToIndex[wallet][sale];

        StageInfo storage stage = stageInfo[sale];
        uint256 amount = vestingInfo[vestingIndex].amount;

        stage.vestedSupply = stage.vestedSupply.sub(amount.sub(vestingInfo[vestingIndex].paid));

        _ownedVestings[wallet].remove(vestingIndex);
        _vestingsToIndex[wallet][sale] = 0;

        emit VestingCanceled(vestingIndex, wallet, amount);
    }

    // USER METHOD

    function claim() external {
        uint256 amountToPay = _claim(_msgSender(), Sale.SEED).add(_claim(_msgSender(), Sale.PRIVATE)).add(
            _claim(_msgSender(), Sale.PUBLIC)
        );

        if (amountToPay > 0) {
            token.safeTransfer(_msgSender(), amountToPay);
        }
    }

    function _claim(address wallet, Sale sale) internal returns (uint256) {
        if (!_vestingExists(wallet, sale) || block.number < blockTGE) return 0;

        uint256 vestingIndex = _vestingsToIndex[wallet][sale];
        uint256 amountToPay = _balanceOfSale(vestingIndex);

        if (amountToPay > 0) {
            stageInfo[sale].claimedSupply = stageInfo[sale].claimedSupply.add(amountToPay);
            vestingInfo[vestingIndex].paid = vestingInfo[vestingIndex].paid.add(amountToPay);

            emit VestingClaimed(vestingIndex, wallet, amountToPay);
        }

        return amountToPay;
    }

    function balanceOf(address wallet) external view returns (uint256) {
        return
            balanceOfSale(wallet, Sale.SEED).add(balanceOfSale(wallet, Sale.PRIVATE)).add(
                balanceOfSale(wallet, Sale.PUBLIC)
            );
    }

    function balanceOfSale(address wallet, Sale sale) public view returns (uint256) {
        if (!_vestingExists(wallet, sale) || block.number < blockTGE) {
            return 0;
        } else {
            uint256 vestingIndex = _vestingsToIndex[wallet][sale];
            return _balanceOfSale(vestingIndex);
        }
    }

    function _balanceOfSale(uint256 vestingIndex) internal view virtual returns (uint256) {
        VestingInfo memory vesting = vestingInfo[vestingIndex];
        StageInfo memory stage = stageInfo[vesting.sale];

        uint256 amountReleasedTGE = vesting.amount.mul(stage.releaseTGE).div(PERCENTAGE_100);

        uint256 amountToPay = amountReleasedTGE;

        uint256 cliffBlock = blockTGE.add(stage.cliff.mul(BLOCKS_PER_MONTH));
        uint256 periodBlock = cliffBlock.add(stage.period.mul(BLOCKS_PER_MONTH));

        if (block.number > cliffBlock) {
            uint256 elapsedBlocks = _getElapsedBlocksFromCliff(cliffBlock, periodBlock);
            uint256 leftAmount = vesting.amount.sub(amountReleasedTGE);

            amountToPay = amountToPay.add(leftAmount.mul(elapsedBlocks).div(periodBlock.sub(cliffBlock)));
        }
        return amountToPay.sub(vesting.paid);
    }

    function _getElapsedBlocksFromCliff(uint256 cliffBlock, uint256 periodBlock) internal view returns (uint256) {
        if (block.number >= periodBlock) {
            return periodBlock.sub(cliffBlock);
        } else {
            return block.number.sub(cliffBlock);
        }
    }
}
