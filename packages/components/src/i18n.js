import af from './locales/af.js'
import bg from './locales/bg.js'
import cs from './locales/cs.js'
import da from './locales/da.js'
import de from './locales/de.js'
import el from './locales/el.js'
import es from './locales/es.js'
import fr from './locales/fr.js'
import hu from './locales/hu.js'
import it from './locales/it.js'
import lt from './locales/lt.js'
import nl from './locales/nl.js'
import pl from './locales/pl.js'
import pt from './locales/pt.js'
import ro from './locales/ro.js'
import uk from './locales/uk.js'
import vi from './locales/vi.js'
import zh_CN from './locales/zh_CN.js'
import zh_TW from './locales/zh_TW.js'

const MESSAGES = {
  // English is the source and the fallback, so it stays here where the keys are
  // defined. Every other locale is a file under locales/, keyed the same.
  en: {
    // Common
    email: 'Email',
    password: 'Password',
    first_name: 'First name',
    last_name: 'Last name',
    name: 'Name',
    description: 'Description',
    owner: 'Owner',
    role: 'Role',
    sites: 'Sites',
    sign_in: 'Sign in',
    back_to_sign_in: 'Back to sign in',
    to_continue: 'to continue.',
    connection_error: 'Connection error. Please try again.',
    cant_be_blank: "can't be blank",

    // Sign-in form
    keep_signed_in: 'Keep me signed in',
    forgot_password: 'Forgot password?',
    pending_confirmation: 'Account pending confirmation. Please check your email — this page will continue once you have clicked the link.',
    pending_expired: 'That confirmation link request has expired. Please sign in again.',
    invalid_credentials: 'Invalid email or password.',

    // Opening a site (to_site). One message covers both "no such site" and "not
    // yours": which of the two it is isn't the visitor's business, and saying
    // would confirm that a site by that name exists.
    site_unavailable: 'That site is not available on this account.',
    go_to_sites: 'Go to your sites',

    // Forgot password
    reset_password: 'Reset password',
    reset_sub: "We'll email you a link to set a new password.",
    send_reset_link: 'Send reset link',
    reset_sent: "If an account exists for {email}, we've emailed a reset link.",

    // Set / reset password
    set_your_password: 'Set your password',
    reset_your_password: 'Reset your password',
    new_password: 'New password',
    confirm_password: 'Confirm password',
    set_password: 'Set password',
    reset_password_btn: 'Reset password',
    passwords_no_match: 'Passwords do not match.',
    set_password_error: 'Could not set the password. The link may have expired.',

    // Confirm account
    account_confirmed: 'Your account has been confirmed.',
    confirm_error: 'Invalid or expired confirmation link.',

    // Register
    password_hint_intro: 'Password must have at least:',
    password_hint_length: '8 characters',
    password_hint_lower: 'lower case character',
    password_hint_upper: 'upper case character',
    password_hint_special: 'one digit or punctuation character',
    accept_terms: 'Accept',
    terms_link: 'terms and conditions',
    legal_unavailable: 'This document could not be loaded. Please try again later.',
    register: 'Register',
    bot_failed: 'Bot verification failed. Please try again.',
    register_error: 'Could not create the account. Please try again.',
    account_created: 'Account created for {email}.',
    check_inbox: 'Check your inbox for a confirmation link, then {link}.',

    // User page
    my_account: 'My account',
    sign_out: 'Sign out',
    phone_number: 'Phone number',
    language: 'Language',

    // Sites list
    no_sites: 'You have not registered any solar sites yet.',
    view: 'View',

    // Site detail
    connect: 'Connect →',
    inverter: 'Inverter',
    battery: 'Battery',
    user_access: 'User access',
    invite_user: 'Invite user',
    role_owner: 'Owner',
    role_viewer: 'Viewer',
    role_admin: 'Admin',
    role_none: 'None',
    no_users: 'No users.',
    save: 'Save',
    cancel: 'Cancel',
    rename: 'Rename',
    failed_rename: 'The site could not be renamed.',
    device_info: 'Device info',
    local_ip: 'Local IP',
    activate_site: 'Activate site',
    activation_requesting: 'Requesting activation…',
    activation_requested: 'Activation has been requested.',
    activation_requested_for: 'Activation has been requested for {name}.',
    activation_unaffected: 'Please note activation is a registration process with {org} and does not affect the functioning of your system or device.',
    activation_unaffected_generic: 'Please note activation is a registration process and does not affect the functioning of your system or device.',
    activation_view_site: 'View this system',
    activation_no_unit: 'We could not find that system. Open this page from the link on your device.',
    activation_request_failed: 'The request could not be sent.',
    activation_too_many: 'Too many attempts. Please wait a while and try again.',
    copy_to_clipboard: 'Copy to clipboard',
    copied: 'Copied',
    site_reset_password_instruction: 'Copy the token below and paste it back into your device to reset its password.',
    site_reset_password_unavailable: 'This token could not be generated. You may not have access to this site.',
    local_network_devices: 'Local network devices',
    status: 'Status',
    network_ip: 'Network IP',
    url: 'URL',
    access_via_cloud: 'Access via cloud',
    connected: 'Connected',
    online: 'Online',
    unknown: 'Unknown',
    no_local_devices: 'No devices found on this network yet.',
    not_seeing_your_device: 'Not seeing your device?',
    local_discovery_explainer: 'This page looks for SolarAssistant devices on the network you are browsing from, so open it on the same network as the device.',
    local_discovery_hotspot_hint: 'If you entered a WiFi name and password into the device, check whether it has started its own WiFi hotspot. That means it did not manage to join your network.',
    last_seen: 'Last seen',
    site: 'Site',
    open_site: 'Open site',
    local_network_ip: 'Local network IP',
    checking_again: 'Checking again',
    checking_in_seconds: 'in {seconds}s',
    device_offline: 'Device offline',
    device_not_connected: 'Your device is not connected to the internet.',
    local_network_only: 'Local network only',
    offline_pending: 'Pending',
    offline_not_found: 'Not found',
    offline_connected: 'Connected',
    offline_disconnected: 'Disconnected',
    offline_http_error: 'Error response',
    offline_timeout: 'Timed out',
    offline_proxy_unreachable: 'Cloud unreachable',
    software_build: 'Software build',
    failed_load_site: 'Failed to load site.',

    // Site invite
    invite: 'Invite',

    // Site register
    register_site: 'Register site',
    failed_register: 'Failed to register site.',
  },
  af, bg, cs, da, de, el, es, fr, hu, it, lt, nl, pl, pt, ro, uk, vi, zh_CN, zh_TW,
}

