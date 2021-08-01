// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../ERC20.sol";

abstract contract ERC20Capped is ERC20 {
    uint256 private immutable _cap;
    
    constructor(uint256 cap_) {
        _cap = cap_;
    }
    
    function cap() public view returns(uint256) {
        return _cap;
    }
    
    function _mint(address _account, uint256 _amount) internal virtual override {
        require(totalSupply() + _amount <= cap(), "ERC20Capped::You mint exceeds your cap");
        super._mint(_account, _amount);
    }
}