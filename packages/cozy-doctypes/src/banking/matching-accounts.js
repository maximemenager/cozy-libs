const sortBy = require('lodash/sortBy')
const { eitherIncludes } = require('./matching-tools')

const findExactMatch = (attr, account, existingAccounts) => {
  const sameAttr = existingAccounts.filter(
    existingAccount => existingAccount[attr] === account[attr]
  )
  if (sameAttr.length === 1) {
    return { match: sameAttr[0], method: attr + '-exact' }
  } else if (sameAttr.length > 1) {
    return { matches: sameAttr, method: attr + '-exact' }
  } else {
    return null
  }
}

const untrimmedAccountNumber = /^(?:[A-Za-z]+)?-?([0-9]+)-?(?:[A-Za-z]+)?$/

const normalizeAccountNumber = (number, iban) => {
  iban = iban && iban.replace(' ', '')
  let match
  if (iban && iban.length == 27) {
    return iban.substr(14, 11)
  }
  if (!number) {
    return
  }

  if (number && number.length == 23) {
    // Must be an IBAN without the COUNTRY code
    // See support demand #9102 with BI
    // We extract the account number from the IBAN
    // COUNTRY (4) BANK (5) COUNTER (5) NUMBER (11) KEY (2)
    // FRXX 16275 10501 00300060030 00
    return number.substr(10, 11)
  } else if (number && number.length == 16) {
    // Linxo sends Bank account number that contains
    // the counter number
    return number.substr(5, 11)
  } else if (
    number &&
    number.length > 11 &&
    (match = number.match(untrimmedAccountNumber))
  ) {
    // Some account numbers from BI are in the form
    // CC-00300060030 (CC for Compte Courant) or
    // LEO-00300060030
    return match[1]
  } else {
    return number
  }
}

/**
 * If either of the account numbers has length 11 and one is contained
 * in the other, it's a match
 */
const approxNumberMatch = (account, existingAccount) => {
  return (
    existingAccount.number &&
    account.number &&
    (existingAccount.number.length === 11 || account.number.length === 11) &&
    eitherIncludes(existingAccount.number, account.number)
  )
}

const redactedCreditCard = /xxxx xxxx xxxx (\d{4})/
const creditCardMatch = (account, existingAccount) => {
  let ccAccount, lastDigits
  for (let acc of [account, existingAccount]) {
    const match = acc.number.match(redactedCreditCard)
    if (match) {
      ccAccount = acc
      lastDigits = match[1]
    }
  }
  const other = ccAccount === account ? existingAccount : account
  if (other.number.slice(-4) === lastDigits) {
    return true
  }
}

const score = (account, existingAccount) => {
  const methods = []
  const res = {
    account: existingAccount,
    methods
  }
  let points = 0
  if (approxNumberMatch(account, existingAccount)) {
    points += 50
    methods.push('approx-number')
  } else {
    points -= 50
  }
  if (account.type === existingAccount.type) {
    points += 50
    methods.push('same-type')
  }
  if (
    (account.type === 'CreditCard' || existingAccount.type === 'CreditCard') &&
    creditCardMatch(account, existingAccount)
  ) {
    points += 150
    methods.push('credit-card-number')
  }
  res.points = points
  return res
}

const normalizeAccount = account => {
  const normalizedAccountNumber = normalizeAccountNumber(
    account.number,
    account.iban
  )
  return {
    ...account,
    number: normalizedAccountNumber
  }
}

const findMatch = (account, existingAccounts) => {
  // IBAN
  if (account.iban) {
    const matchIBAN = findExactMatch('iban', account, existingAccounts)
    if (matchIBAN && matchIBAN.match) {
      return matchIBAN
    }
  }

  // Number
  if (account.number) {
    const numberMatch = findExactMatch('number', account, existingAccounts)
    // Number easy case
    if (numberMatch && numberMatch.match) {
      return numberMatch
    }
  }

  // Now we get more fuzzy and score accounts
  const scored = sortBy(
    existingAccounts.map(existingAccount => score(account, existingAccount)),
    x => -x.points
  )
  const candidates = scored.filter(x => x.points > 0)
  if (candidates.length > 0) {
    return {
      match: candidates[0].account,
      method: candidates[0].methods.join('-')
    }
  }
}

const matchAccounts = (fetchedAccounts, existingAccounts) => {
  fetchedAccounts = fetchedAccounts.map(normalizeAccount)
  const toMatch = [...existingAccounts].map(normalizeAccount)
  const results = []
  for (let fetchedAccount of fetchedAccounts) {
    const matchResult = findMatch(fetchedAccount, toMatch)
    if (matchResult) {
      const i = toMatch.indexOf(matchResult.match)
      toMatch.splice(i, 1)
      results.push({ account: fetchedAccount, ...matchResult })
    } else {
      results.push({ account: fetchedAccount })
    }
  }
  return results
}

module.exports = {
  matchAccounts,
  normalizeAccountNumber
}