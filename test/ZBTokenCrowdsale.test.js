const { accounts, contract, defaultSender } = require('@openzeppelin/test-environment')
const {
  BN,
  ether,
  send,
  balance,
  time,
  // constants,    // Common constants, like the zero address and largest integers
  // expectEvent,  // Assertions for emitted events
  expectRevert
} = require('@openzeppelin/test-helpers')

const ZBTokenCrowdsale = contract.fromArtifact('ZBTokenCrowdsale')
const ZBToken = contract.fromArtifact('ZBToken')
const RefundEscrow = contract.fromArtifact('RefundEscrow')

describe('ZBTokenCrowdsale', () => {
  const [crowdsaleWallet, investor1, investor2, investor3] = accounts

  //token
  const name = 'ZBToken'
  const symbol = 'ZB'
  const decimals = 18

  //crowdsale
  const preICOrate = 500
  const icoRate = 250
  const wallet = crowdsaleWallet
  //cap
  const cap = ether('100')
  //goal
  const goal = ether('20')

  // investor caps
  const lessThanInvestorMinCap = ether('0.99')
  const investorMinCap = ether('1')
  const investorHardCap = ether('10')
  const moreThanInvestorHardCap = ether('10.01')

  // ICO stages
  const preIcoStage = 0
  const icoStage = 1

  before(async () => {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by ganache
    await time.advanceBlock()
  })

  beforeEach(async () => {
    //time
    this.openingTime = (await time.latest()).add(time.duration.weeks(1))
    this.closingTime = this.openingTime.add(time.duration.weeks(1))

    // Deploy token
    this.token = await ZBToken.new(name, symbol, decimals)
    // Deploy crowdsale
    this.crowdsale = await ZBTokenCrowdsale.new(
      preICOrate,
      wallet,
      this.token.address,
      cap,
      this.openingTime,
      this.closingTime,
      goal
    )

    // pause token
    await this.token.pause()

    // add crowdsale Pausable role of token
    await this.token.addPauser(this.crowdsale.address)

    // add crowdsale as a minter
    await this.token.addMinter(this.crowdsale.address)

    // add investors to crowdsale
    await this.crowdsale.addWhitelisted(investor1)
    await this.crowdsale.addWhitelisted(investor2)

    // time crowdsale
    await time.increaseTo(this.openingTime.add(time.duration.hours(1)))

    // escrow refund
    this.escrowAddress = await this.crowdsale._escrow()
    this.escrow = await RefundEscrow.at(this.escrowAddress)
  })

  describe('crowdsale', () => {
    it('tracks the rate', async () => {
      const result = await this.crowdsale.rate()
      result.should.be.bignumber.equal(new BN(preICOrate))
    })

    it('tracks the wallet', async () => {
      const result = await this.crowdsale.wallet()
      result.should.equal(wallet)
    })

    it('tracks the token', async () => {
      const result = await this.crowdsale.token()
      result.should.equal(this.token.address)
    })
  })

  describe('minted crowdsale', () => {
    it('mints token after purchase', async () => {
      const originalTotalSupply = await this.token.totalSupply()
      // send.ether(investor1, this.crowdsale.address, ether('1')) // ??? gas error
      await this.crowdsale.sendTransaction({
        value: ether('1'),
        from: investor1
      })
      const newTotalSupply = await this.token.totalSupply()
      newTotalSupply.should.be.bignumber.greaterThan(originalTotalSupply)
    })
  })

  describe('capped crowdsale', () => {
    describe('accteping payments', () => {
      it('should accept payments on the caps edges', async () => {
        const purchaser1 = investor2
        const purchaser2 = investor1
        // await this.crowdsale.sendTransaction({ value, from: investor1 }) //fallback
        await this.crowdsale.buyTokens(investor1, { value: investorMinCap, from: purchaser1 })
        await this.crowdsale.buyTokens(investor2, { value: investorHardCap, from: purchaser2 })
      })

      describe('when the contribution is less than the min cap', () => {
        it('rejects the TX', async () => {
          await expectRevert(
            this.crowdsale.buyTokens(investor1, { value: lessThanInvestorMinCap }),
            'Beneficiary cap exceeded.'
          )
        })
      })

      describe('when the contribution is more than the max cap', () => {
        it('rejects the TX', async () => {
          await expectRevert(
            this.crowdsale.buyTokens(investor1, { value: moreThanInvestorHardCap }),
            'Beneficiary cap exceeded.'
          )
        })
      })
    })

    describe('when the investor has already met the min cap ', () => {
      it('allows the investor to contribute below the min cap', async () => {
        //first contribution is valid
        await this.crowdsale.buyTokens(investor1, { value: investorMinCap })
        //second contribution is less than investor cap
        const value = investorMinCap - 10 //wei
        await this.crowdsale.buyTokens(investor1, { value })
      })
    })

    describe('when the total contributions exceed the investor hard cap', () => {
      it('rejects the TX', async () => {
        //first contribution is valid
        await this.crowdsale.buyTokens(investor1, { value: ether('2') })
        //second contribution send total contributions over investor hard cap
        await expectRevert(
          this.crowdsale.buyTokens(investor1, { value: ether('9') }),
          'Beneficiary cap exceeded.'
        )
      })
    })

    describe('when the contribution is within the valid range', () => {
      it('succeeds and updates the contribution amount', async () => {
        const value = ether('2')
        await this.crowdsale.buyTokens(investor2, { value })
        //on capped
        const contribution = await this.crowdsale.getUserContribution(investor2)
        contribution.should.be.bignumber.equal(value)
        //on crowdsale
        const raised = await this.crowdsale.weiRaised()
        raised.should.be.bignumber.equal(value)
      })
    })
  })

  describe('timed crowdsale', () => {
    it('is open', async () => {
      const isClosed = await this.crowdsale.hasClosed()
      isClosed.should.be.false
    })
  })

  describe('whitelisted crowdsale', () => {
    it('is whitelisted', async () => {
      const notWhitelisted = investor3
      await expectRevert(
        this.crowdsale.buyTokens(notWhitelisted, { value: ether('1'), from: notWhitelisted }),
        "WhitelistCrowdsale: beneficiary doesn't have the Whitelisted role"
      )
    })
  })

  describe('crowdsale stages', () => {
    it('starts in PreICO', async () => {
      const stage = await this.crowdsale._stage()
      stage.should.be.bignumber.equal(new BN(preIcoStage))
    })

    it('starts at the preIco rate', async () => {
      const rate = await this.crowdsale.rate()
      rate.should.be.bignumber.equal(new BN(preICOrate))
    })

    it('allows admin to update the stage & rate', async () => {
      await this.crowdsale.setCrowdsaleStage(icoStage)
      const stage = await this.crowdsale._stage()
      stage.should.be.bignumber.equal(new BN(icoStage))
      const rate = await this.crowdsale.rate()
      rate.should.be.bignumber.equal(new BN(icoRate))
    })

    it('prevents non-admin to update the stage', async () => {
      await expectRevert(
        this.crowdsale.setCrowdsaleStage(icoStage, { from: investor1 }),
        'Ownable: caller is not the owner'
      )
    })
  })

  describe('refundable crowdsale', () => {
    describe('during crowdsale', () => {
      beforeEach(async () => {
        await this.crowdsale.buyTokens(investor1, { value: ether('1'), from: investor1 })
      })

      it('prevents the investor from claiming refund', async () => {
        await expectRevert(
          this.crowdsale.claimRefund(investor1),
          'RefundableCrowdsale: not finalized'
        )
      })
    })

    describe('when the crowdsale stage is PreICO', () => {
      beforeEach(async () => {
        await this.crowdsale.buyTokens(investor1, { value: ether('1'), from: investor1 })
      })

      it('forwards funds to the wallet', async () => {
        // console.log(wallet)
        const crowdsaleBalance = await balance.current(wallet, 'ether')
        // same as new BN(web3.eth.getBalance(account))
        // console.log(crowdsaleBalance.toNumber())
        // expect(balance.toNumber()).to.be.above(ether('100'))
      })
    })

    describe('when the crowdsale stage is ICO', () => {
      beforeEach(async () => {})

      it('forwards funds to the refund escrow', async () => {
        const escrowBalanceTracker = await balance.tracker(this.escrowAddress, 'ether')
        const crowdsaleBalanceTracker = await balance.tracker(wallet, 'ether')

        // PreICO
        console.log('PreICO stage...')
        await this.crowdsale.buyTokens(investor1, { value: ether('1'), from: investor1 })

        const escrowState = await this.escrow.state() // enum State { Active, Refunding, Closed }enum State { Active, Refunding, Closed }
        console.log('escrowState', escrowState.toString())

        // const escrowBalance = await balance.current(escrowAddress, 'ether')
        const escrowBalance = await escrowBalanceTracker.get()
        console.log('escrowBalance', escrowBalance.toString())

        // const crowdsaleBalance = await balance.current(wallet, 'ether')
        const crowdsaleBalance = await crowdsaleBalanceTracker.get()
        console.log('crowdsaleBalance', crowdsaleBalance.toString())

        // ICO
        console.log('ICO stage...')
        await this.crowdsale.setCrowdsaleStage(icoStage)
        await this.crowdsale.buyTokens(investor1, { value: ether('1'), from: investor1 })

        const escrowState2 = await this.escrow.state() // enum State { Active, Refunding, Closed }enum State { Active, Refunding, Closed }
        console.log('escrowState', escrowState2.toString())

        const escrowBalance2 = await escrowBalanceTracker.get()
        console.log('escrowBalance', escrowBalance2.toString())

        const crowdsaleBalance2 = await crowdsaleBalanceTracker.get()
        console.log('crowdsaleBalance', crowdsaleBalance2.toString())

        // FINALIZE
        console.log('Finalized...')
        await time.increaseTo(this.closingTime.add(time.duration.seconds(1)))
        await this.crowdsale.finalize()

        const escrowState3 = await this.escrow.state() // enum State { Active, Refunding, Closed }enum State { Active, Refunding, Closed }
        console.log('escrowState', escrowState3.toString())
      })
    })
  })

  describe('token transfers', () => {
    it('does not allow investors to transfer tokens during crowdsale', async () => {
      await this.crowdsale.buyTokens(investor1, { value: ether('1'), from: investor1 })
      await expectRevert(this.token.transfer(investor2, 1, { from: investor1 }), 'Pausable: paused')
    })
  })

  describe('finalizing the crowdsale', () => {
    describe('when the goals is not reached', () => {
      beforeEach(async () => {
        //Dont meet the goal
        await this.crowdsale.buyTokens(investor2, { value: ether('1'), from: investor2 })
        //fastforward past the time
        await time.increaseTo(this.closingTime.add(time.duration.seconds(1)))
        //finalize the crowdsale
        await this.crowdsale.finalize()
      })

      it('handles goal NOT reached', async () => {
        // goals NOT reached
        const goalReached = await this.crowdsale.goalReached()
        goalReached.should.be.false

        // stop minting
        const isMinter = await this.token.isMinter(this.crowdsale.address)
        isMinter.should.be.true

        // unpauses the token
        const isPaused = await this.token.paused()
        isPaused.should.be.true

        // allows the investor to claim refund
        await this.crowdsale.claimRefund(investor2, { from: investor2 })
      })
    })

    describe('when the goals is reached', () => {
      beforeEach(async () => {
        // meet the goal
        await this.crowdsale.buyTokens(investor1, { value: ether('10'), from: investor1 })
        await this.crowdsale.buyTokens(investor2, { value: ether('10'), from: investor2 })
        //fastforward past the time
        await time.increaseTo(this.closingTime.add(time.duration.seconds(1)))
        //finalize the crowdsale
        await this.crowdsale.finalize()
      })

      it('handles goal reached', async () => {
        // goals reached
        const goalReached = await this.crowdsale.goalReached()
        goalReached.should.be.true

        // stop minting
        const isMinter = await this.token.isMinter(this.crowdsale.address)
        isMinter.should.be.false

        // unpauses the token
        const isPaused = await this.token.paused()
        isPaused.should.be.false

        // doesn not allow the investor to claim refund
        await expectRevert(
          this.crowdsale.claimRefund(investor1, { from: investor1 }),
          'RefundableCrowdsale: goal reached'
        )
      })
    })
  })
})
