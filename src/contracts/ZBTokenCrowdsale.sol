pragma solidity ^0.5.16;

import "./lib/crowdsale/Crowdsale.sol";
import "./lib/crowdsale/emission/MintedCrowdsale.sol";
import "./lib/crowdsale/validation/CappedCrowdsale.sol";
contract ZBTokenCrowdsale is Crowdsale, MintedCrowdsale, CappedCrowdsale {
    //track investor contributions
    uint256 public investorMinCap = 20000000000000000; //0.02
    uint256 public investorHardCap = 5000000000000000000; //50
    mapping(address => uint256) public contributions;

    constructor(uint256 _rate, address payable _wallet, IERC20 _token, uint256 _cap)
        public
        Crowdsale(_rate, _wallet, _token)
        CappedCrowdsale(_cap)
    {}

    function _preValidatePurchase(address beneficiary, uint256 weiAmount) internal view {
        super._preValidatePurchase(beneficiary, weiAmount);

        uint256 existingContribution = contributions[beneficiary];
        uint256 newContribution = existingContribution.add(weiAmount);

        require(newContribution >= investorMinCap && newContribution <= investorHardCap, "Beneficiary's cap exceeded");
        // require(_contributions[beneficiary].add(weiAmount) <= _caps[beneficiary], "Beneficiary's cap exceeded");
    }

    function _updatePurchasingState(address beneficiary, uint256 weiAmount) internal {
        super._updatePurchasingState(beneficiary, weiAmount);

        uint256 existingContribution = contributions[beneficiary];
        uint256 newContribution = existingContribution.add(weiAmount);
        contributions[beneficiary] = newContribution;
        // _contributions[beneficiary] = _contributions[beneficiary].add(weiAmount);
    }
}
