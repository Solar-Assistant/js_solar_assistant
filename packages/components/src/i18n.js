const MESSAGES = {
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
    pending_confirmation: 'Account pending confirmation. Please check your email.',
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
    register: 'Register',
    bot_failed: 'Bot verification failed. Please try again.',
    register_error: 'Could not create the account. Please try again.',
    account_created: 'Account created for {email}.',
    check_inbox: 'Check your inbox for a confirmation link, then {link}.',

    // User page
    my_account: 'My account',
    sign_out: 'Sign out',
    phone_number: 'Phone number',

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
    device_info: 'Device info',
    local_ip: 'Local IP',
    last_seen: 'Last seen',
    software_build: 'Software build',
    failed_load_site: 'Failed to load site.',

    // Site invite
    invite: 'Invite',

    // Site register
    register_site: 'Register site',
    failed_register: 'Failed to register site.',
  },
}

let _locale = 'en'

function detect() {
  try {
    const stored = localStorage.getItem('sa_locale')
    if (stored && MESSAGES[stored]) return stored
  } catch {}
  for (const lang of navigator.languages ?? []) {
    const code = lang.replace('-', '_')
    if (MESSAGES[code]) return code
    const base = lang.split('-')[0]
    if (MESSAGES[base]) return base
  }
  return 'en'
}

_locale = detect()
if (document.documentElement.lang !== _locale) document.documentElement.lang = _locale

export function setLocale(code) {
  if (!code || code === _locale) return
  _locale = MESSAGES[code] ? code : 'en'
  document.documentElement.lang = _locale
  try { localStorage.setItem('sa_locale', _locale) } catch {}
}

export function addMessages(code, messages) {
  MESSAGES[code] = { ...MESSAGES[code], ...messages }
}

export function t(key, vars) {
  const msg = (MESSAGES[_locale] ?? MESSAGES.en)[key] ?? MESSAGES.en[key] ?? key
  if (!vars) return msg
  return msg.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
}
