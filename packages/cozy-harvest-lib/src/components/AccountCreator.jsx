import React, { PureComponent } from 'react'
import PropTypes from 'react-proptypes'

import { withMutations } from 'cozy-client'

import AccountForm from './AccountForm'
import { accountsMutations } from '../connections/accounts'
import accounts from '../helpers/accounts'

/**
 * Encapsulates an AccountForm and create an account with resulting data.
 */
export class AccountCreator extends PureComponent {
  constructor(props) {
    super(props)
    this.handleSubmit = this.handleSubmit.bind(this)
  }

  async handleSubmit(data) {
    const {
      createAccount,
      konnector,
      onBeforeCreate,
      onCreateSuccess
    } = this.props
    onBeforeCreate()
    const account = await createAccount(
      konnector,
      accounts.build(konnector, data)
    )
    // Merge auth to keep original values for encrypted fields during creation
    onCreateSuccess(accounts.mergeAuth(account, data))
  }

  render() {
    const { account, konnector, submitting } = this.props
    return (
      <AccountForm
        konnector={konnector}
        initialValues={account && (account.auth || account.oauth)}
        onSubmit={this.handleSubmit}
        submitting={submitting}
      />
    )
  }
}

AccountCreator.propTypes = {
  createAccount: PropTypes.func.isRequired,
  konnector: PropTypes.object.isRequired,
  submitting: PropTypes.bool,
  onBeforeCreate: PropTypes.func.isRequired,
  onCreateSuccess: PropTypes.func.isRequired
}

export default withMutations(accountsMutations)(AccountCreator)
