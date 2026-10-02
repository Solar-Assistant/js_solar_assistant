# Database: keeping your own data

SolarAssistant stores what it measures: sites, metrics, events. It does not store what **you** know
about a customer: service notes, maintenance records, warranty dates, preferences. If your portal
needs those, they belong in a database of your own, and the question is how that database knows who
is asking.

SolarAssistant is a standard OpenID Connect provider. A hosted database that accepts one can sign
your customers in with their SolarAssistant account, and then enforce row-level security on the
result. You run no backend and store no passwords. This guide uses
[Supabase](https://supabase.com); anything else that takes an OIDC issuer is configured the same
way.

If what you want is to read a customer's **SolarAssistant** data from a product of your own, this
is not the page you want: see [OAuth: Connect SolarAssistant](oauth.md).

## What SolarAssistant provides

| | |
|---|---|
| Issuer | `https://solar-assistant.io`, whatever domain your portal runs on |
| Discovery | `https://solar-assistant.io/.well-known/openid-configuration` |
| Signing keys | `https://solar-assistant.io/oauth/certs` |
| Algorithm | `RS512` |
| Token exchange | `POST https://solar-assistant.io/api/v1/id_token`, with your portal's session token |
| Scope | `openid`, for the redirect flow at the end of this page. The exchange needs none. |

The identity token carries:

| Claim | |
|---|---|
| `sub` | The customer's SolarAssistant user id. Stable; it never changes or gets reused. |
| `email`, `email_verified` | Their address, and whether they have confirmed it. |
| `name`, `given_name`, `family_name` | |
| `aud` | Your application's client id. |

**Always use `https://solar-assistant.io` as the issuer, even when your portal runs on your own
domain.** It is the issuer the identity token names, and a provider configured with any other host
will reject the token.

## Setting it up

1. **Register an application** on your organization's Applications page, and **leave the redirect URI
   empty**. The customer never leaves your portal in this flow, so there is nothing to redirect to.
   Only an organization's admin member or owner may register one.

   Keep both the client id and the client secret shown at registration. The secret is not used to
   sign anyone in here, but Supabase will refuse to save a provider without one.

2. **Add a custom OIDC provider in Supabase**, under Authentication:

   | | |
   |---|---|
   | Identifier | `custom:solar-assistant`. The `custom:` prefix is required and is not added for you. |
   | Issuer | `https://solar-assistant.io` |
   | Client id | Your application's client id |
   | Client secret | Your application's client secret. Required by the form; nothing in this flow reads it. |

   Supabase finds the endpoints and the signing keys from the issuer on its own.

3. **Exchange your portal's session for an identity token, and sign in with it.** Your portal already
   holds a SolarAssistant session token, the one `<sa-sign-in>` stored. Trade it for a token that
   names the customer to your application, and hand that to Supabase:

   ```js
   import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
   import { readToken } from '@solar-assistant/api'

   const supabase = createClient('https://<project-ref>.supabase.co', '<publishable-key>')

   const { data: { session } } = await supabase.auth.getSession()

   if (!session) {
     const nonce = crypto.randomUUID()
     const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(nonce))
     const hashed = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')

     const { id_token } = await fetch('https://solar-assistant.io/api/v1/id_token', {
       method: 'POST',
       headers: {
         Authorization: `Bearer ${readToken('sa_token')}`,
         'Content-Type': 'application/json'
       },
       body: JSON.stringify({ client_id: '<client-id>', nonce: hashed })
     }).then(r => r.json())

     await supabase.auth.signInWithIdToken({
       provider: 'custom:solar-assistant',
       token: id_token,
       nonce
     })
   }
   ```

   **Send us the hash and Supabase the original.** Supabase compares the SHA-256 of the nonce you
   give it against the `nonce` claim in the token, so the claim has to be the digest. We copy whatever
   you send into the claim untouched. Getting these the wrong way round fails with
   `invalid nonce`.

   The identity token is good for five minutes, because it exists only to be spent on the next line.
   The Supabase session it buys lasts as long as Supabase's own expiry.

4. **Use it.** Supabase now holds a session of its own for this customer:

   ```js
   await supabase.from('service_notes').insert({ site_id: 4821, note: 'Replaced the DC isolator' })
   ```

## Running the example

`packages/api/example/database` is the whole flow as one page: sign in, exchange, then write a row
and read it back to prove the policy. Use it to check your Supabase provider before writing any of
your own code, because a provider configured wrongly fails with a message from Supabase rather than
from us, and the page shows you each step's result.

```
node packages/api/example/database/serve.js
```

It opens at `http://localhost:8001/` and asks for your project URL, publishable key, application
client id and organization id, which it remembers in that browser. It needs no redirect URI
registered, since nothing redirects. Create the `service_notes` table below first; the page prints the
SQL if you have not.

## Row-level security

The publishable key is in your page, so anyone can read it. What keeps one customer out of
another's rows is a policy on every table, not the key:

```sql
create table service_notes (
  id      bigint generated always as identity primary key,
  user_id uuid not null default auth.uid(),
  site_id bigint not null,
  note    text not null
);

alter table service_notes enable row level security;

create policy "own rows" on service_notes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
```

`auth.uid()` is the id Supabase gave the customer, not their SolarAssistant id. The SolarAssistant
`sub` is kept on the customer's identity in Supabase if you need to match the two.

## What the customer sees

Nothing. They sign in to your portal as they always have, and their service notes are there. The
exchange is two requests from your own page: they are never sent to solar-assistant.io, never sign in
twice, and never approve anything on a screen of ours.

That is why the application needs no redirect URI, and why it does not matter whether the customer
happens to hold a solar-assistant.io session in that browser. The exchange authenticates on the
portal's session token and ignores cookies entirely, so every customer takes the same path.

## If you would rather redirect

Supabase can also act as an ordinary OAuth client and collect the identity itself, with
`signInWithOAuth({ provider: 'custom:solar-assistant' })` in place of step 3. Then your application
**does** need a redirect URI, which is your project's callback:

```
https://<project-ref>.supabase.co/auth/v1/callback
```

The trade is what the customer sees: they are sent to solar-assistant.io, sign in there a second
time, and approve sharing their profile with your application before being returned to your page.
Supabase keeps its own session afterwards, so it is once per browser rather than once per visit. Use
this if you want the sign-in to happen without your page holding a SolarAssistant session at all.

## What the token does not say

The identity token says **who** the customer is. It does not say which sites they may see, and that
changes over time anyway: sites are shared, transferred and removed while a Supabase session lives
on.

So protect a table by `user_id` even when it is keyed on `site_id`. If a rule genuinely depends on
site access, check it at the moment it matters: in a Supabase Edge Function, ask the
[API](api.md) for the site with the customer's SolarAssistant token, and write the row only if it
answers.

It does not say they are your customer either. Anyone with a confirmed SolarAssistant account who
reaches your portal can sign in and so obtain a row in `auth.users`, exactly as they could register on
your portal in the first place. Row-level security still keeps them to their own rows, so this is not a
way into anyone else's data, but do not read the table as a customer list.
