# How to Migrate from Mailchimp to Kit in 2026 (Without Losing Your List)

> *Northstar may earn a commission if you purchase through affiliate links in this content, at no extra cost to you.*

---

## Why People Leave Mailchimp

The trigger is usually a bill. You hit a contact tier threshold, Mailchimp auto-upgrades your plan mid-month, and the charge is two or three times what you expected. Then you start poking around and find out you've been paying for unsubscribed contacts for the past year. The community forums confirm you're not alone — Mailchimp's Trustpilot profile is dotted with variations of this exact story, usually from small businesses and creators who never expected email to become a significant monthly expense.

The other trigger is complexity. Mailchimp's interface has accumulated features over years of acquisitions and pivots. If you're a creator, blogger, or service business, you don't need website builders and predictive demographics. You need clean automation flows, reliable sequences, and an interface that doesn't require a tutorial every time you try to do something basic.

Kit (formerly ConvertKit) was built specifically for creators and small businesses with these frustrations. The migration process is straightforward — most people complete it in a weekend — but getting the details right matters. Here's how to do it without losing your list, your segments, or your momentum.

---

## Before You Start: The Pre-Migration Checklist

Rushing the export is the most common migration mistake. Take 30–60 minutes to document your current setup before touching anything.

**Subscriber Data**
- [ ] Note your total subscriber count and how many are actively subscribed (vs. unsubscribed, cleaned, archived)
- [ ] List every segment and tag you're currently using in Mailchimp
- [ ] Identify any groups (Mailchimp's audience subdivisions)

**Active Automations**
- [ ] List every active automation in Mailchimp — note the trigger, the sequence steps, and the send delays
- [ ] Screenshot or export the automation map for each active workflow; these won't transfer
- [ ] Note which emails in each sequence are getting meaningful click/open rates — worth preserving

**Campaigns and Templates**
- [ ] You cannot transfer Mailchimp templates to Kit — they use different template architectures
- [ ] Save any campaigns you want to reference as PDFs or screenshots (Mailchimp's export to PDF is under Reports)
- [ ] Note your current "From" name and sending domain

**Integrations**
- [ ] List every tool currently connected to Mailchimp: Shopify, WordPress, Zapier, Teachable, etc.
- [ ] Check which integrations have native Kit support (most major ones do) vs. those that will need Zapier

Once documented, you're ready to move.

---

## Step 1: Export Your Mailchimp Subscriber List

Mailchimp's CSV export is clean and straightforward.

1. Log into Mailchimp and navigate to **Audience → All contacts**
2. Click **Export Audience** (top right of the contacts table)
3. Select **Export as CSV**
4. Mailchimp will email you a download link (usually within a few minutes)
5. Download the file and open it to verify the columns: email address, first name, last name, any custom fields, tags, and subscription status

**Important:** The export includes all contacts regardless of status. Before importing to Kit, open the CSV in Excel or Google Sheets and **filter out non-subscribed contacts** — keep only rows where the status column shows "subscribed." Importing unsubscribed or cleaned contacts to a new platform is poor practice and can damage your new sender reputation.

If you have multiple Mailchimp audiences, export each one separately. You'll decide during import whether to combine them or keep them in separate Kit forms/tags.

---

## Step 2: Set Up Your Kit Account

[Try Kit →](https://broker.thedataduel.com/visit/convertkit) — Kit's Creator plan starts at $29/month for up to 1,000 subscribers, and the Free plan supports up to 10,000 if you want to test before paying anything.

Once inside:

1. Go to **Settings → Email** and verify your sending domain by adding the required DNS records (SPF/DKIM). This is non-negotiable — skip it and your deliverability will suffer.
2. Configure your **From name** and **Reply-to address** to match what your subscribers recognize
3. Optionally set up a custom sending domain under Settings if you want emails to come from @yourdomain.com rather than Kit's default

Give domain verification 24–48 hours to propagate before sending any campaigns.

---

## Step 3: Import Your Subscriber List into Kit

1. Navigate to **Subscribers → Import Subscribers** in Kit
2. Upload your cleaned CSV file
3. Kit will prompt you to **map fields** — match the CSV columns to Kit's subscriber fields:
   - Email → Email
   - First Name → First Name
   - Last Name → Last Name
   - Any custom fields → Create new custom fields in Kit or map to existing ones
4. During import, Kit asks if you want to **add all imported subscribers to a Tag** — use this to mark the cohort (e.g., "Migrated from Mailchimp — June 2026"). This makes it easy to track the migration and target re-engagement campaigns later.
5. Confirm and run the import. Kit will process the file and send a completion notification.

For lists under 50,000 subscribers, the import typically completes within 5–10 minutes.

---

## Step 4: Re-Create Your Automations in Kit

This is the part that takes the most time — and it's also where Kit often wins converts over, because the visual automation builder is genuinely better than Mailchimp's step-based editor for most use cases.

**Kit's Visual Automation Builder:**
- Drag-and-drop canvas with if/then branching
- Triggers: subscriber joins a form, clicks a link, purchases a product, is tagged, adds a custom field
- Actions: send an email, add/remove a tag, subscribe to a sequence, add a delay
- Conditions: has tag, hasn't opened, custom field equals X

To recreate a Mailchimp automation in Kit:
1. Go to **Automations → New Automation**
2. Choose a trigger (e.g., "Joins a Form" for a welcome sequence)
3. Add a delay followed by your first email
4. Branch as needed using conditions
5. Reference your pre-migration screenshots to ensure pacing and email content match

Kit's **Sequences** (standalone drip series) are separate from Automations. A sequence is an ordered series of emails with set delays — equivalent to Mailchimp's "Classic Automation" where you send a fixed series after someone subscribes. Automations are for more complex conditional flows.

Most welcome sequences take 30–60 minutes to rebuild. A complex launch or onboarding funnel might take a few hours.

---

## What Doesn't Transfer

Be clear-eyed about the gaps:

| Item | Transfers? | Notes |
|------|-----------|-------|
| Subscriber email addresses | ✅ | Via CSV export |
| Tags and segments | ✅ (manual) | Re-create tags in Kit at import |
| Custom fields | ✅ (manual) | Map during import |
| Email templates | ❌ | Must rebuild in Kit's editor |
| Campaign history/analytics | ❌ | Lives in Mailchimp forever; export reports for records |
| Automation logic | ❌ (manual) | Must rebuild in Kit's visual builder |
| Mailchimp landing pages | ❌ | Rebuild in Kit's landing page builder |

---

## Should You Send a Re-Confirmation Email?

This is a judgment call with real tradeoffs.

**Case for re-confirmation:** Some subscribers may have forgotten who you are. A "we've moved, please confirm you still want to hear from us" email naturally prunes your list to your most engaged contacts. Kit's list is cleaner from day one. Deliverability is better out of the gate.

**Case against:** You're asking warm subscribers to take an action they shouldn't have to take. Most won't bother — not because they don't want your emails, but because re-confirmation emails look like spam to a lot of people. A typically re-confirmation campaign sees 20–40% confirmation rates, meaning you voluntarily shrink your list by 60–80%.

**Recommended middle ground:** Don't re-confirm your whole list. Instead, send a "we've moved" introduction email to your full subscribed list explaining the platform change, pointing to what's coming, and giving people a clear unsubscribe link if they want out. Track who engages with that email, then suppress non-openers from your first few campaigns while you build engagement history with your new sending infrastructure.

---

## Migration Timeline

| Phase | Time Required |
|-------|---------------|
| Pre-migration audit and documentation | 30–60 minutes |
| Mailchimp CSV export and cleaning | 30 minutes |
| Kit account setup and domain verification | 1–2 hours (plus DNS propagation: 24–48 hrs) |
| Subscriber import and tagging | 30 minutes |
| Automation rebuild | 2–8 hours depending on complexity |
| Welcome/introduction email to list | 30 minutes |
| **Total active work** | **4–12 hours** |

Most people comfortably complete a full migration in a single weekend, with DNS verification running overnight Friday into Saturday.

---

## After the Migration

Once you're live on Kit, disconnect your Mailchimp integrations (Zapier zaps, API connections, third-party tools) and reconnect them to Kit. Run a test email to yourself and a colleague to confirm authentication is working and emails are rendering correctly.

Keep your Mailchimp account on its current plan for at least 30 days after migration. Don't cancel immediately — you may need to reference campaign history, double-check that automations were fully migrated, or retrieve contacts you accidentally missed.

[Try Kit →](https://broker.thedataduel.com/visit/convertkit) — if you're below 10,000 subscribers, you can complete this entire migration on the free plan before paying a dollar.

If your reasons for leaving Mailchimp are primarily cost-related and your business is more e-commerce or B2B than creator-focused, [Try Moosend →](https://broker.thedataduel.com/visit/moosend) — the pricing comparison at 10,000+ subscribers is significant.

---

## Related Reading

- [Kit Review 2026](/articles/kit-review)
- [Kit vs. Mailchimp 2026](/articles/kit-vs-mailchimp)
