// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script} from "forge-std/Script.sol";
import {TestDrops} from "../src/TestDrops.sol";

contract TestDropsScript is Script {
    TestDrops public faucet;

    function run() public {
        vm.startBroadcast();
        faucet = new TestDrops();
        vm.stopBroadcast();
    }
}
