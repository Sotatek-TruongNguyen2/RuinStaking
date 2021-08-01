// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ERC721.sol";
import "../../utils/Counters.sol";
import "../../access/AccessControl.sol";

contract RuinNFT is AccessControl, ERC721 {
    using Counters for Counters.Counter;

    bytes32 constant public MINTER_ROLE = keccak256(abi.encodePacked("MINTER_ROLE"));
    bytes32 constant public BURNER_ROLE = keccak256(abi.encodePacked("BURNER_ROLE"));
    
    Counters.Counter private currentTokenId;

    constructor() ERC721("Ruin NFT", "RUINED") {
        _setupRole(_msgSender(), getAdminRole());
    }

    function _baseURI() internal pure override returns (string memory) {
        return "https://nft.sotatek.com/tokens/";
    }

    function baseTokenURI() public pure returns(string memory) {
        return _baseURI();
    }

    function mint(address to) public onlyRole(MINTER_ROLE) {
        currentTokenId.increment();
        _mint(to, currentTokenId.current());
    }

    function burn(uint256 tokenId) public onlyRole(BURNER_ROLE) {
        _burn(tokenId);
    }
}