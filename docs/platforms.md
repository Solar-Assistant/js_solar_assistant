# Making monitoring feel part of your website

Your website runs on WordPress, Joomla, a site builder or something like it, and you want your customers'
solar monitoring to feel like part of it — not a detour to somewhere that looks like another company.

## Why monitoring is not just another page on your site

A CMS page is rarely only your own code. A WordPress or Joomla site carries a theme, plugins, an
analytics tag, a chat widget, a cookie banner — often dozens of scripts, most of them written and
updated by someone else. That is a reasonable trade for a marketing page. It is the wrong trade for
the page where your customers sign in, because everything on a page can see everything else on it,
including what a customer types.

So monitoring gets its own subdomain. A browser treats `portal.acme.com` and `www.acme.com` as
separate sites, so what your CMS loads has no reach into your customers' monitoring, and you can add
plugins, change themes or rebuild your website entirely without any of it touching them.

## The subdomain is your own app

`portal.acme.com` is a repository on your GitHub, hosted by us. The pages are plain HTML you
control — you push a change, look at it on staging, and promote it when you're happy. Nothing on
those pages comes from your CMS, which is the point, and nothing about them is fixed by us either.

## What to match

Six things, and the first two do most of the work:

- **Your header and navigation** — the bar across the top is what makes two sites read as one.
- **Your footer.**
- **Your fonts** — link the same webfont your site uses.
- **Your colours** — set once on your organization's Cloud portal page, substituted into every page.
- **Your logo** — copied into the repository.
- **Your wording** — if your site says "systems", the portal shouldn't say "sites".

Then add a link to it in your main navigation, and point the logo in the portal back at your website.
