  
// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

contract AccessControl {
    bytes32 public constant ADMIN_ROLE = 0x00;
    
    mapping(bytes32 => mapping(address => bool)) roles;
    
    event GrantRole(address account, bytes32 role);
    event RevokeRole(address account, bytes32 role);
    event RenounceRole(address account, bytes32 role);
    
    modifier onlyRole(bytes32 role) {
        require(roles[role][msg.sender], "AccessControl::Your role is not able to do this");
        _;
    }
    
    function getAdminRole() public pure returns(bytes32) {
        return ADMIN_ROLE;
    }
    
    function hasRole(address _address, bytes32 _role) public view returns(bool) {
        return roles[_role][_address];
    }
    
    function grantRole(address _account, bytes32 _role) public onlyRole(getAdminRole()) {
       _grantRole(_account, _role);
    }
    
     function revokeRole(address _account, bytes32 _role) public onlyRole(getAdminRole()) {
       _revokeRole(_account, _role);
    }
    
    function renounceRole(address _account, bytes32 _role) public {
        require(_account == msg.sender, "AccessControl::You can only renounce roles for self");
        _revokeRole(msg.sender, _role);
    }
    
    function _setupRole(address _account, bytes32 _role) internal {
        _grantRole(_account, _role);
    }
    
    function _grantRole(address _account, bytes32 _role) private {
        require(!hasRole(_account, _role), "AccessControl::User already granted for this role");
        roles[_role][_account] = true;
        
        emit GrantRole(_account, _role); 
    }
    
    function _revokeRole(address _account, bytes32 _role) private {
        require(hasRole(_account, _role), "AccessControl::User not granted for this role yet");
        roles[_role][_account] = false;
        
        emit RevokeRole(_account, _role); 
    }
    
    // function _renounceRole(address _account, bytes32 _role) private {
    //     require(hasRole(_account, _role), "AccessControl::User not granted for this role yet");
    //     roles[_role][_account] = false;
        
    //     emit RenounceRole(_account, _role); 
    // }
}