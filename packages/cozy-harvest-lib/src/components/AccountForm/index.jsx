import React, { PureComponent } from 'react'
import { Form } from 'react-final-form'
import PropTypes from 'react-proptypes'

import Button from 'cozy-ui/react/Button'
import { translate, extend } from 'cozy-ui/react/I18n'

import AccountFields from './AccountFields'
import AccountFormError from './Error'
import { getEncryptedFieldName } from '../../helpers/fields'
import { KonnectorJobError } from '../../helpers/konnectors'
import manifest from '../../helpers/manifest'
import OAuthForm from '../../components/OAuthForm'

const VALIDATION_ERROR_REQUIRED_FIELD = 'VALIDATION_ERROR_REQUIRED_FIELD'

/**
 * AccountForm is reponsible of generating a form which will allow user to
 * edit an account for a given konnector.
 *
 * This component rely internally on a ReactFinalForm component.
 *
 * AccountForm must be passed `onSubmit` callback.
 * @type {PureComponent}
 * @see https://github.com/final-form/react-final-form#getting-started
 */
export class AccountForm extends PureComponent {
  constructor(props, context) {
    super(props, context)
    const { konnector, lang } = props
    const { locales } = konnector
    if (locales && lang) {
      extend(locales[lang])
    }
  }

  /**
   * Indicates if the state of ReactFinalForm implies that data can be submitted
   * @param  {Object} formState See https://github.com/final-form/final-form#formstate
   * @return {Boolean}
   */
  isSubmittable({ dirty, error, initialValues, valid }) {
    const untouched = initialValues && !dirty
    return error || (valid && !untouched)
  }

  /**
   * Handle key up and check if `ENTER` key has been pressed. If so, submit the
   * form if all parmater are ok.
   * @param  {React.SyntheticEvent} event         Key events
   * @param  {Boolean} dirty         Indicates if form is dirty, i.e. if values
   * have changed
   * @param  {Object} form          The form object injected by ReactFinalForm.
   * @param  {Object} initialValues Initial data injected into AccountForm
   * @param  {Boolean} valid        Indicates if the form data is valid
   * @param  {Object} values        Actual form values data
   */
  handleKeyUp(event, { dirty, form, initialValues, valid, values }) {
    if (
      event.key === 'Enter' &&
      this.isSubmittable({ dirty, initialValues, valid })
    ) {
      this.handleSubmit(values, form)
    }
  }

  /**
   * Submit handler
   * @param  {Object} values        Actual form values data
   * @param  {Object} form          The form object injected by ReactFinalForm.
   */
  handleSubmit(values, form) {
    const { onSubmit } = this.props
    // Reset form with new values to set back dirty to false
    form.reset(values)
    onSubmit(values)
  }

  validate = (fields, initialValues) => vals => {
    let errors = {}
    for (let name in fields)
      if (
        fields[name].required &&
        !vals[name] &&
        // Don't require value for empty encrypted fields with initial value
        !initialValues[getEncryptedFieldName(name)]
      )
        errors[name] = VALIDATION_ERROR_REQUIRED_FIELD
    return errors
  }

  render() {
    const {
      account,
      error,
      konnector,
      onSubmit,
      showError,
      submitting,
      t
    } = this.props
    const { fields, oauth } = konnector

    if (oauth) return <OAuthForm initialValues={initialValues} oauth={oauth} />

    const sanitizedFields = manifest.sanitizeFields(fields)
    const defaultValues = manifest.defaultFieldsValues(sanitizedFields)
    const initialValues = account && account.auth
    const initialAndDefaultValues = { ...defaultValues, ...initialValues }

    let container = null

    const isLoginError =
      error instanceof KonnectorJobError && error.isLoginError()

    return (
      // See https://github.com/final-form/react-final-form#getting-started
      <Form
        initialValues={initialAndDefaultValues}
        onSubmit={onSubmit}
        validate={this.validate(sanitizedFields, initialAndDefaultValues)}
        render={({ dirty, form, values, valid }) => (
          <div
            onKeyUp={event =>
              this.handleKeyUp(event, {
                dirty,
                form,
                initialValues,
                valid,
                values
              })
            }
            ref={element => {
              container = element
            }}
          >
            {error && (showError || isLoginError) && (
              <AccountFormError error={error} konnector={konnector} t={t} />
            )}
            <AccountFields
              container={container}
              disabled={submitting}
              fields={sanitizedFields}
              hasError={
                error &&
                error instanceof KonnectorJobError &&
                error.isLoginError()
              }
              initialValues={initialAndDefaultValues}
              t={t}
            />
            <Button
              busy={submitting}
              className="u-mt-2 u-mb-1-half"
              disabled={
                submitting ||
                !this.isSubmittable({ dirty, error, initialValues, valid })
              }
              extension="full"
              label={t('accountForm.submit.label')}
              onClick={() => this.handleSubmit(values, form)}
            />
          </div>
        )}
      />
    )
  }
}

AccountForm.propTypes = {
  /**
   * Account document. Used to get intial form values.
   * If no account is passed, AccountForm will use empty initial values.
   * @type {Object}
   */
  account: PropTypes.object,
  /**
   * Existing error
   * @type {Error,KonnectorJobError}
   */
  error: PropTypes.object,
  /**
   * Konnector document. AccountForm will check the `fields` object to compute
   * fields.
   * @type {Object}
   */
  konnector: PropTypes.object.isRequired,
  /**
   * Submit callback
   * @type {Function}
   */
  onSubmit: PropTypes.func.isRequired,
  /**
   * Indicates if the AccountForm has to show errors. Sometimes errors may be
   * displayed elsewhere. However, a KonnectorJobError corresponding to a login
   * error is always displayed.
   * @type {Boolean}
   */
  showError: PropTypes.bool,
  /**
   * Indicates if the form should be rendered as submitting data or busy.
   * Typically updated after an `onSubmit` call.
   * @type {Object}
   */
  submitting: PropTypes.bool,
  /**
   * Translation function
   */
  t: PropTypes.func
}

AccountForm.defaultProps = {
  showError: true
}

export default translate()(AccountForm)