let _locale = 'en'

function match(tag) {
  const code = tag.replace('-', '_')
  if (MESSAGES[code]) return code
  const base = tag.split('-')[0]
  return MESSAGES[base] ? base : null
}

// The page's own language outranks the browser's, because the components sit
// inside someone else's markup. A portal written in English stays English for a
// visitor browsing in German — translating the buttons and nothing around them
// reads as a bug, not a feature. What the browser prefers only decides pages that
// declare no language of their own.
function detect() {
  try {
    const stored = localStorage.getItem('sa_locale')
    if (stored && MESSAGES[stored]) return stored
  } catch {}
  const declared = document.documentElement.lang
  if (declared) return match(declared) ?? 'en'
  for (const tag of navigator.languages ?? []) {
    const code = match(tag)
    if (code) return code
  }
  return 'en'
}

_locale = detect()
// Only claim the document's language where the page has not stated one; saying
// `de` over someone's English page would misdescribe their prose to a screen
// reader, which is the one thing this attribute exists to get right.
if (!document.documentElement.lang) document.documentElement.lang = _locale

export function setLocale(code) {
  if (!code || code === _locale) return
  // A code with no messages behind it is a mistake on the caller's side, and
  // falling back silently leaves them nothing to see it by.
  if (!MESSAGES[code]) {
    console.warn(
      `[solar-assistant] No messages for locale "${code}". Using English. ` +
        `Register them with addMessages('${code}', { … }).`,
    )
  }
  _locale = MESSAGES[code] ? code : 'en'
  if (!document.documentElement.lang) document.documentElement.lang = _locale
  try { localStorage.setItem('sa_locale', _locale) } catch {}
}

export function addMessages(code, messages) {
  MESSAGES[code] = { ...MESSAGES[code], ...messages }
}

export function currentLocale() {
  return _locale
}

// Whatever is registered, so a locale added with addMessages appears in a
// language switcher without the page having to list it a second time.
export function locales() {
  return Object.keys(MESSAGES)
}

// `Intl.DisplayNames` names a language in its own tongue, including one we have
// never heard of. It calls zh_CN "中文（中国）", naming the region; the script is
// what actually distinguishes these two to a reader, so say that instead.
const ENDONYMS = { zh_CN: '简体中文', zh_TW: '繁體中文' }

export function localeName(code) {
  if (ENDONYMS[code]) return ENDONYMS[code]
  const tag = code.replace('_', '-')
  try {
    return new Intl.DisplayNames([tag], { type: 'language' }).of(tag) ?? code
  } catch {
    return code
  }
}

export function t(key, vars) {
  const msg = (MESSAGES[_locale] ?? MESSAGES.en)[key] ?? MESSAGES.en[key] ?? key
  if (!vars) return msg
  return msg.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
}
