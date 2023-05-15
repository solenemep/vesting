// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "forge-std/Test.sol";

import "../../contracts/Token.sol";
import "../../contracts/Vesting.sol";

contract TestInit is Test {
    using SafeMath for uint256;

    address public constant ZERO_ADDRESS = 0x0000000000000000000000000000000000000000;

    address public constant USER1 = 0x0000000000000000000000000000000000000001;
    address public constant USER2 = 0x0000000000000000000000000000000000000002;
    address public constant USER3 = 0x0000000000000000000000000000000000000003;
    address public constant USER4 = 0x0000000000000000000000000000000000000004;

    uint256 public constant INIT_SUPPLY = 220 * 10 ** 6 * DECIMALS18;

    Token public token;
    Vesting public vesting;

    function setUp() public virtual {
        token = new Token(USER1, INIT_SUPPLY);
        vesting = new Vesting(address(token));
    }
}
