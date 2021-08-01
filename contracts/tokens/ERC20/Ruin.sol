// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./extensions/ERC20Capped.sol";
import "../../access/AccessControl.sol";

contract Ruin is AccessControl, ERC20Capped {
    bytes32 constant public MINTER_ROLE = keccak256(abi.encodePacked("MINTER_ROLE"));
    bytes32 constant public BURNER_ROLE = keccak256(abi.encodePacked("BURNER_ROLE"));
    
    constructor(
        string memory _name, 
        string memory _symbol, 
        uint8 _decimals, 
        uint256 _cap
    ) ERC20(_name, _symbol, _decimals) ERC20Capped(_cap) {
        _setupRole(_msgSender(), ADMIN_ROLE);
    }

    function _mint(address _account, uint256 _amount) internal override {
        super._mint(_account, _amount);
    }
    
    function burn(address _account, uint256 _amount) public onlyRole(BURNER_ROLE) {
        _burn(_account, _amount);
    }

    function mint(address _account, uint256 _amount) public onlyRole(MINTER_ROLE) {
        super._mint(_account, _amount);
    }

    function isMinter(address _account) public view returns(bool) {
        return hasRole(_account, MINTER_ROLE);
    }

    function isBurner(address _account) public view returns(bool) {
        return hasRole(_account, BURNER_ROLE);
    }

    // function pause() public whenNotPaused onlyRole(ADMIN_ROLE) {
    //     _pause();
    // }

    // function unpause() public whenPaused onlyRole(ADMIN_ROLE) {
    //     _unpause();
    // }
}