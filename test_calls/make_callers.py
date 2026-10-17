"""Builds synthetic victim callers for testing the fraud first-response agent.
All names, numbers, UTRs and accounts are fake. UTRs start with 9999 so they can never match a real one.
Each caller is modelled on a real public story (inspired_by = corpus record id) but shares no personal data with it."""
import json, random
random.seed(20261017)

def utr(): return "9999" + "".join(random.choice("0123456789") for _ in range(8))
def phone(): return "+91 90000 " + "".join(random.choice("0123456789") for _ in range(5))

C = [
 # id, type, inspired_by, lang, persona, style, debits[(amt, mode, app, bank, time)], suspect, reported_after, complications
 ("V01","fake customer care","rd_4c215207f765","Hinglish","Rohit, 27, Bengaluru, software tester","fast, embarrassed, mixes English terms",
  [(18500,"UPI","Google Pay","HDFC Bank","2026-10-16 21:40"),(9999,"UPI","Google Pay","HDFC Bank","2026-10-16 21:44")],
  {"phone":True,"vpa":"refund.zepto@ybl"},"40 minutes","shared screen via a remote app; agent must tell him to uninstall it and change UPI PIN"),
 ("V02","phone theft then UPI drain","yt_205d5186dd8e","Hinglish (Punjabi accent)","Gurpreet, 34, Ludhiana, shop owner","short sentences, angry",
  [(23000,"UPI","PhonePe","Punjab National Bank","2026-10-15 19:10")],{"phone":False,"vpa":None},"2 days","doesn't know the UTR; agent must guide him to find it in the bank SMS or statement"),
 ("V03","task / part-time job scam","rd_86924f67aa7f","English","Sneha, 23, Pune, fresher","calm but ashamed",
  [(2000,"UPI","Paytm","Kotak Mahindra Bank","2026-10-10 11:00"),(8000,"UPI","Paytm","Kotak Mahindra Bank","2026-10-11 15:20"),(17750,"UPI","Paytm","Kotak Mahindra Bank","2026-10-12 18:05")],
  {"phone":True,"vpa":"taskpay.earn@okaxis"},"5 days","three debits over three days; agent must log each separately"),
 ("V04","self-transfer confusion","gp_9489854f8e10","Hindi (rural UP)","Ramesh, 52, Gorakhpur, farmer","slow, worried, says 'frod'",
  [(4200,"UPI","PhonePe","State Bank of India","2026-10-16 08:30")],{"phone":False,"vpa":None},"1 day","may not be fraud at all (failed self-transfer); agent must route to the UPI dispute path, not 1930"),
 ("V05","fake shopping customer care","rd_58f8c6b57cb7","Hinglish","Anjali, 31, Bengaluru, calling for her mother","organised, has screenshots",
  [(49728,"UPI","Google Pay","ICICI Bank","2026-10-16 14:02"),(40000,"IMPS","iMobile","ICICI Bank","2026-10-16 14:15")],{"phone":True,"vpa":"myntra.helpdesk@paytm"},"3 hours","caller is not the account holder; agent must capture both names and the mother's consent"),
 ("V06","UTR in wrong field","yt_2ff379f9691d","Hinglish","Vikas, 29, Jaipur, delivery rider","confused about numbers",
  [(12500,"UPI","PhonePe","Bank of Baroda","2026-10-14 20:00")],{"phone":True,"vpa":None},"3 days","reads out the 'reference number' as UTR; agent must check 12 digits and ask which label it had"),
 ("V07","late report","yt_e528fdd626c2","Hindi","Sunita, 45, Indore, homemaker","hesitant, keeps apologising",
  [(31000,"UPI","Google Pay","Union Bank of India","2026-09-22 13:30")],{"phone":True,"vpa":"kyc.update@ibl"},"25 days","past RBI 3 and 7 day windows; agent must still file and be honest about lower recovery odds"),
 ("V08","scammer still on line","yt_9cd8b15ee314","Hinglish","Imran, 38, Hyderabad, auto driver","panicked, talking to someone else in background",
  [(27750,"UPI","PhonePe","Canara Bank","2026-10-17 10:05")],{"phone":True,"vpa":"sbi.reward@axl"},"10 minutes","second call with scammer is active; agent must first tell him to hang up and not share OTP"),
 ("V09","partial hold already","yt_665b0a00d3a1","Hinglish","Deepak, 41, Lucknow, clerk","informed, wants status",
  [(53800,"UPI","Paytm","Indian Bank","2026-10-01 16:45")],{"phone":True,"vpa":None},"16 days (already has NCRP number)","already filed; has acknowledgement 31610260012345 (fake); agent should do status follow-up, not a new filing"),
 ("V10","elderly pension OTP scam","rd_04d77e487d5d","Hindi","Kamla Devi, 71, Patna, retired teacher","hard of hearing, needs repetition",
  [(11500,"Card","Debit card","State Bank of India","2026-10-16 17:20")],{"phone":True,"vpa":None},"1 day","agent must slow down, repeat, confirm digits twice, and offer a callback to her son"),
 ("V11","1930 never picked up","yt_a7b15a4cbaeb","Hindi","Manoj, 36, Agra, mechanic","frustrated with 1930",
  [(15000,"UPI","Google Pay","Punjab National Bank","2026-10-16 12:00")],{"phone":True,"vpa":"electricity.bill@ybl"},"1 day","electricity-bill SMS link; he tried 1930 four times; agent must reassure and produce the online complaint draft"),
 ("V12","investment app scam","rd_1d47e2417655","English","Arjun, 33, Gurugram, calling for his father","detailed, angry",
  [(200000,"NEFT","Net banking","Axis Bank","2026-10-02 10:00"),(350000,"NEFT","Net banking","Axis Bank","2026-10-09 10:00")],{"phone":False,"vpa":None,"account":"fake beneficiary a/c 99990012345678, IFSC XXXX0000001"},"15 days","large amounts, beneficiary account instead of VPA; agent must take account and IFSC"),
 ("V13","courier / call-forwarding code","rd_d4eedf7aa66d","Hinglish","Priya, 26, Mumbai, designer","quick, tech-aware",
  [(6400,"UPI","PhonePe","Yes Bank","2026-10-17 09:15")],{"phone":True,"vpa":None},"1 hour","dialled a *401* forwarding code; agent must tell her to cancel forwarding (##002#) and call the operator"),
 ("V14","Kannada speaker","yt_c75b8e514b85","Kannada + English words","Manjunath, 48, Mysuru, bus conductor","speaks Kannada, understands some Hindi",
  [(9000,"UPI","Google Pay","Canara Bank","2026-10-16 18:40")],{"phone":True,"vpa":None},"1 day","agent must switch to Kannada or simple English"),
 ("V15","gift-card CEO email","rd_4da7b2a2d4be","English","Neha, 28, Noida, HR executive","composed, office setting",
  [(89400,"Card","Credit card","HDFC Bank","2026-10-15 15:00")],{"phone":False,"vpa":None,"email":"ceo.office@fake-mail.example"},"2 days","no UPI at all; gift cards bought by card; agent must still capture card transaction ref and merchant"),
 ("V16","fake RTO challan APK","rd_69fa6d812f71","Hinglish","Suresh, 55, Bengaluru, small contractor","shocked, many debits he didn't make",
  [(95000,"IMPS","Net banking","Bank of India","2026-10-16 23:10"),(95000,"IMPS","Net banking","Bank of India","2026-10-16 23:12"),(60000,"IMPS","Net banking","Bank of India","2026-10-16 23:20")],{"phone":False,"vpa":None},"9 hours","unauthorised debits after malware: this one qualifies for RBI 3-day zero liability; agent must stress telling the bank in writing today"),
 ("V17","prank / not a fraud","synthetic","Hinglish","Unknown young caller","joking",
  [],{"phone":False,"vpa":None},"n/a","agent must stay polite, not file, and end the call"),
 ("V18","angry, wants guarantee","rd_ae398569efd8","Hinglish","Karthik, 30, Hyderabad, salesman","demands 'paisa wapas guarantee'",
  [(50000,"UPI","PhonePe","IDFC First Bank","2026-10-16 13:00")],{"phone":True,"vpa":"loan.approve@okhdfc"},"1 day","agent must not promise recovery; explains what improves the odds"),
 ("V19","sextortion payment","synthetic (pattern from r/india threads)","Hinglish","Anonymous male, 22, student","very embarrassed, whispering",
  [(7000,"UPI","Paytm","State Bank of India","2026-10-17 01:30")],{"phone":True,"vpa":None},"8 hours","sensitive; agent must be non-judgemental, advise not to pay more, and keep minimal details"),
 ("V20","poor Bihar caller, follow-up","yt_33393588679a","Hindi (Bhojpuri tone)","Rinki, 33, Gaya, domestic worker","pleading, low digital literacy",
  [(14000,"UPI","PhonePe","Bank of India","2026-09-27 19:00")],{"phone":True,"vpa":None},"20 days (called 1930, no number noted)","doesn't have the acknowledgement number; agent must file fresh online and explain the bank letter"),
]

out = []
for cid, typ, insp, lang, persona, style, debits, suspect, after, comp in C:
    tx = [{"amount_inr": a, "mode": m, "app": app, "bank": b, "datetime": t, "utr_or_ref": utr()} for a, m, app, b, t in debits]
    sus = {k: v for k, v in suspect.items() if k not in ("phone",) and v}
    if suspect.get("phone"): sus["phone"] = phone()
    out.append({
        "id": cid, "fraud_type": typ, "inspired_by": insp, "language": lang, "persona": persona, "speaking_style": style,
        "reported_after": after, "transactions": tx, "suspect": sus,
        "total_lost_inr": sum(t["amount_inr"] for t in tx), "complication": comp,
        "expected_agent": {
            "file_1930": typ not in ("self-transfer confusion", "prank / not a fraud") and "already filed" not in after.lower() and "NCRP number" not in after,
            "must_capture": ["complainant name", "mobile", "fraud type", "date/time", "per-debit amount + UTR + app + bank", "suspect identifiers if any", "consent"],
            "must_not": ["ask for OTP/PIN/CVV", "promise a refund"],
        },
    })
json.dump(out, open("callers.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(out), "callers;", sum(len(o["transactions"]) for o in out), "debits")
