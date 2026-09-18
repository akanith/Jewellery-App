# Confirmed Business Rules - Ramyas Jeweller

This document outlines the core business domain rules for the **Ramyas Jeweller Savings Scheme Management System**.

---

## 1. Scheme Fundamentals

- **Monthly Installment Amount:** ₹1,000 per month.
- **Scheme Duration:** 12 months.
- **Total Customer Contribution:** ₹12,000 (after 12 completed installments).
- **Store Bonus Amount:** ₹1,000 (awarded ONLY after completing all 12 installments).
- **Final Maturity Value:** ₹13,000.
- **Bonus Eligibility:** The ₹1,000 bonus is NOT available before completion of all 12 installments.

---

## 2. Monthly Payment Rules

- **Installment Frequency:** Exactly one installment for each calendar month.
- **Payment Window:** Customer can pay on any date from the 1st day through the last day of that calendar month.
- **Due Dates:** There is no fixed daily due date within the month.
- **Advance Payments:** Customer cannot pay multiple future months together.
- **Missed Payments:** If a monthly installment is not paid, its status remains `PENDING`.
- **Lapse & Cancellation:** Missing a month does NOT automatically cancel or terminate the scheme.
- **Penalties / Late Fees:** No late fee or penalty is ever applied for a missed month.
- **Reminders:** The shop may contact the customer by phone or WhatsApp as a reminder.

---

## 3. Cancellation Policy

- **Normal Cancellation:** Normal cancellation is not allowed.
- **Emergency Situations:** In an emergency, the shop may manually return the customer's contributed amount.
- **Admin Control:** Emergency refunds are strictly controlled and recorded manually by the Administrator.

---

## 4. Transfer Policy

- **Standard Transfers:** The scheme cannot normally be transferred to another individual.
- **Family Member Usage:** Family members may use the completed scheme in an applicable family situation.
- **Admin Authorization:** Any family-member usage is manually handled and authorized by the Administrator.

---

## 5. Maturity & Redemption

- **Exclusive Merchant:** The ₹13,000 maturity amount can be used ONLY at Ramyas Jeweller.
- **Eligible Items:** Valid for gold and silver jewellery purchases.
- **Quantity:** Multiple jewellery items can be purchased with the maturity balance.
- **Redemption Flexibility:**
  - Partial redemption is allowed.
  - Full redemption is allowed.
- **Validity:** The maturity value has **lifetime validity**; customers are not required to redeem immediately upon completion.

---

## 6. Charges & Taxation

- **Purchase Charges:** Making charges, wastage, stone charges, and other applicable jewellery purchase charges may apply at the time of redemption/purchase.
- **GST Rule:** GST must NOT be represented as part of the scheme balance calculation.

---

## 7. Payments & Recording

- **Supported Payment Methods:**
  - Cash
  - UPI
  - Card
  - Bank Transfer
  - Other
- **Ledger Recording:** All normal scheme installment payments are manually recorded and verified by the Administrator.

---

## 8. Customer Profile & Access Model

- **KYC:** No KYC is required for normal scheme registration.
- **Authentication:** Customer login uses the registered mobile number only.
- **Credentials:** No customer password and no customer email login.
- **OTP:** No OTP unless explicitly introduced later.
- **Access Level:** The Customer App is primarily a read-only passbook for viewing scheme status, installment history, and maturity balance.

---

## 9. Administration & Governance

- **Admin Scope:** Administrators have complete control over customer, payment, scheme, and redemption records.
- **Expected Operators:** The current expected administrators are the Store Owner and the Owner's Son.
- **Accountability:** All financial and operational actions must eventually be attributable to the specific administrator who performed them.
