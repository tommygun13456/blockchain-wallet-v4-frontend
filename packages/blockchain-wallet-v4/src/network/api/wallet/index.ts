import { concat, mergeRight, prop, propOr } from 'ramda'

import { data as dataActions } from '../../../redux/actions'

export default ({ get, post, rootUrl }) => {
  const fetchPayloadWithSharedKey = (guid, sharedKey) =>
    post({
      data: { format: 'json', guid, method: 'wallet.aes.json', sharedKey },
      endPoint: '/wallet',
      url: rootUrl
    })

  const fetchPayloadWithSession = (guid, sessionToken) =>
    get({
      data: { format: 'json', resend_code: null },
      endPoint: `/wallet/${guid}`,
      sessionToken,
      url: rootUrl
    })

  const fetchPayloadWithTwoFactorAuth = (guid, sessionToken, twoFactorCode) =>
    post({
      data: {
        format: 'plain',
        guid,
        length: twoFactorCode.length,
        method: 'get-wallet',
        payload: twoFactorCode
      },
      endPoint: '/wallet',
      sessionToken,
      url: rootUrl
    })

  const savePayload = (data) =>
    post({
      data: mergeRight({ format: 'plain', method: 'update' }, data),
      endPoint: '/wallet',
      url: rootUrl
    }).then(() => data.checksum)

  const createPayload = (email, captchaToken, forceVerifyEmail, data) =>
    post({
      data: mergeRight(
        {
          captcha: captchaToken,
          email,
          force: forceVerifyEmail,
          format: 'plain',
          method: 'insert',
          siteKey: window.CAPTCHA_KEY
        },
        data
      ),
      endPoint: '/wallet',
      url: rootUrl
    }).then(() => data.checksum)

  const createResetAccountPayload = (email, captchaToken, sessionToken, data) =>
    post({
      contentType: 'application/json',
      data: mergeRight(
        {
          captcha: captchaToken,
          email,
          siteKey: window.CAPTCHA_KEY
        },
        data
      ),
      endPoint: '/wallet/recovery/recover-account',
      sessionToken,
      url: rootUrl
    })
      .then((response) => sessionStorage.setItem('accountRecovery', JSON.stringify(response)))
      .then(() => data.checksum)

  // context => {
  //  addresses: [],
  //  legacy: [],
  //  bech32: []
  // }
  // onlyShow is xpub or address to filter data with
  const fetchBlockchainData = (
    context,
    { n = 50, offset = 0, onlyShow = false } = {},
    filter?: Number
  ) => {
    const addresses = prop('addresses', context)
    const addressArray = Array.isArray(addresses) ? addresses : [addresses]
    // both addresses and legacy xpubs
    const active = concat(addressArray, propOr([], 'legacy', context)).join('|')
    // bech32 xpubs only
    // @ts-ignore
    const activeBech32 = propOr([], 'bech32', context).join('|')
    const data = {
      active,
      activeBech32,
      ct: new Date().getTime(),
      filter,
      format: 'json',
      language: 'en',
      n,
      no_buttons: true,
      no_compact: true,
      offset
    }
    return post({
      data: onlyShow
        ? mergeRight(data, {
            onlyShow: (Array.isArray(onlyShow) ? onlyShow : [onlyShow]).join('|')
          })
        : data,
      endPoint: '/multiaddr',
      url: rootUrl
    })
  }

  const obtainSessionToken = () =>
    post({
      endPoint: '/wallet/sessions',
      url: rootUrl
    }).then((data) =>
      !data.token || !data.token.length
        ? Promise.reject(new Error('INVALID_SESSION_TOKEN'))
        : data.token
    )

  const pollForSessionGUID = (sessionToken) =>
    get({
      data: { format: 'json' },
      endPoint: '/wallet/poll-for-session-guid',
      sessionToken,
      url: rootUrl
    })

  const getMagicLinkData = (sessionToken) =>
    get({
      contentType: 'application/json',
      endPoint: '/wallet/poll-for-wallet-info',
      sessionToken,
      url: rootUrl
    })

  const authorizeVerifyDevice = (
    fromSessionId,
    magicLinkDataEncoded,
    confirm_device,
    exchange_only_login
  ) =>
    post({
      data: {
        confirm_device,
        exchange_only_login,
        fromSessionId,
        method: 'authorize-verify-device',
        payload: magicLinkDataEncoded
      },
      endPoint: '/wallet',
      url: rootUrl
    })

  const generateUUIDs = (count) =>
    get({
      data: { format: 'json', n: count },
      endPoint: '/uuid-generator',
      url: rootUrl
    }).then((data) =>
      !data.uuids || data.uuids.length !== count
        ? Promise.reject(new Error('Could not generate uuids'))
        : data.uuids
    )

  // createPinEntry :: HEXString(32Bytes) -> HEXString(32Bytes) -> String -> Promise Response
  const createPinEntry = (key, value, pin) =>
    post({
      data: { format: 'json', key, method: 'put', pin, value },
      endPoint: '/pin-store',
      url: rootUrl
    })

  // getPinValue :: HEXString(32Bytes) -> String -> Promise Response
  const getPinValue = (key, pin) =>
    get({
      data: { format: 'json', key, method: 'get', pin },
      endPoint: '/pin-store',
      url: rootUrl
    })

  const resendSmsLoginCode = (guid, sessionToken) =>
    get({
      data: { format: 'json', resend_code: true },
      endPoint: `/wallet/${guid}`,
      sessionToken,
      url: rootUrl
    })

  // marks timestamp when user last backed up phrase
  const updateMnemonicBackup = (sharedKey, guid) =>
    post({
      data: { guid, method: 'update-mnemonic-backup', sharedKey },
      endPoint: '/wallet',
      url: rootUrl
    })

  // endpoint is triggered when mnemonic is viewed
  const triggerMnemonicViewedAlert = (sharedKey, guid) =>
    post({
      data: { format: 'json', guid, method: 'trigger-alert', sharedKey },
      endPoint: '/wallet',
      url: rootUrl
    })

  // Trigger non-custodial sent email
  const triggerNonCustodialSendAlert = (sharedKey, guid, currency, amount) =>
    post({
      data: { amount, currency, guid, method: 'trigger-sent-tx-email', sharedKey },
      endPoint: '/wallet',
      url: rootUrl
    })

  const deauthorizeBrowser = (sessionToken) =>
    get({
      data: { format: 'plain' },
      endPoint: '/wallet/logout',
      sessionToken,
      url: rootUrl
    })

  const reset2fa = (guid, email, newEmail, captchaToken, sessionToken) =>
    post({
      data: {
        captcha: captchaToken,
        contact_email: newEmail,
        email,
        guid,
        method: 'reset-two-factor-form',
        siteKey: window.CAPTCHA_KEY
      },
      endPoint: '/wallet',
      sessionToken,
      url: rootUrl
    })

  const getPairingPassword = (guid) =>
    post({
      data: { guid, method: 'pairing-encryption-password' },
      endPoint: '/wallet',
      url: rootUrl
    })

  const authorizeLogin = (token, confirm, sessionToken) =>
    post({
      data: {
        confirm_approval: confirm,
        method: 'authorize-approve',
        token
      },
      endPoint: '/wallet',
      sessionToken,
      url: rootUrl
    })

  const sendSecureChannel = (message) =>
    post({
      data: {
        length: message.length,
        method: 'send-secure-channel-browser',
        payload: message
      },
      endPoint: '/wallet',
      url: rootUrl
    })

  const handle2faReset = (token) =>
    post({
      data: {
        method: 'reset-two-factor-token',
        token
      },
      endPoint: '/wallet',
      url: rootUrl
    })

  const verifyEmailToken = (token) =>
    post({
      data: {
        method: 'verify-email-token',
        token
      },
      endPoint: '/wallet',
      url: rootUrl
    })

  const validate2faResponse = (email, code) =>
    post({
      contentType: 'application/json',
      data: {
        email,
        response: code
      },
      endPoint: `/wallet/recovery/validate-2fa-response`,
      url: rootUrl
    })

  const sendTwoFAChallenge = (walletGuid, sessionToken) =>
    post({
      contentType: 'application/json',
      data: {
        walletGuid
      },
      endPoint: `/wallet/recovery/send-2fa-challenge`,
      sessionToken,
      url: rootUrl
    })

  return {
    authorizeLogin,
    authorizeVerifyDevice,
    createPayload,
    createPinEntry,
    createResetAccountPayload,
    deauthorizeBrowser,
    fetchBlockchainData,
    fetchPayloadWithSession,
    fetchPayloadWithSharedKey,
    fetchPayloadWithTwoFactorAuth,
    generateUUIDs,
    getMagicLinkData,
    getPairingPassword,
    getPinValue,
    handle2faReset,
    obtainSessionToken,
    pollForSessionGUID,
    resendSmsLoginCode,
    reset2fa,
    savePayload,
    sendSecureChannel,
    sendTwoFAChallenge,
    triggerMnemonicViewedAlert,
    triggerNonCustodialSendAlert,
    updateMnemonicBackup,
    validate2faResponse,
    verifyEmailToken
  }
}
