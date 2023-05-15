const BigNumber = require('bignumber.js');
const { toBN, toWei, snapshot, restore, getCurrentBlock, advanceBlockTo } = require('../helpers/utils');
const { assert, expect } = require('chai');

const BLOCKS_PER_MONTH = 10; // for testing purpose (overriden in VestingMock)
const PERCENTAGE_100 = 10 ** 27;
const SALES = { SEED: 0, PRIVATE: 1, PUBLIC: 2 };
const PRECISION = 10 ** 25;

describe('Vesting', async () => {
  let vesting, Vesting, token, Token;
  let OWNER, USER1, USER2, USER3, USER4, USER5, USER6, USER7, USER8, USER9;
  let sales, maxSupplies, releasesTGE, cliffs, periods, lockedSupplies;
  let wallets, salesVesting, amounts;

  before('setup', async () => {
    [OWNER, USER1, USER2, USER3, USER4, USER5, USER6, USER7, USER8, USER9] = await ethers.getSigners();

    // STAGE MANAGEMENT
    sales = [SALES.SEED, SALES.PRIVATE, SALES.PUBLIC];
    maxSupplies = [toWei('50000000'), toWei('102500000'), toWei('30000000')];
    releasesTGE = [
      toBN(5).times(PRECISION).toFixed().toString(),
      toBN(5).times(PRECISION).toFixed().toString(),
      toBN(50).times(PRECISION).toFixed().toString(),
    ];

    cliffs = [6, 6, 0];
    periods = [24, 20, 6];
    lockedSupplies = [toWei('50000'), toWei('500000'), toWei('30000')];

    // VESTING MANAGEMENT
    wallets = [
      USER1.address,
      USER2.address,
      USER3.address,
      USER4.address,
      USER5.address,
      USER6.address,
      USER7.address,
      USER8.address,
      USER9.address,
    ];
    salesVesting = [
      SALES.SEED,
      SALES.SEED,
      SALES.SEED,
      SALES.PRIVATE,
      SALES.PRIVATE,
      SALES.PRIVATE,
      SALES.PUBLIC,
      SALES.PUBLIC,
      SALES.PUBLIC,
    ];
    amounts = [
      toWei('10000'),
      toWei('10000'),
      toWei('10000'),
      toWei('100000'),
      toWei('100000'),
      toWei('100000'),
      toWei('10000'),
      toWei('10000'),
      toWei('10000'),
    ];

    Token = await ethers.getContractFactory('Token');
    token = await Token.connect(OWNER).deploy(OWNER.address, toWei('600000'));
    await token.deployed();

    Vesting = await ethers.getContractFactory('VestingMock');
    vesting = await Vesting.connect(OWNER).deploy(token.address);
    await vesting.deployed();

    await token.connect(OWNER).approve(vesting.address, toWei('580000'));

    await snapshot();
  });

  afterEach('revert', async () => {
    await restore();
  });

  describe('setStage', async () => {
    it('setStage() correctly', async () => {
      await vesting.setStage(sales[0], maxSupplies[0], releasesTGE[0], cliffs[0], periods[0]);

      const stageInfoSEED = await vesting.stageInfo(SALES.SEED);
      const stageInfoPRIVATE = await vesting.stageInfo(SALES.PRIVATE);
      const stageInfoPUBLIC = await vesting.stageInfo(SALES.PUBLIC);

      assert.equal(stageInfoSEED.maxSupply, maxSupplies[0]);
      assert.equal(stageInfoSEED.lockedSupply, 0);
      assert.equal(stageInfoSEED.vestedSupply, 0);
      assert.equal(stageInfoSEED.claimedSupply, 0);
      assert.equal(stageInfoSEED.releaseTGE.toString(), releasesTGE[0].toString());
      assert.equal(stageInfoSEED.cliff, cliffs[0]);
      assert.equal(stageInfoSEED.period, periods[0]);

      assert.equal(stageInfoPRIVATE.maxSupply, 0);
      assert.equal(stageInfoPRIVATE.lockedSupply, 0);
      assert.equal(stageInfoPRIVATE.vestedSupply, 0);
      assert.equal(stageInfoPRIVATE.claimedSupply, 0);
      assert.equal(stageInfoPRIVATE.releaseTGE, 0);
      assert.equal(stageInfoPRIVATE.cliff, 0);
      assert.equal(stageInfoPRIVATE.period, 0);

      assert.equal(stageInfoPUBLIC.maxSupply, 0);
      assert.equal(stageInfoPUBLIC.lockedSupply, 0);
      assert.equal(stageInfoPUBLIC.vestedSupply, 0);
      assert.equal(stageInfoPUBLIC.claimedSupply, 0);
      assert.equal(stageInfoPUBLIC.releaseTGE, 0);
      assert.equal(stageInfoPUBLIC.cliff, 0);
      assert.equal(stageInfoPUBLIC.period, 0);
    });
    it('setStageBatch() fail length mismatch', async () => {
      const reason = 'Vesting: Length mismatch';

      const releasesTGE = [5, 5, 50, 25];

      await expect(vesting.setStageBatch(sales, maxSupplies, releasesTGE, cliffs, periods)).to.be.revertedWith(reason);
    });
    it('setStageBatch() correctly', async () => {
      await vesting.setStageBatch(sales, maxSupplies, releasesTGE, cliffs, periods);

      const stageInfoSEED = await vesting.stageInfo(SALES.SEED);
      const stageInfoPRIVATE = await vesting.stageInfo(SALES.PRIVATE);
      const stageInfoPUBLIC = await vesting.stageInfo(SALES.PUBLIC);

      assert.equal(stageInfoSEED.maxSupply, maxSupplies[0]);
      assert.equal(stageInfoSEED.lockedSupply, 0);
      assert.equal(stageInfoSEED.vestedSupply, 0);
      assert.equal(stageInfoSEED.claimedSupply, 0);
      assert.equal(stageInfoSEED.releaseTGE.toString(), releasesTGE[0].toString());
      assert.equal(stageInfoSEED.cliff, cliffs[0]);
      assert.equal(stageInfoSEED.period, periods[0]);

      assert.equal(stageInfoPRIVATE.maxSupply, maxSupplies[1]);
      assert.equal(stageInfoPRIVATE.lockedSupply, 0);
      assert.equal(stageInfoPRIVATE.vestedSupply, 0);
      assert.equal(stageInfoPRIVATE.claimedSupply, 0);
      assert.equal(stageInfoPRIVATE.releaseTGE.toString(), releasesTGE[1].toString());
      assert.equal(stageInfoPRIVATE.cliff, cliffs[1]);
      assert.equal(stageInfoPRIVATE.period, periods[1]);

      assert.equal(stageInfoPUBLIC.maxSupply, maxSupplies[2]);
      assert.equal(stageInfoPUBLIC.lockedSupply, 0);
      assert.equal(stageInfoPUBLIC.vestedSupply, 0);
      assert.equal(stageInfoPUBLIC.claimedSupply, 0);
      assert.equal(stageInfoPUBLIC.releaseTGE.toString(), releasesTGE[2].toString());
      assert.equal(stageInfoPUBLIC.cliff, cliffs[2]);
      assert.equal(stageInfoPUBLIC.period, periods[2]);
    });
  });

  describe('refillStage', async () => {
    beforeEach('setup', async () => {
      await vesting.setStageBatch(sales, maxSupplies, releasesTGE, cliffs, periods);
    });
    it('refillStage() fail amount exceeds max supply', async () => {
      const reason = 'Vesting: Amount exceeds max supply';

      const lockedSupply = toWei('60000000');

      await expect(vesting.refillStage(SALES.SEED, lockedSupply)).to.be.revertedWith(reason);
    });
    it('refillStage() correctly', async () => {
      const balanceOBefore = await token.balanceOf(OWNER.address);
      const balanceVBefore = await token.balanceOf(vesting.address);

      await vesting.refillStage(SALES.SEED, lockedSupplies[0]);
      await vesting.refillStage(SALES.PRIVATE, lockedSupplies[1]);
      await vesting.refillStage(SALES.PUBLIC, lockedSupplies[2]);

      const balanceOAfter = await token.balanceOf(OWNER.address);
      const balanceVAfter = await token.balanceOf(vesting.address);

      assert.equal(
        toBN(balanceOBefore).minus(balanceOAfter).toString(),
        toBN(lockedSupplies[0]).plus(lockedSupplies[1]).plus(lockedSupplies[2]).toString()
      );
      assert.equal(
        toBN(balanceVAfter).minus(balanceVBefore).toString(),
        toBN(lockedSupplies[0]).plus(lockedSupplies[1]).plus(lockedSupplies[2]).toString()
      );

      const lockedSupplySEED = (await vesting.stageInfo(SALES.SEED)).lockedSupply;
      const lockedSupplyPRIVATE = (await vesting.stageInfo(SALES.PRIVATE)).lockedSupply;
      const lockedSupplyPUBLIC = (await vesting.stageInfo(SALES.PUBLIC)).lockedSupply;
      assert.equal(lockedSupplySEED, lockedSupplies[0]);
      assert.equal(lockedSupplyPRIVATE, lockedSupplies[1]);
      assert.equal(lockedSupplyPUBLIC, lockedSupplies[2]);
    });
  });

  describe('emptyStage', async () => {
    beforeEach('setup', async () => {
      await vesting.setStageBatch(sales, maxSupplies, releasesTGE, cliffs, periods);
      await vesting.refillStage(SALES.SEED, lockedSupplies[0]);
      await vesting.refillStage(SALES.PRIVATE, lockedSupplies[1]);
      await vesting.refillStage(SALES.PUBLIC, lockedSupplies[2]);

      const blockNumber = await getCurrentBlock();
      await vesting.setBlockTGE(toBN(blockNumber).plus(toBN(4).times(BLOCKS_PER_MONTH)).toString());

      await vesting.addVestingBatch(wallets, salesVesting, amounts);
    });
    it('emptyStage() correctly', async () => {
      const balanceOBefore = await token.balanceOf(OWNER.address);
      const balanceVBefore = await token.balanceOf(vesting.address);

      let lockedSupplySEED = (await vesting.stageInfo(SALES.SEED)).lockedSupply;
      const vestedSupplySEED = (await vesting.stageInfo(SALES.SEED)).vestedSupply;

      const exceedSEED = toBN(lockedSupplySEED).minus(vestedSupplySEED);
      assert.equal(exceedSEED.toFixed().toString(), toWei('20000'));

      let lockedSupplyPRIVATE = (await vesting.stageInfo(SALES.PRIVATE)).lockedSupply;
      const vestedSupplyPRIVATE = (await vesting.stageInfo(SALES.PRIVATE)).vestedSupply;

      const exceedPRIVATE = toBN(lockedSupplyPRIVATE).minus(vestedSupplyPRIVATE);
      assert.equal(exceedPRIVATE.toFixed().toString(), toWei('200000'));

      await vesting.emptyStage(SALES.SEED);
      await vesting.emptyStage(SALES.PRIVATE);

      const balanceOAfter = await token.balanceOf(OWNER.address);
      const balanceVAfter = await token.balanceOf(vesting.address);

      assert.equal(
        toBN(balanceOAfter).minus(balanceOBefore).toString(),
        toBN(exceedSEED).plus(exceedPRIVATE).toString()
      );
      assert.equal(
        toBN(balanceVBefore).minus(balanceVAfter).toString(),
        toBN(exceedSEED).plus(exceedPRIVATE).toString()
      );

      lockedSupplySEED = (await vesting.stageInfo(SALES.SEED)).lockedSupply;
      lockedSupplyPRIVATE = (await vesting.stageInfo(SALES.PRIVATE)).lockedSupply;
      const lockedSupplyPUBLIC = (await vesting.stageInfo(SALES.PUBLIC)).lockedSupply;
      assert.equal(
        lockedSupplySEED.toString(),
        toBN(amounts[0]).plus(amounts[1]).plus(amounts[2]).toFixed().toString()
      );
      assert.equal(
        lockedSupplyPRIVATE.toString(),
        toBN(amounts[3]).plus(amounts[4]).plus(amounts[5]).toFixed().toString()
      );
      assert.equal(lockedSupplyPUBLIC.toString(), lockedSupplies[2].toString());
    });
  });

  describe('addVesting', async () => {
    beforeEach('setup', async () => {
      await vesting.setStageBatch(sales, maxSupplies, releasesTGE, cliffs, periods);
      await vesting.refillStage(SALES.SEED, lockedSupplies[0]);
      await vesting.refillStage(SALES.PRIVATE, lockedSupplies[1]);
      await vesting.refillStage(SALES.PUBLIC, lockedSupplies[2]);

      const blockNumber = await getCurrentBlock();
      await vesting.setBlockTGE(toBN(blockNumber).plus(toBN(4).times(BLOCKS_PER_MONTH)).toString());
    });
    it('addVesting() fail TGE passed', async () => {
      const reason = 'Vesting: Block TGE has passed';

      const blockTGE = await vesting.blockTGE();
      await advanceBlockTo(toBN(blockTGE).plus(10).toString());

      const amount = toWei('1000');

      await expect(vesting.addVesting(USER1.address, SALES.SEED, amount)).to.be.revertedWith(reason);
    });
    it('addVesting() fail already invested', async () => {
      const reason = 'Vesting: Already invested';

      const amount = toWei('1000');

      await vesting.addVesting(USER1.address, SALES.SEED, amount);

      await expect(vesting.addVesting(USER1.address, SALES.SEED, amount)).to.be.revertedWith(reason);
    });
    it('addVesting() fail insuficient locked supply', async () => {
      const reason = 'Vesting: Insufisant locked supply';

      const amount = toWei('60000000');

      await expect(vesting.addVesting(USER1.address, SALES.SEED, amount)).to.be.revertedWith(reason);
    });
    it('addVesting() correctly', async () => {
      const amount = toWei('1000');

      await vesting.addVesting(USER1.address, SALES.SEED, amount);

      const vestingIndex = await vesting.getVestingIndex(USER1.address, SALES.SEED);
      assert.equal(vestingIndex, 1);

      const countOWNED = await vesting.countOwnedVestings(USER1.address);
      assert.equal(countOWNED, 1);

      const vestingInfo = await vesting.vestingInfo(vestingIndex);
      assert.equal(vestingInfo.wallet, USER1.address);
      assert.equal(vestingInfo.sale, SALES.SEED);
      assert.equal(vestingInfo.amount, amount);
      assert.equal(vestingInfo.paid, 0);

      const stageInfo = await vesting.stageInfo(SALES.SEED);
      assert.equal(stageInfo.vestedSupply, amount);
    });
    it('addVestingBatch() fail TGE passed', async () => {
      const reason = 'Vesting: Block TGE has passed';

      const blockTGE = await vesting.blockTGE();
      await advanceBlockTo(toBN(blockTGE).plus(10).toString());

      await expect(vesting.addVestingBatch(wallets, salesVesting, amounts)).to.be.revertedWith(reason);
    });
    it('addVestingBatch() fail too many arguments', async () => {
      const reason = 'Vesting: Too many arguments';

      const wallets = Array(31).fill(USER1.address);

      await expect(vesting.addVestingBatch(wallets, salesVesting, amounts)).to.be.revertedWith(reason);
    });
    it('addVestingBatch() fail length mismatch', async () => {
      const reason = 'Vesting: Length mismatch';

      const salesVesting = [
        SALES.SEED,
        SALES.SEED,
        SALES.SEED,
        SALES.PRIVATE,
        SALES.PRIVATE,
        SALES.PRIVATE,
        SALES.PUBLIC,
        SALES.PUBLIC,
        SALES.PUBLIC,
        SALES.PRIVATE,
      ];

      await expect(vesting.addVestingBatch(wallets, salesVesting, amounts)).to.be.revertedWith(reason);
    });
    it('addVestingBatch() correctly', async () => {
      await vesting.addVestingBatch(wallets, salesVesting, amounts);

      const vestingIndex3 = await vesting.getVestingIndex(USER3.address, SALES.SEED);
      const vestingIndex6 = await vesting.getVestingIndex(USER6.address, SALES.PRIVATE);

      const countOWNED3 = await vesting.countOwnedVestings(USER3.address);
      const countOWNED6 = await vesting.countOwnedVestings(USER6.address);
      assert.equal(countOWNED3, 1);
      assert.equal(countOWNED6, 1);

      const vestingInfo3 = await vesting.vestingInfo(vestingIndex3);
      assert.equal(vestingInfo3.wallet, USER3.address);
      assert.equal(vestingInfo3.sale, SALES.SEED);
      assert.equal(vestingInfo3.amount, amounts[2]);
      assert.equal(vestingInfo3.paid, 0);

      const vestingInfo6 = await vesting.vestingInfo(vestingIndex6);
      assert.equal(vestingInfo6.wallet, USER6.address);
      assert.equal(vestingInfo6.sale, SALES.PRIVATE);
      assert.equal(vestingInfo6.amount, amounts[5]);
      assert.equal(vestingInfo6.paid, 0);

      const stageInfoSEED = await vesting.stageInfo(SALES.SEED);
      assert.equal(
        stageInfoSEED.vestedSupply.toString(),
        toBN(amounts[0]).plus(amounts[1]).plus(amounts[2]).toFixed().toString()
      );

      const stageInfoPRIVATE = await vesting.stageInfo(SALES.PRIVATE);
      assert.equal(
        stageInfoPRIVATE.vestedSupply.toString(),
        toBN(amounts[3]).plus(amounts[4]).plus(amounts[5]).toFixed().toString()
      );

      const stageInfoPUBLIC = await vesting.stageInfo(SALES.PUBLIC);
      assert.equal(
        stageInfoPUBLIC.vestedSupply.toString(),
        toBN(amounts[6]).plus(amounts[7]).plus(amounts[8]).toFixed().toString()
      );
    });
  });

  describe('cancelVesting', async () => {
    beforeEach('setup', async () => {
      await vesting.setStageBatch(sales, maxSupplies, releasesTGE, cliffs, periods);
      await vesting.refillStage(SALES.SEED, lockedSupplies[0]);
      await vesting.refillStage(SALES.PRIVATE, lockedSupplies[1]);
      await vesting.refillStage(SALES.PUBLIC, lockedSupplies[2]);

      const blockNumber = await getCurrentBlock();
      await vesting.setBlockTGE(toBN(blockNumber).plus(toBN(4).times(BLOCKS_PER_MONTH)).toString());

      await vesting.addVestingBatch(wallets, salesVesting, amounts);
    });
    it('cancelVesting() fail inexistant vesting', async () => {
      const reason = "Vesting: This vesting doesn't exist";

      await expect(vesting.cancelVesting(USER5.address, SALES.SEED)).to.be.revertedWith(reason);
    });
    it('cancelVesting() correctly', async () => {
      let vestingIndex3 = await vesting.getVestingIndex(USER3.address, SALES.SEED);
      let vestingIndex6 = await vesting.getVestingIndex(USER6.address, SALES.PRIVATE);
      assert.equal(vestingIndex3, 3);
      assert.equal(vestingIndex6, 6);

      let countOWNED3 = await vesting.countOwnedVestings(USER3.address);
      let countOWNED6 = await vesting.countOwnedVestings(USER6.address);
      assert.equal(countOWNED3, 1);
      assert.equal(countOWNED6, 1);

      await vesting.cancelVesting(USER3.address, SALES.SEED);
      await vesting.cancelVesting(USER6.address, SALES.PRIVATE);

      vestingIndex3 = await vesting.getVestingIndex(USER3.address, SALES.SEED);
      vestingIndex6 = await vesting.getVestingIndex(USER6.address, SALES.PRIVATE);
      assert.equal(vestingIndex3, 0);
      assert.equal(vestingIndex6, 0);

      countOWNED3 = await vesting.countOwnedVestings(USER3.address);
      countOWNED6 = await vesting.countOwnedVestings(USER6.address);
      assert.equal(countOWNED3, 0);
      assert.equal(countOWNED6, 0);
    });
  });

  describe('balanceOfSale', async () => {
    beforeEach('setup', async () => {
      await vesting.setStageBatch(sales, maxSupplies, releasesTGE, cliffs, periods);
      await vesting.refillStage(SALES.SEED, lockedSupplies[0]);
      await vesting.refillStage(SALES.PRIVATE, lockedSupplies[1]);
      await vesting.refillStage(SALES.PUBLIC, lockedSupplies[2]);

      const blockNumber = await getCurrentBlock();
      await vesting.setBlockTGE(toBN(blockNumber).plus(toBN(4).times(BLOCKS_PER_MONTH)).toString());

      await vesting.addVestingBatch(wallets, salesVesting, amounts);
    });
    it('balanceOfSale() correctly - before TGE / before cliff / before period', async () => {
      const blockTGE = await vesting.blockTGE();

      let blockNumber = await getCurrentBlock();

      const amountToPay1 = await vesting.balanceOfSale(USER1.address, SALES.SEED);
      const amountToPay4 = await vesting.balanceOfSale(USER4.address, SALES.PRIVATE);
      const amountToPay7 = await vesting.balanceOfSale(USER7.address, SALES.PUBLIC);

      assert.isBelow(toBN(blockNumber).toNumber(), blockTGE.toNumber());

      assert.equal(amountToPay1, 0);
      assert.equal(amountToPay4, 0);
      assert.equal(amountToPay7, 0);
    });
    it('balanceOfSale() correctly - after TGE / before cliff / before period', async () => {
      const blockTGE = await vesting.blockTGE();

      const elapse = 1 * BLOCKS_PER_MONTH; // 1 month

      await advanceBlockTo(toBN(blockTGE).plus(elapse).toString());
      let blockNumber = await getCurrentBlock();

      const amountToPay1 = await vesting.balanceOfSale(USER1.address, SALES.SEED);
      const amountToPay4 = await vesting.balanceOfSale(USER4.address, SALES.PRIVATE);
      const amountToPay7 = await vesting.balanceOfSale(USER7.address, SALES.PUBLIC);

      assert.isAbove(toBN(blockNumber).toNumber(), blockTGE.toNumber());
      assert.isBelow(
        toBN(blockNumber).toNumber(),
        toBN(blockTGE).plus(toBN(cliffs[0]).times(BLOCKS_PER_MONTH)).toNumber()
      );
      assert.isBelow(
        toBN(blockNumber).toNumber(),
        toBN(blockTGE).plus(toBN(cliffs[1]).times(BLOCKS_PER_MONTH)).toNumber()
      );
      assert.isAbove(
        toBN(blockNumber).toNumber(),
        toBN(blockTGE).plus(toBN(cliffs[2]).times(BLOCKS_PER_MONTH)).toNumber()
      );

      const expectedTGE1 = toBN(amounts[0]).times(releasesTGE[0]).div(PERCENTAGE_100);
      const expectedTGE4 = toBN(amounts[3]).times(releasesTGE[1]).div(PERCENTAGE_100);
      const expectedTGE7 = toBN(amounts[6]).times(releasesTGE[2]).div(PERCENTAGE_100);

      const diffBlocks7 = toBN(elapse).minus(toBN(cliffs[2]).times(BLOCKS_PER_MONTH));

      const leftAmount7 = toBN(amounts[6]).minus(expectedTGE7);
      const expectedCliff7 = toBN(leftAmount7).times(diffBlocks7).div(toBN(periods[2]).times(BLOCKS_PER_MONTH));

      assert.equal(toBN(amountToPay1).toString(), expectedTGE1.toString());
      assert.equal(toBN(amountToPay4).toString(), expectedTGE4.toString());
      assert.closeTo(
        toBN(amountToPay7).toNumber(),
        toBN(expectedTGE7).plus(expectedCliff7).toNumber(),
        toBN(toWei('0.0000001')).toNumber()
      );
    });
    it('balanceOfSale() correctly - after TGE / after cliff / before period', async () => {
      const blockTGE = await vesting.blockTGE();

      const elapse = 9 * BLOCKS_PER_MONTH; // 9 months

      await advanceBlockTo(toBN(blockTGE).plus(elapse).toString());
      let blockNumber = await getCurrentBlock();

      const amountToPay1 = await vesting.balanceOfSale(USER1.address, SALES.SEED);
      const amountToPay4 = await vesting.balanceOfSale(USER4.address, SALES.PRIVATE);
      const amountToPay7 = await vesting.balanceOfSale(USER7.address, SALES.PUBLIC);

      assert.isAbove(toBN(blockNumber).toNumber(), blockTGE.toNumber());
      assert.isAbove(
        toBN(blockNumber).toNumber(),
        toBN(blockTGE).plus(toBN(cliffs[0]).times(BLOCKS_PER_MONTH)).toNumber()
      );
      assert.isAbove(
        toBN(blockNumber).toNumber(),
        toBN(blockTGE).plus(toBN(cliffs[1]).times(BLOCKS_PER_MONTH)).toNumber()
      );
      assert.isAbove(
        toBN(blockNumber).toNumber(),
        toBN(blockTGE)
          .plus(toBN(cliffs[2]).times(BLOCKS_PER_MONTH))
          .plus(toBN(periods[2]).times(BLOCKS_PER_MONTH))
          .toNumber()
      );

      const expectedTGE1 = toBN(amounts[0]).times(releasesTGE[0]).div(PERCENTAGE_100);
      const expectedTGE4 = toBN(amounts[3]).times(releasesTGE[1]).div(PERCENTAGE_100);

      const diffBlocks1 = toBN(elapse).minus(toBN(cliffs[0]).times(BLOCKS_PER_MONTH));
      const diffBlocks4 = toBN(elapse).minus(toBN(cliffs[1]).times(BLOCKS_PER_MONTH));

      const leftAmount1 = toBN(amounts[0]).minus(expectedTGE1);
      const expectedCliff1 = toBN(leftAmount1).times(diffBlocks1).div(toBN(periods[0]).times(BLOCKS_PER_MONTH));
      const leftAmount4 = toBN(amounts[3]).minus(expectedTGE4);
      const expectedCliff4 = toBN(leftAmount4).times(diffBlocks4).div(toBN(periods[1]).times(BLOCKS_PER_MONTH));

      assert.closeTo(
        toBN(amountToPay1).toNumber(),
        toBN(expectedTGE1).plus(expectedCliff1).toNumber(),
        toBN(toWei('0.0000001')).toNumber()
      );
      assert.closeTo(
        toBN(amountToPay4).toNumber(),
        toBN(expectedTGE4).plus(expectedCliff4).toNumber(),
        toBN(toWei('0.0000001')).toNumber()
      );
      assert.equal(toBN(amountToPay7).toString(), toBN(amounts[6]).toString());
    });
    it('balanceOfSale() correctly - after TGE / after cliff + claim / before period', async () => {
      const blockTGE = await vesting.blockTGE();

      const elapse = 9 * BLOCKS_PER_MONTH; // 9 months

      const expectedTGE1 = toBN(amounts[0]).times(releasesTGE[0]).div(PERCENTAGE_100);
      const leftAmount1 = toBN(amounts[0]).minus(expectedTGE1);

      await advanceBlockTo(toBN(blockTGE).plus(elapse).minus(1).toString());
      await vesting.connect(USER1).claim();

      await advanceBlockTo(toBN(blockTGE).plus(elapse).plus(BLOCKS_PER_MONTH).toString());

      const amountToPay12 = await vesting.balanceOfSale(USER1.address, SALES.SEED);
      const diffBlocks12 = toBN(BLOCKS_PER_MONTH);
      const expectedCliff12 = toBN(leftAmount1).times(diffBlocks12).div(toBN(periods[0]).times(BLOCKS_PER_MONTH));

      assert.closeTo(
        toBN(amountToPay12).toNumber(),
        toBN(expectedCliff12).toNumber(),
        toBN(toWei('0.0000001')).toNumber()
      );
    });
    it('balanceOfSale() correctly - after TGE / after cliff / after period', async () => {
      const blockTGE = await vesting.blockTGE();

      const elapse = 27 * BLOCKS_PER_MONTH; // 27 months

      await advanceBlockTo(toBN(blockTGE).plus(elapse).toString());
      let blockNumber = await getCurrentBlock();

      const amountToPay1 = await vesting.balanceOfSale(USER1.address, SALES.SEED);
      const amountToPay4 = await vesting.balanceOfSale(USER4.address, SALES.PRIVATE);
      const amountToPay7 = await vesting.balanceOfSale(USER7.address, SALES.PUBLIC);

      assert.isAbove(toBN(blockNumber).toNumber(), blockTGE.toNumber());
      assert.isBelow(
        toBN(blockNumber).toNumber(),
        toBN(blockTGE)
          .plus(toBN(cliffs[0]).times(BLOCKS_PER_MONTH))
          .plus(toBN(periods[0]).times(BLOCKS_PER_MONTH))
          .toNumber()
      );
      assert.isAbove(
        toBN(blockNumber).toNumber(),
        toBN(blockTGE)
          .plus(toBN(cliffs[1]).times(BLOCKS_PER_MONTH))
          .plus(toBN(periods[1]).times(BLOCKS_PER_MONTH))
          .toNumber()
      );
      assert.isAbove(
        toBN(blockNumber).toNumber(),
        toBN(blockTGE)
          .plus(toBN(cliffs[2]).times(BLOCKS_PER_MONTH))
          .plus(toBN(periods[2]).times(BLOCKS_PER_MONTH))
          .toNumber()
      );

      const expectedTGE1 = toBN(amounts[0]).times(releasesTGE[0]).div(PERCENTAGE_100);
      const diffBlocks1 = toBN(elapse).minus(toBN(cliffs[0]).times(BLOCKS_PER_MONTH));
      const leftAmount1 = toBN(amounts[0]).minus(expectedTGE1);
      const expectedCliff1 = toBN(leftAmount1).times(diffBlocks1).div(toBN(periods[0]).times(BLOCKS_PER_MONTH));

      assert.closeTo(
        toBN(amountToPay1).toNumber(),
        toBN(expectedTGE1).plus(expectedCliff1).toNumber(),
        toBN(toWei('0.0000001')).toNumber()
      );
      assert.equal(toBN(amountToPay4).toString(), toBN(amounts[3]).toString());
      assert.equal(toBN(amountToPay7).toString(), toBN(amounts[6]).toString());
    });
    it('balanceOfSale() correctly - end', async () => {
      const blockTGE = await vesting.blockTGE();

      const elapse = 32 * BLOCKS_PER_MONTH; // 32 months

      await advanceBlockTo(toBN(blockTGE).plus(elapse).toString());
      let blockNumber = await getCurrentBlock();

      const amountToPay1 = await vesting.balanceOfSale(USER1.address, SALES.SEED);
      const amountToPay4 = await vesting.balanceOfSale(USER4.address, SALES.PRIVATE);
      const amountToPay7 = await vesting.balanceOfSale(USER7.address, SALES.PUBLIC);

      assert.isAbove(toBN(blockNumber).toNumber(), blockTGE.toNumber());
      assert.isAbove(
        toBN(blockNumber).toNumber(),
        toBN(blockTGE)
          .plus(toBN(cliffs[0]).times(BLOCKS_PER_MONTH))
          .plus(toBN(periods[0]).times(BLOCKS_PER_MONTH))
          .toNumber()
      );
      assert.isAbove(
        toBN(blockNumber).toNumber(),
        toBN(blockTGE)
          .plus(toBN(cliffs[1]).times(BLOCKS_PER_MONTH))
          .plus(toBN(periods[1]).times(BLOCKS_PER_MONTH))
          .toNumber()
      );
      assert.isAbove(
        toBN(blockNumber).toNumber(),
        toBN(blockTGE)
          .plus(toBN(cliffs[2]).times(BLOCKS_PER_MONTH))
          .plus(toBN(periods[2]).times(BLOCKS_PER_MONTH))
          .toNumber()
      );

      assert.equal(toBN(amountToPay1).toNumber(), toBN(amounts[0]).toString());
      assert.equal(toBN(amountToPay4).toString(), toBN(amounts[3]).toString());
      assert.equal(toBN(amountToPay7).toString(), toBN(amounts[6]).toString());
    });
  });

  describe('claim', async () => {
    beforeEach('setup', async () => {
      await vesting.setStageBatch(sales, maxSupplies, releasesTGE, cliffs, periods);
      await vesting.refillStage(SALES.SEED, lockedSupplies[0]);
      await vesting.refillStage(SALES.PRIVATE, lockedSupplies[1]);
      await vesting.refillStage(SALES.PUBLIC, lockedSupplies[2]);

      const blockNumber = await getCurrentBlock();
      await vesting.setBlockTGE(toBN(blockNumber).plus(toBN(4).times(BLOCKS_PER_MONTH)).toString());

      await vesting.addVestingBatch(wallets, salesVesting, amounts);
    });
    it('claim() correctly', async () => {
      const blockTGE = await vesting.blockTGE();
      const vestingIndex2 = await vesting.getVestingIndex(USER2.address, SALES.SEED);

      const balanceUBefore = await token.balanceOf(USER2.address);
      const balanceVBefore = await token.balanceOf(vesting.address);

      let vestingInfo2 = await vesting.vestingInfo(vestingIndex2);
      assert.equal(vestingInfo2.wallet, USER2.address);
      assert.equal(vestingInfo2.sale, SALES.SEED);
      assert.equal(vestingInfo2.amount, amounts[2]);
      assert.equal(vestingInfo2.paid, 0);

      const elapse = 7 * BLOCKS_PER_MONTH; // 7 months
      const expectedTGE1 = toBN(amounts[0]).times(releasesTGE[0]).div(PERCENTAGE_100);
      const diffBlocks1 = toBN(elapse).minus(toBN(cliffs[0]).times(BLOCKS_PER_MONTH));
      const leftAmount1 = toBN(amounts[0]).minus(expectedTGE1);
      const expectedCliff1 = toBN(leftAmount1).times(diffBlocks1).div(toBN(periods[0]).times(BLOCKS_PER_MONTH));
      const amountToGet = toBN(expectedTGE1).plus(expectedCliff1).toNumber();

      await advanceBlockTo(toBN(blockTGE).plus(elapse).minus(1).toString());
      await vesting.connect(USER2).claim();

      const balanceUAfter = await token.balanceOf(USER2.address);
      const balanceVAfter = await token.balanceOf(vesting.address);

      assert.closeTo(
        toBN(balanceUAfter).minus(balanceUBefore).toNumber(),
        toBN(amountToGet).toNumber(),
        toBN(toWei('0.0000001')).toNumber()
      );
      assert.closeTo(
        toBN(balanceVBefore).minus(balanceVAfter).toNumber(),
        toBN(amountToGet).toNumber(),
        toBN(toWei('0.0000001')).toNumber()
      );

      vestingInfo2 = await vesting.vestingInfo(vestingIndex2);
      assert.equal(vestingInfo2.wallet, USER2.address);
      assert.equal(vestingInfo2.sale, SALES.SEED);
      assert.equal(vestingInfo2.amount, amounts[2]);
      assert.closeTo(
        toBN(vestingInfo2.paid).toNumber(),
        toBN(amountToGet).toNumber(),
        toBN(toWei('0.0000001')).toNumber()
      );
    });
    it('claim() correctly twice', async () => {
      const blockTGE = await vesting.blockTGE();
      const vestingIndex2 = await vesting.getVestingIndex(USER2.address, SALES.SEED);

      let vestingInfo2 = await vesting.vestingInfo(vestingIndex2);
      assert.equal(vestingInfo2.wallet, USER2.address);
      assert.equal(vestingInfo2.sale, SALES.SEED);
      assert.equal(vestingInfo2.amount, amounts[2]);
      assert.equal(vestingInfo2.paid, 0);

      const elapse1 = 7 * BLOCKS_PER_MONTH; // 7 months
      const expectedTGE1 = toBN(amounts[0]).times(releasesTGE[0]).div(PERCENTAGE_100);
      const diffBlocks1 = toBN(elapse1).minus(toBN(cliffs[0]).times(BLOCKS_PER_MONTH));
      const leftAmount1 = toBN(amounts[0]).minus(expectedTGE1);
      const expectedCliff1 = toBN(leftAmount1).times(diffBlocks1).div(toBN(periods[0]).times(BLOCKS_PER_MONTH));
      const amountToGet1 = toBN(expectedTGE1).plus(expectedCliff1).toNumber();

      await advanceBlockTo(toBN(blockTGE).plus(elapse1).minus(1).toString());
      await vesting.connect(USER2).claim();

      vestingInfo2 = await vesting.vestingInfo(vestingIndex2);
      assert.equal(vestingInfo2.wallet, USER2.address);
      assert.equal(vestingInfo2.sale, SALES.SEED);
      assert.equal(vestingInfo2.amount, amounts[2]);
      assert.closeTo(
        toBN(vestingInfo2.paid).toNumber(),
        toBN(amountToGet1).toNumber(),
        toBN(toWei('0.0000001')).toNumber()
      );

      const balanceUBefore = await token.balanceOf(USER2.address);
      const balanceVBefore = await token.balanceOf(vesting.address);

      const elapse2 = 19 * BLOCKS_PER_MONTH; // 19 months
      const diffBlocks2 = toBN(elapse2).minus(toBN(cliffs[0]).times(BLOCKS_PER_MONTH));
      const expectedCliff2 = toBN(leftAmount1).times(diffBlocks2).div(toBN(periods[0]).times(BLOCKS_PER_MONTH));
      const amountToGet2 = toBN(expectedCliff2).minus(expectedCliff1).toNumber();

      await advanceBlockTo(toBN(blockTGE).plus(elapse2).minus(1).toString());
      await vesting.connect(USER2).claim();

      const balanceUAfter = await token.balanceOf(USER2.address);
      const balanceVAfter = await token.balanceOf(vesting.address);

      assert.closeTo(
        toBN(balanceUAfter).minus(balanceUBefore).toNumber(),
        toBN(amountToGet2).toNumber(),
        toBN(toWei('0.0000001')).toNumber()
      );
      assert.closeTo(
        toBN(balanceVBefore).minus(balanceVAfter).toNumber(),
        toBN(amountToGet2).toNumber(),
        toBN(toWei('0.0000001')).toNumber()
      );

      vestingInfo2 = await vesting.vestingInfo(vestingIndex2);
      assert.equal(vestingInfo2.wallet, USER2.address);
      assert.equal(vestingInfo2.sale, SALES.SEED);
      assert.equal(vestingInfo2.amount, amounts[2]);
      assert.closeTo(
        toBN(vestingInfo2.paid).toNumber(),
        toBN(amountToGet1).plus(amountToGet2).toNumber(),
        toBN(toWei('0.0000001')).toNumber()
      );
    });
  });

  describe('test getters', async () => {
    beforeEach('setup', async () => {
      await vesting.setStageBatch(sales, maxSupplies, releasesTGE, cliffs, periods);
      await vesting.refillStage(SALES.SEED, lockedSupplies[0]);
      await vesting.refillStage(SALES.PRIVATE, lockedSupplies[1]);
      await vesting.refillStage(SALES.PUBLIC, lockedSupplies[2]);

      const blockNumber = await getCurrentBlock();
      await vesting.setBlockTGE(toBN(blockNumber).plus(toBN(4).times(BLOCKS_PER_MONTH)).toString());
    });
    it('getStageInfo() correctly - no vesting / no claim / no cancel / no empty ', async () => {
      const stageInfoSEED = await vesting.getStageInfo(SALES.SEED);
      const stageInfoPRIVATE = await vesting.getStageInfo(SALES.PRIVATE);
      const stageInfoPUBLIC = await vesting.getStageInfo(SALES.PUBLIC);

      assert.equal(stageInfoSEED.maxSupply, maxSupplies[0]);
      assert.equal(stageInfoSEED.lockedSupply, lockedSupplies[0]);
      assert.equal(stageInfoSEED.currentSupply, lockedSupplies[0]);
      assert.equal(stageInfoSEED.vestedSupply, 0);
      assert.equal(stageInfoSEED.claimedSupply, 0);
      assert.equal(stageInfoSEED.unalocatedSupply, lockedSupplies[0]);

      assert.equal(stageInfoPRIVATE.maxSupply, maxSupplies[1]);
      assert.equal(stageInfoPRIVATE.lockedSupply, lockedSupplies[1]);
      assert.equal(stageInfoPRIVATE.currentSupply, lockedSupplies[1]);
      assert.equal(stageInfoPRIVATE.vestedSupply, 0);
      assert.equal(stageInfoPRIVATE.claimedSupply, 0);
      assert.equal(stageInfoPRIVATE.unalocatedSupply, lockedSupplies[1]);

      assert.equal(stageInfoPUBLIC.maxSupply, maxSupplies[2]);
      assert.equal(stageInfoPUBLIC.lockedSupply, lockedSupplies[2]);
      assert.equal(stageInfoPUBLIC.currentSupply, lockedSupplies[2]);
      assert.equal(stageInfoPUBLIC.vestedSupply, 0);
      assert.equal(stageInfoPUBLIC.claimedSupply, 0);
      assert.equal(stageInfoPUBLIC.unalocatedSupply, lockedSupplies[2]);
    });
    it('getStageInfo() correctly - vesting / no claim / no cancel / no empty ', async () => {
      await vesting.addVestingBatch(wallets, salesVesting, amounts);

      const blockTGE = await vesting.blockTGE();
      const elapse = 9 * BLOCKS_PER_MONTH; // 9 months
      await advanceBlockTo(toBN(blockTGE).plus(elapse).toString());

      const stageInfoSEED = await vesting.getStageInfo(SALES.SEED);
      const stageInfoPRIVATE = await vesting.getStageInfo(SALES.PRIVATE);
      const stageInfoPUBLIC = await vesting.getStageInfo(SALES.PUBLIC);

      assert.equal(stageInfoSEED.maxSupply, maxSupplies[0]);
      assert.equal(stageInfoSEED.lockedSupply, lockedSupplies[0]);
      assert.equal(stageInfoSEED.currentSupply, lockedSupplies[0]);
      assert.equal(
        stageInfoSEED.vestedSupply.toString(),
        toBN(amounts[0]).plus(amounts[1]).plus(amounts[2]).toFixed().toString()
      );
      assert.equal(stageInfoSEED.claimedSupply, 0);
      assert.equal(
        stageInfoSEED.unalocatedSupply.toString(),
        toBN(lockedSupplies[0]).minus(toBN(amounts[0]).plus(amounts[1]).plus(amounts[2])).toFixed().toString()
      );

      assert.equal(stageInfoPRIVATE.maxSupply, maxSupplies[1]);
      assert.equal(stageInfoPRIVATE.lockedSupply, lockedSupplies[1]);
      assert.equal(stageInfoPRIVATE.currentSupply, lockedSupplies[1]);
      assert.equal(
        stageInfoPRIVATE.vestedSupply.toString(),
        toBN(amounts[3]).plus(amounts[4]).plus(amounts[5]).toFixed().toString()
      );
      assert.equal(stageInfoPRIVATE.claimedSupply, 0);
      assert.equal(
        stageInfoPRIVATE.unalocatedSupply.toString(),
        toBN(lockedSupplies[1]).minus(toBN(amounts[3]).plus(amounts[4]).plus(amounts[5])).toFixed().toString()
      );

      assert.equal(stageInfoPUBLIC.maxSupply, maxSupplies[2]);
      assert.equal(stageInfoPUBLIC.lockedSupply, lockedSupplies[2]);
      assert.equal(stageInfoPUBLIC.currentSupply, lockedSupplies[2]);
      assert.equal(
        stageInfoPUBLIC.vestedSupply.toString(),
        toBN(amounts[6]).plus(amounts[7]).plus(amounts[8]).toFixed().toString()
      );
      assert.equal(stageInfoPUBLIC.claimedSupply, 0);
      assert.equal(
        stageInfoPUBLIC.unalocatedSupply.toString(),
        toBN(lockedSupplies[2]).minus(toBN(amounts[6]).plus(amounts[7]).plus(amounts[8])).toFixed().toString()
      );
    });
    it('getStageInfo() correctly - vesting / no claim / cancel / no empty ', async () => {
      await vesting.addVestingBatch(wallets, salesVesting, amounts);

      const blockTGE = await vesting.blockTGE();
      const elapse = 9 * BLOCKS_PER_MONTH; // 9 months
      await advanceBlockTo(toBN(blockTGE).plus(elapse).toString());

      await vesting.cancelVesting(USER1.address, SALES.SEED);

      const stageInfoSEED = await vesting.getStageInfo(SALES.SEED);
      const stageInfoPRIVATE = await vesting.getStageInfo(SALES.PRIVATE);
      const stageInfoPUBLIC = await vesting.getStageInfo(SALES.PUBLIC);

      assert.equal(stageInfoSEED.maxSupply, maxSupplies[0]);
      assert.equal(stageInfoSEED.lockedSupply, lockedSupplies[0]);
      assert.equal(stageInfoSEED.currentSupply, lockedSupplies[0]);
      assert.equal(stageInfoSEED.vestedSupply.toString(), toBN(amounts[1]).plus(amounts[2]).toFixed().toString());
      assert.equal(stageInfoSEED.claimedSupply, 0);
      assert.equal(
        stageInfoSEED.unalocatedSupply.toString(),
        toBN(lockedSupplies[0]).minus(toBN(amounts[1]).plus(amounts[2])).toFixed().toString()
      );

      assert.equal(stageInfoPRIVATE.maxSupply, maxSupplies[1]);
      assert.equal(stageInfoPRIVATE.lockedSupply, lockedSupplies[1]);
      assert.equal(stageInfoPRIVATE.currentSupply, lockedSupplies[1]);
      assert.equal(
        stageInfoPRIVATE.vestedSupply.toString(),
        toBN(amounts[3]).plus(amounts[4]).plus(amounts[5]).toFixed().toString()
      );
      assert.equal(stageInfoPRIVATE.claimedSupply, 0);
      assert.equal(
        stageInfoPRIVATE.unalocatedSupply.toString(),
        toBN(lockedSupplies[1]).minus(toBN(amounts[3]).plus(amounts[4]).plus(amounts[5])).toFixed().toString()
      );

      assert.equal(stageInfoPUBLIC.maxSupply, maxSupplies[2]);
      assert.equal(stageInfoPUBLIC.lockedSupply, lockedSupplies[2]);
      assert.equal(stageInfoPUBLIC.currentSupply, lockedSupplies[2]);
      assert.equal(
        stageInfoPUBLIC.vestedSupply.toString(),
        toBN(amounts[6]).plus(amounts[7]).plus(amounts[8]).toFixed().toString()
      );
      assert.equal(stageInfoPUBLIC.claimedSupply, 0);
      assert.equal(
        stageInfoPUBLIC.unalocatedSupply.toString(),
        toBN(lockedSupplies[2]).minus(toBN(amounts[6]).plus(amounts[7]).plus(amounts[8])).toFixed().toString()
      );
    });
    it('getStageInfo() correctly - vesting / claim / no cancel / no empty ', async () => {
      await vesting.addVestingBatch(wallets, salesVesting, amounts);

      const blockTGE = await vesting.blockTGE();
      const elapse = 9 * BLOCKS_PER_MONTH; // 9 months
      await advanceBlockTo(toBN(blockTGE).plus(elapse).toString());

      const balanceU1Before = await token.balanceOf(USER1.address);
      const balanceU4Before = await token.balanceOf(USER4.address);
      const balanceU7Before = await token.balanceOf(USER7.address);

      await vesting.connect(USER1).claim();
      await vesting.connect(USER4).claim();
      await vesting.connect(USER7).claim();

      const balanceU1After = await token.balanceOf(USER1.address);
      const balanceU4After = await token.balanceOf(USER4.address);
      const balanceU7After = await token.balanceOf(USER7.address);

      const amountSEED = toBN(balanceU1After).minus(balanceU1Before);
      const amountPRIVATE = toBN(balanceU4After).minus(balanceU4Before);
      const amountPUBLIC = toBN(balanceU7After).minus(balanceU7Before);

      const stageInfoSEED = await vesting.getStageInfo(SALES.SEED);
      const stageInfoPRIVATE = await vesting.getStageInfo(SALES.PRIVATE);
      const stageInfoPUBLIC = await vesting.getStageInfo(SALES.PUBLIC);

      assert.equal(stageInfoSEED.maxSupply, maxSupplies[0]);
      assert.equal(stageInfoSEED.lockedSupply, lockedSupplies[0]);
      assert.closeTo(
        toBN(stageInfoSEED.currentSupply).toNumber(),
        toBN(lockedSupplies[0]).minus(amountSEED).toNumber(),
        toBN(toWei('0.0000001')).toNumber()
      );
      assert.equal(
        stageInfoSEED.vestedSupply.toString(),
        toBN(amounts[0]).plus(amounts[1]).plus(amounts[2]).toFixed().toString()
      );
      assert.closeTo(
        toBN(stageInfoSEED.claimedSupply).toNumber(),
        amountSEED.toNumber(),
        toBN(toWei('0.0000001')).toNumber()
      );
      assert.equal(
        stageInfoSEED.unalocatedSupply.toString(),
        toBN(lockedSupplies[0]).minus(toBN(amounts[0]).plus(amounts[1]).plus(amounts[2])).toFixed().toString()
      );

      assert.equal(stageInfoPRIVATE.maxSupply, maxSupplies[1]);
      assert.equal(stageInfoPRIVATE.lockedSupply, lockedSupplies[1]);
      assert.closeTo(
        toBN(stageInfoPRIVATE.currentSupply).toNumber(),
        toBN(lockedSupplies[1]).minus(amountPRIVATE).toNumber(),
        toBN(toWei('0.0000001')).toNumber()
      );
      assert.equal(
        stageInfoPRIVATE.vestedSupply.toString(),
        toBN(amounts[3]).plus(amounts[4]).plus(amounts[5]).toFixed().toString()
      );
      assert.closeTo(
        toBN(stageInfoPRIVATE.claimedSupply).toNumber(),
        amountPRIVATE.toNumber(),
        toBN(toWei('0.0000001')).toNumber()
      );
      assert.equal(
        stageInfoPRIVATE.unalocatedSupply.toString(),
        toBN(lockedSupplies[1]).minus(toBN(amounts[3]).plus(amounts[4]).plus(amounts[5])).toFixed().toString()
      );

      assert.equal(stageInfoPUBLIC.maxSupply, maxSupplies[2]);
      assert.equal(stageInfoPUBLIC.lockedSupply, lockedSupplies[2]);
      assert.closeTo(
        toBN(stageInfoPUBLIC.currentSupply).toNumber(),
        toBN(lockedSupplies[2]).minus(amountPUBLIC).toNumber(),
        toBN(toWei('0.0000001')).toNumber()
      );
      assert.equal(
        stageInfoPUBLIC.vestedSupply.toString(),
        toBN(amounts[6]).plus(amounts[7]).plus(amounts[8]).toFixed().toString()
      );
      assert.closeTo(
        toBN(stageInfoPUBLIC.claimedSupply).toNumber(),
        amountPUBLIC.toNumber(),
        toBN(toWei('0.0000001')).toNumber()
      );
      assert.equal(
        stageInfoPUBLIC.unalocatedSupply.toString(),
        toBN(lockedSupplies[2]).minus(toBN(amounts[6]).plus(amounts[7]).plus(amounts[8])).toFixed().toString()
      );
    });
    it('getStageInfo() correctly - vesting / no claim / no cancel / empty ', async () => {
      await vesting.addVestingBatch(wallets, salesVesting, amounts);

      const blockTGE = await vesting.blockTGE();
      const elapse = 9 * BLOCKS_PER_MONTH; // 9 months
      await advanceBlockTo(toBN(blockTGE).plus(elapse).toString());

      await vesting.emptyStage(SALES.SEED);
      await vesting.emptyStage(SALES.PRIVATE);
      await vesting.emptyStage(SALES.PUBLIC);

      const stageInfoSEED = await vesting.getStageInfo(SALES.SEED);
      const stageInfoPRIVATE = await vesting.getStageInfo(SALES.PRIVATE);
      const stageInfoPUBLIC = await vesting.getStageInfo(SALES.PUBLIC);

      assert.equal(stageInfoSEED.maxSupply, maxSupplies[0]);
      assert.equal(
        stageInfoSEED.lockedSupply.toString(),
        toBN(amounts[0]).plus(amounts[1]).plus(amounts[2]).toFixed().toString()
      );
      assert.equal(
        stageInfoSEED.currentSupply.toString(),
        toBN(amounts[0]).plus(amounts[1]).plus(amounts[2]).toFixed().toString()
      );
      assert.equal(
        stageInfoSEED.vestedSupply.toString(),
        toBN(amounts[0]).plus(amounts[1]).plus(amounts[2]).toFixed().toString()
      );
      assert.equal(stageInfoSEED.claimedSupply, 0);
      assert.equal(stageInfoSEED.unalocatedSupply, 0);

      assert.equal(stageInfoPRIVATE.maxSupply, maxSupplies[1]);
      assert.equal(
        stageInfoPRIVATE.lockedSupply.toString(),
        toBN(amounts[3]).plus(amounts[4]).plus(amounts[5]).toFixed().toString()
      );
      assert.equal(
        stageInfoPRIVATE.currentSupply.toString(),
        toBN(amounts[3]).plus(amounts[4]).plus(amounts[5]).toFixed().toString()
      );
      assert.equal(
        stageInfoPRIVATE.vestedSupply.toString(),
        toBN(amounts[3]).plus(amounts[4]).plus(amounts[5]).toFixed().toString()
      );
      assert.equal(stageInfoPRIVATE.claimedSupply, 0);
      assert.equal(stageInfoPRIVATE.unalocatedSupply, 0);

      assert.equal(stageInfoPUBLIC.maxSupply, maxSupplies[2]);
      assert.equal(
        stageInfoPUBLIC.lockedSupply.toString(),
        toBN(amounts[6]).plus(amounts[7]).plus(amounts[8]).toFixed().toString()
      );
      assert.equal(
        stageInfoPUBLIC.currentSupply.toString(),
        toBN(amounts[6]).plus(amounts[7]).plus(amounts[8]).toFixed().toString()
      );
      assert.equal(
        stageInfoPUBLIC.vestedSupply.toString(),
        toBN(amounts[6]).plus(amounts[7]).plus(amounts[8]).toFixed().toString()
      );
      assert.equal(stageInfoPUBLIC.claimedSupply, 0);
      assert.equal(stageInfoPUBLIC.unalocatedSupply, 0);
    });
    it('getStageInfo() correctly - vesting / claim / no cancel / empty ', async () => {
      await vesting.addVestingBatch(wallets, salesVesting, amounts);

      const blockTGE = await vesting.blockTGE();
      const elapse = 9 * BLOCKS_PER_MONTH; // 9 months
      await advanceBlockTo(toBN(blockTGE).plus(elapse).toString());

      const balanceU1Before = await token.balanceOf(USER1.address);
      const balanceU4Before = await token.balanceOf(USER4.address);
      const balanceU7Before = await token.balanceOf(USER7.address);

      await vesting.connect(USER1).claim();
      await vesting.connect(USER4).claim();
      await vesting.connect(USER7).claim();

      const balanceU1After = await token.balanceOf(USER1.address);
      const balanceU4After = await token.balanceOf(USER4.address);
      const balanceU7After = await token.balanceOf(USER7.address);

      const amountSEED = toBN(balanceU1After).minus(balanceU1Before);
      const amountPRIVATE = toBN(balanceU4After).minus(balanceU4Before);
      const amountPUBLIC = toBN(balanceU7After).minus(balanceU7Before);

      await vesting.emptyStage(SALES.SEED);
      await vesting.emptyStage(SALES.PRIVATE);
      await vesting.emptyStage(SALES.PUBLIC);

      const stageInfoSEED = await vesting.getStageInfo(SALES.SEED);
      const stageInfoPRIVATE = await vesting.getStageInfo(SALES.PRIVATE);
      const stageInfoPUBLIC = await vesting.getStageInfo(SALES.PUBLIC);

      assert.equal(stageInfoSEED.maxSupply, maxSupplies[0]);
      assert.equal(
        stageInfoSEED.lockedSupply.toString(),
        toBN(amounts[0]).plus(amounts[1]).plus(amounts[2]).toFixed().toString()
      );
      assert.closeTo(
        toBN(stageInfoSEED.currentSupply).toNumber(),
        toBN(amounts[0]).plus(amounts[1]).plus(amounts[2]).minus(amountSEED).toNumber(),
        toBN(toWei('0.0000001')).toNumber()
      );
      assert.equal(
        stageInfoSEED.vestedSupply.toString(),
        toBN(amounts[0]).plus(amounts[1]).plus(amounts[2]).toFixed().toString()
      );
      assert.closeTo(
        toBN(stageInfoSEED.claimedSupply).toNumber(),
        amountSEED.toNumber(),
        toBN(toWei('0.0000001')).toNumber()
      );
      assert.equal(stageInfoSEED.unalocatedSupply, 0);

      assert.equal(stageInfoPRIVATE.maxSupply, maxSupplies[1]);
      assert.equal(
        stageInfoPRIVATE.lockedSupply.toString(),
        toBN(amounts[3]).plus(amounts[4]).plus(amounts[5]).toFixed().toString()
      );
      assert.closeTo(
        toBN(stageInfoPRIVATE.currentSupply).toNumber(),
        toBN(amounts[3]).plus(amounts[4]).plus(amounts[5]).minus(amountPRIVATE).toNumber(),
        toBN(toWei('0.0000001')).toNumber()
      );
      assert.equal(
        stageInfoPRIVATE.vestedSupply.toString(),
        toBN(amounts[3]).plus(amounts[4]).plus(amounts[5]).toFixed().toString()
      );
      assert.closeTo(
        toBN(stageInfoPRIVATE.claimedSupply).toNumber(),
        amountPRIVATE.toNumber(),
        toBN(toWei('0.0000001')).toNumber()
      );
      assert.equal(stageInfoPRIVATE.unalocatedSupply, 0);

      assert.equal(stageInfoPUBLIC.maxSupply, maxSupplies[2]);
      assert.equal(
        stageInfoPUBLIC.lockedSupply.toString(),
        toBN(amounts[6]).plus(amounts[7]).plus(amounts[8]).toFixed().toString()
      );
      assert.closeTo(
        toBN(stageInfoPUBLIC.currentSupply).toNumber(),
        toBN(amounts[6]).plus(amounts[7]).plus(amounts[8]).minus(amountPUBLIC).toNumber(),
        toBN(toWei('0.0000001')).toNumber()
      );
      assert.equal(
        stageInfoPUBLIC.vestedSupply.toString(),
        toBN(amounts[6]).plus(amounts[7]).plus(amounts[8]).toFixed().toString()
      );
      assert.closeTo(
        toBN(stageInfoPUBLIC.claimedSupply).toNumber(),
        amountPUBLIC.toNumber(),
        toBN(toWei('0.0000001')).toNumber()
      );
      assert.equal(stageInfoPUBLIC.unalocatedSupply, 0);
    });
    it('getStageInfo() correctly - vesting / claim / cancel / empty ', async () => {
      await vesting.addVestingBatch(wallets, salesVesting, amounts);

      const blockTGE = await vesting.blockTGE();
      const elapse = 9 * BLOCKS_PER_MONTH; // 9 months
      await advanceBlockTo(toBN(blockTGE).plus(elapse).toString());

      await vesting.emptyStage(SALES.SEED);
      await vesting.emptyStage(SALES.PRIVATE);
      await vesting.emptyStage(SALES.PUBLIC);

      const balanceU1Before = await token.balanceOf(USER1.address);
      const balanceU4Before = await token.balanceOf(USER4.address);
      const balanceU7Before = await token.balanceOf(USER7.address);

      await vesting.connect(USER1).claim();
      await vesting.connect(USER4).claim();
      await vesting.connect(USER7).claim();

      const balanceU1After = await token.balanceOf(USER1.address);
      const balanceU4After = await token.balanceOf(USER4.address);
      const balanceU7After = await token.balanceOf(USER7.address);

      const amountSEED = toBN(balanceU1After).minus(balanceU1Before);
      const amountPRIVATE = toBN(balanceU4After).minus(balanceU4Before);
      const amountPUBLIC = toBN(balanceU7After).minus(balanceU7Before);

      await vesting.cancelVesting(USER1.address, SALES.SEED);

      const stageInfoSEED = await vesting.getStageInfo(SALES.SEED);
      const stageInfoPRIVATE = await vesting.getStageInfo(SALES.PRIVATE);
      const stageInfoPUBLIC = await vesting.getStageInfo(SALES.PUBLIC);

      assert.equal(stageInfoSEED.maxSupply, maxSupplies[0]);
      assert.equal(
        stageInfoSEED.lockedSupply.toString(),
        toBN(amounts[0]).plus(amounts[1]).plus(amounts[2]).toFixed().toString()
      );
      assert.closeTo(
        toBN(stageInfoSEED.currentSupply).toNumber(),
        toBN(amounts[0]).plus(amounts[1]).plus(amounts[2]).minus(amountSEED).toNumber(),
        toBN(toWei('0.0000001')).toNumber()
      );
      assert.closeTo(
        toBN(stageInfoSEED.vestedSupply).toNumber(),
        toBN(amountSEED).plus(amounts[1]).plus(amounts[2]).toNumber(),
        toBN(toWei('0.0000001')).toNumber()
      );
      assert.closeTo(
        toBN(stageInfoSEED.claimedSupply).toNumber(),
        amountSEED.toNumber(),
        toBN(toWei('0.0000001')).toNumber()
      );
      assert.closeTo(
        toBN(stageInfoSEED.unalocatedSupply).toNumber(),
        toBN(amounts[0]).minus(amountSEED).toNumber(),
        toBN(toWei('0.0000001')).toNumber()
      );

      assert.equal(stageInfoPRIVATE.maxSupply, maxSupplies[1]);
      assert.equal(
        stageInfoPRIVATE.lockedSupply.toString(),
        toBN(amounts[3]).plus(amounts[4]).plus(amounts[5]).toFixed().toString()
      );
      assert.closeTo(
        toBN(stageInfoPRIVATE.currentSupply).toNumber(),
        toBN(amounts[3]).plus(amounts[4]).plus(amounts[5]).minus(amountPRIVATE).toNumber(),
        toBN(toWei('0.0000001')).toNumber()
      );
      assert.equal(
        stageInfoPRIVATE.vestedSupply.toString(),
        toBN(amounts[3]).plus(amounts[4]).plus(amounts[5]).toFixed().toString()
      );
      assert.closeTo(
        toBN(stageInfoPRIVATE.claimedSupply).toNumber(),
        amountPRIVATE.toNumber(),
        toBN(toWei('0.0000001')).toNumber()
      );
      assert.equal(stageInfoPRIVATE.unalocatedSupply, 0);

      assert.equal(stageInfoPUBLIC.maxSupply, maxSupplies[2]);
      assert.equal(
        stageInfoPUBLIC.lockedSupply.toString(),
        toBN(amounts[6]).plus(amounts[7]).plus(amounts[8]).toFixed().toString()
      );
      assert.closeTo(
        toBN(stageInfoPUBLIC.currentSupply).toNumber(),
        toBN(amounts[6]).plus(amounts[7]).plus(amounts[8]).minus(amountPUBLIC).toNumber(),
        toBN(toWei('0.0000001')).toNumber()
      );
      assert.equal(
        stageInfoPUBLIC.vestedSupply.toString(),
        toBN(amounts[6]).plus(amounts[7]).plus(amounts[8]).toFixed().toString()
      );
      assert.closeTo(
        toBN(stageInfoPUBLIC.claimedSupply).toNumber(),
        amountPUBLIC.toNumber(),
        toBN(toWei('0.0000001')).toNumber()
      );
      assert.equal(stageInfoPUBLIC.unalocatedSupply, 0);
    });
  });
});
