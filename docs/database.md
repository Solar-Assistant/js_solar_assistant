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
| Issuer | `https://solar-assistant.io` |
| Discovery | `https://solar-assistant.io/.well-known/openid-configuration` |
| Signing keys | `https://solar-assistant.io/oauth/certs` |
| Algorithm | `RS512` |
| Scope | `openid` |

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

1. **Register an application** on your organization's Applications page. Its redirect URI is your
   Supabase project's callback:

   ```
   https://<project-ref>.supabase.co/auth/v1/callback
   ```

2. **Add a custom OIDC provider in Supabase**, under Authentication. Give it the issuer above, your
   application's client id and secret, and the scope `openid`. Supabase finds the endpoints and the
   signing keys from the issuer on its own. Name it `custom:solar-assistant`.

3. **Sign the customer in to Supabase** from your page:

   ```js
   import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

   const supabase = createClient('https://<project-ref>.supabase.co', '<publishable-key>')

   const { data: { session } } = await supabase.auth.getSession()
   if (!session) await supabase.auth.signInWithOAuth({ provider: 'custom:solar-assistant' })
   ```

4. **Use it.** Supabase now holds a session of its own for this customer:

   ```js
   await supabase.from('service_notes').insert({ site_id: 4821, note: 'Replaced the DC isolator' })
   ```

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

The first time Supabase asks who they are, the customer is sent to SolarAssistant, signs in there,
and approves sharing their profile with your application. They are then returned to your page.
After that Supabase keeps its own session, so this happens once per browser rather than once per
visit.

This sign-in is separate from the one your portal's `<sa-sign-in>` performs. The portal's token is
for the SolarAssistant API and means nothing to Supabase.

## What the token does not say

The identity token says **who** the customer is. It does not say which sites they may see, and that
changes over time anyway: sites are shared, transferred and removed while a Supabase session lives
on.

So protect a table by `user_id` even when it is keyed on `site_id`. If a rule genuinely depends on
site access, check it at the moment it matters: in a Supabase Edge Function, ask the
[API](api.md) for the site with the customer's SolarAssistant token, and write the row only if it
answers.
