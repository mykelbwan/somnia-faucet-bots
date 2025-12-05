// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

contract FailingERC20 {
    function balanceOf(address) external pure returns (uint256) {
        return 100 ether;
    }

    function transfer(address, uint256) external pure returns (bool) {
        return false;
    }
}