pragma solidity ^0.5.0;

import "@openzeppelin/contracts/token/ERC20/ERC20Mintable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";
import "@openzeppelin/contracts/crowdsale/Crowdsale.sol";
import "@openzeppelin/contracts/crowdsale/emission/MintedCrowdsale.sol";
import "@openzeppelin/contracts/crowdsale/validation/CappedCrowdsale.sol";
import "@openzeppelin/contracts/crowdsale/validation/TimedCrowdsale.sol";
import "@openzeppelin/contracts/crowdsale/validation/WhitelistCrowdsale.sol";
import "@openzeppelin/contracts/crowdsale/distribution/RefundableCrowdsale.sol";

contract ZBTokenCrowdsale is
    Crowdsale,
    MintedCrowdsale,
    CappedCrowdsale,
    TimedCrowdsale,
    WhitelistCrowdsale,
    RefundableCrowdsale
{
    using SafeMath for uint256;

    //track investor contributions
    uint256 public _investorMinCap = 1000000000000000000; //1
    uint256 public _investorHardCap = 10000000000000000000; //10
    mapping(address => uint256) public _contributions;

    constructor(
        uint256 rate,
        address payable wallet,
        IERC20 token,
        uint256 cap,
        uint256 openingTime,
        uint256 closingTime,
        uint256 goal
    )
        public
        Crowdsale(rate, wallet, token)
        CappedCrowdsale(cap)
        TimedCrowdsale(openingTime, closingTime)
        RefundableCrowdsale(goal)
    {
        require(goal <= cap, "Goal cant be grater than cap");
    }

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

    function _finalization() internal {
        // if (goalReached()) {
        //     _escrow.close();
        //     _escrow.beneficiaryWithdraw();
        // } else {
        //     _escrow.enableRefunds();
        // }

        super._finalization();
    }

}
