// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Test} from "forge-std/Test.sol";
import {TestDrops} from "../src/TestDrops.sol";
import {MockERC20} from "./mock/MockErc.t.sol";
import {FailingERC20} from "./mock/MockFailingErc.t.sol";

contract TestDropsTest is Test {
    TestDrops faucet;
    MockERC20 token;

    address owner = address(0x1);
    address alice = address(0x2);

    function setUp() public {
        vm.deal(owner, 100 ether);
        vm.prank(owner);
        faucet = new TestDrops();

        token = new MockERC20();
        token.mint(address(faucet), 1_000 ether);

        vm.deal(address(faucet), 50 ether);
    }

    /*//////////////////////////////////////////////////////////////
                              NATIVE
    //////////////////////////////////////////////////////////////*/

    function testClaimNativeSuccess() public {
        uint256 amount = 1 ether;

        uint256 beforeBal = alice.balance;
        faucet.claimNative(alice, amount);

        assertEq(alice.balance - beforeBal, amount);
    }

    function testRevertIfNativeClaimTooLarge() public {
        vm.expectRevert(TestDrops.ExceedsMaxClaim.selector);
        faucet.claimNative(alice, 100 ether);
    }

    function testRevertIfNotEnoughNativeBalance() public {
        vm.deal(address(faucet), 5 ether); // below max claim

        vm.expectRevert(TestDrops.NotEnoughBalance.selector);
        faucet.claimNative(alice, 6 ether); // <= max claim, > balance
    }

    function testReceiveEther() public {
        (bool ok, ) = address(faucet).call{value: 1 ether}("");
        assertTrue(ok);
    }

    /*//////////////////////////////////////////////////////////////
                              ERC20
    //////////////////////////////////////////////////////////////*/

    function testClaimERC20Success() public {
        uint256 amount = 10 ether;

        uint256 before = token.balanceOf(alice);
        faucet.claimERC20(address(token), alice, amount);

        assertEq(token.balanceOf(alice) - before, amount);
    }

    function testRevertIfNotEnoughERC20Balance() public {
        vm.startPrank(owner);
        faucet.withERC(address(token), owner, token.balanceOf(address(faucet)));
        vm.stopPrank();

        vm.expectRevert(TestDrops.NotEnoughBalance.selector);
        faucet.claimERC20(address(token), alice, 1 ether);
    }

    function testERC20TransferFailure() public {
        FailingERC20 bad = new FailingERC20();

        vm.expectRevert(TestDrops.ClaimFail.selector);
        faucet.claimERC20(address(bad), alice, 1 ether);
    }

    /*//////////////////////////////////////////////////////////////
                              OWNER ONLY
    //////////////////////////////////////////////////////////////*/

    function testOwnerCanWithdrawNative() public {
        vm.prank(owner);
        faucet.withNative(owner, 10 ether);

        assertEq(owner.balance, 110 ether);
    }

    function testNonOwnerCannotWithdrawNative() public {
        vm.prank(alice);
        vm.expectRevert(TestDrops.Unauthorized.selector);
        faucet.withNative(alice, 1 ether);
    }

    function testOwnerCanWithdrawERC20() public {
        uint256 amount = 50 ether;

        vm.prank(owner);
        faucet.withERC(address(token), owner, amount);

        assertEq(token.balanceOf(owner), amount);
    }

    function testNonOwnerCannotWithdrawERC20() public {
        vm.prank(alice);
        vm.expectRevert(TestDrops.Unauthorized.selector);
        faucet.withERC(address(token), alice, 1 ether);
    }

    function testNonOwnerCannotChangeOwner() public {
        vm.prank(alice);
        vm.expectRevert(TestDrops.Unauthorized.selector);
        faucet.changeOwner(alice);
    }

    /*//////////////////////////////////////////////////////////////
                              ADMIN
    //////////////////////////////////////////////////////////////*/

    function testOwnerCanUpdateMaxNativeClaim() public {
        vm.prank(owner);
        faucet.setMaxNativeClaim(5 ether);

        assertEq(faucet.maxNativeClaim(), 5 ether);
    }

    function testOwnerCanTransferOwnership() public {
        vm.prank(owner);
        faucet.changeOwner(alice);

        assertEq(faucet.owner(), alice);
    }
}
