// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @dev Interface of the ERC20 standard as defined in the EIP.
 */
contract Context {
    function _msgSender() internal view returns(address) {
        return msg.sender;
    }
}