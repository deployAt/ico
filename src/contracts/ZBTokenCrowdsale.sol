pragma solidity ^0.5.16;

import "./lib/math/SafeMath.sol";
import "./lib/crowdsale/Crowdsale.sol";
import "./lib/crowdsale/emission/MintedCrowdsale.sol";
import "./lib/crowdsale/validation/CappedCrowdsale.sol";
import "./lib/crowdsale/validation/TimedCrowdsale.sol";
contract ZBTokenCrowdsale is Crowdsale, MintedCrowdsale, CappedCrowdsale, TimedCrowdsale {
    using SafeMath for uint256;

    //track investor contributions
    uint256 public _investorMinCap = 1000000000000000000; //1
    uint256 public _investorHardCap = 10000000000000000000; //10
    mapping(address => uint256) public _contributions;

    constructor(
        uint256 _rate,
        address payable _wallet,
        IERC20 _token,
        uint256 _cap,
        uint256 _openingTime,
        uint256 _closingTime
    )
        public
        Crowdsale(_rate, _wallet, _token)
        CappedCrowdsale(_cap)
        TimedCrowdsale(_openingTime, _closingTime)
    {}

    function getUserContribution(address beneficiary) public view returns (uint256) {
        return _contributions[beneficiary];
    }

    function _preValidatePurchase(address beneficiary, uint256 weiAmount) internal view {
        super._preValidatePurchase(beneficiary, weiAmount);
        uint256 existingContribution = _contributions[beneficiary];
        uint256 newContribution = existingContribution.add(weiAmount);
        require(newContribution >= _investorMinCap && newContribution <= _investorHardCap, "Beneficiary cap exceeded");
    }

    function _updatePurchasingState(address beneficiary, uint256 weiAmount) internal {
        super._updatePurchasingState(beneficiary, weiAmount);
        uint256 existingContribution = _contributions[beneficiary];
        uint256 newContribution = existingContribution.add(weiAmount);
        _contributions[beneficiary] = newContribution;
    }
}
