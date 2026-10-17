# Fraud first-response line: knowledge pack (v1, 2026-10-17)

What the voice agent knows. Public rules only. Every fact carries its source; anything inferred is marked **[inferred]**.
This file is loaded into the Bolna agent as its knowledge base and drives the 1930 form-filling tool.

## 1. Golden rule for the caller
- Call **1930** (National Cyber Crime Helpline) or file at **cybercrime.gov.in** as fast as possible. Quick reports let police and banks put a hold on the money before it is moved on. Guidance commonly cites the first 24 to 72 hours. ([apnilaw](https://www.apnilaw.com/legal-articles/how-to-file-a-cyber-fraud-complaint-on-the-national-cyber-crime-reporting-portal-ncrp-in-india/))
- Also tell your **own bank** right away (app, branch or customer care), in writing if possible. This starts the RBI liability clock (section 3).
- The agent never asks for OTP, UPI PIN, card CVV, passwords, or remote-access apps. If the caller is still on a call with the scammer, tell them to hang up first.

## 2. 1930 / NCRP complaint: the fields to capture
Source: NCRP filing guide ([apnilaw](https://www.apnilaw.com/legal-articles/how-to-file-a-cyber-fraud-complaint-on-the-national-cyber-crime-reporting-portal-ncrp-in-india/)). Category: **Financial Fraud**.

| Group | Field | Notes for the agent |
|---|---|---|
| Complainant | Name, address, mobile, email | Mobile is required for OTP on the portal. |
| Incident | Fraud type | UPI fraud, phishing link, fake customer care, investment/task scam, OTP/KYC scam, sextortion, digital arrest, other |
| Incident | Date and time | Ask for the exact time of the first debit. |
| Incident | Description | Short, factual, in the caller's words; no guesses. |
| Transaction (one row per debit) | Mode | UPI / IMPS / NEFT / card / wallet |
| | Transaction ID or **UTR** | UPI UTR is 12 digits. Read it back digit by digit in groups of 4. |
| | Bank or app | Victim's bank and the app used (PhonePe, GPay, Paytm, BHIM...) |
| | Amount | Confirm in words ("pachees hazaar, 25,000"). |
| Suspect (if known) | Phone number, UPI ID / VPA, bank account, website, app name | |
| Evidence | Screenshots, bank SMS, statement | The agent tells the caller what to save; the follow-up SMS lists it. |
| Output | NCRP acknowledgement number | Share it with 1930 so the phone and online complaints are linked. |

## 3. RBI liability rules (unauthorised electronic transactions)
Source: RBI circular RBI/2017-18/15, DBR.No.Leg.BC.78/09.07.005/2017-18, 6 July 2017 ([RBI](https://www.rbi.org.in/scripts/FS_Notification.aspx?Id=11040)).
- **Zero liability** if the fraud was the bank's fault, or a third-party breach (neither bank nor customer at fault) reported **within 3 working days** of the bank's alert.
- **Reported in 4 to 7 working days** (third-party breach): customer pays the lower of the transaction value or a cap: Rs 5,000 (basic savings/BSBD), Rs 10,000 (other savings, prepaid, credit cards up to Rs 5 lakh limit), Rs 25,000 (other current accounts, cards above Rs 5 lakh).
- **After 7 working days:** per the bank's board-approved policy.
- **Customer negligence** (e.g. shared OTP/PIN): customer bears the loss until they report; losses after reporting are the bank's.
- Bank must **credit the disputed amount within 10 working days** of notice (shadow reversal), value-dated to the fraud date.
- Bank must resolve within **90 days**; burden of proof is on the bank.
- **[inferred] Honesty note:** when the victim themselves approved the payment after being tricked (most UPI scams), banks usually treat it as customer-authorised, so the zero-liability rule often does not apply. The agent must not promise a refund. It can say: "Report fast; the faster you report, the better the chance the money is held."

## 4. UPI dispute path
Source: [Fibe](https://www.fibe.in/blogs/upi-dispute-redressal-mechanism/) (covers failed/wrong transfers more than fraud).
1. Raise a complaint in the UPI app (transaction history, "Raise complaint"), with transaction ID, amount, date, receiver UPI ID, screenshots.
2. Bank (payer's bank, then beneficiary's bank).
3. NPCI ("UPI Help" / grievance portal).
4. RBI Ombudsman if unresolved after 30 days.

## 5. RBI Integrated Ombudsman Scheme 2021 (escalation)
Source: [Standard Chartered summary of RB-IOS 2021](https://www.sc.com/in/important-information/banking-ombudsman).
- First complain to the bank in writing. File with the Ombudsman if the bank rejects it or does not reply within **30 days**.
- Deadline: within 1 year of the bank's reply, or 1 year and 30 days of the complaint if no reply.
- File online at **cms.rbi.org.in** (or by post/email to CRPC, crpc@rbi.org.in).
- No cap on the disputed amount; up to Rs 20 lakh for consequential loss plus up to Rs 1 lakh for time, expense and harassment.

## 6. Numbers for the pitch and interview
- NCRP: Rs 22,849 crore lost and 19.19 lakh complaints in 2024; about Rs 19,813 crore and 21.78 lakh complaints in 2025 (I4C data, [IANS, 3 Jan 2026](https://ianslive.in/indians-lose-over-rs-52976-crore-to-cyber-frauds-over-six-years-report--20260103154943)).
- CFCFRMS (the system behind 1930): over Rs 7,000 crore saved from more than 23 lakh complaints since 2021 (MoS Home, Rajya Sabha, 17 Dec 2025, [AIR News](https://www.newsonair.gov.in/over-rs-7000-crore-saved-through-citizen-financial-cyber-fraud-reporting-and-management-system/)).
- Newer headline (Jul 2026): the reporting system has saved about Rs 11,000 crore since 2021, while scams crossed Rs 55,000 crore (New Indian Express via fraud scrape, `nw_083495266a8b`). **[inferred]** So roughly 1 rupee in 5 is saved; the rest is gone before anyone acts. Speed and complete details are the lever this product pulls.
- "Golden hour" wins are reported city by city: Mumbai 1930 saved Rs 202 crore (`nw_09725c5e71c5`); Hyderabad golden-hour complaints saved Rs 22.21 lakh (`nw_547693d77a92`); Mumbai saved Rs 80 lakh on the first day after doubling 1930 staff (`nw_4f6bd0c51dfd`).
- Getting held money back is slow: MHA is "moving to speed up restoration" after 1 lakh citizens got refunds (Moneylife, Jun 2026, `nw_e2f619e1410b`).

## 7. Call script skeleton (Hinglish)
1. Calm open: "Aap safe hain. Main aapki complaint 1930 ke format mein abhi tayyar karta hoon. Pehle, kya scammer abhi bhi line pe hai?"
2. Consent: record a yes to take details and share them with police and the bank.
3. Story in own words, then the agent asks only for missing fields (section 2).
4. Per-debit loop: amount, UTR (read back), app, time.
5. Read back the summary; caller confirms.
6. Next steps: call 1930 now with this summary (or the agent warm-transfers), tell your bank in writing today, save these screenshots. SMS with the filled complaint follows.
7. Weekly callback with case status.

## 8. After the money is held (from the fraud scrape, Oct 2026)
- Victims can now ask for held money to be released online, through an I4C "restoration" module (headlines: ANI `nw_c0432838baf8`, New Indian Express `nw_4deb958df383`). The agent should tell callers with a "put on hold" message that this route exists. **[to verify]** Check the exact portal steps before the demo.
- MHA has asked agencies to verify complaints before freezing bank accounts (`nw_ce866f12ddab`). This helps innocent receivers whose accounts got frozen.

## 9. Fake recovery agents
- Scammers target victims a second time by posing as "recovery experts". Comments like "SURECYBER Thank you sir. I am honored to have my money back" appear on fraud-help videos (`yt_aa4ad42e27a5`, `yt_3a664c376390`).
- The agent must warn every caller: no genuine agency charges a fee to recover money. Police, 1930 and banks never ask for an advance payment.
