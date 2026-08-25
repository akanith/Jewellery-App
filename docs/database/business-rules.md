# Scheme Lifecycle & Business State Transitions

This document defines the lifecycle states, valid transitions, authorization rules, and database trigger enforcements for Ramyas Jeweller savings schemes.

---

## 1. Scheme Enrollment Status (`customer_schemes.status`)

### Allowed Status Values
* `ACTIVE`: Scheme is open, currently collecting monthly installments.
* `COMPLETED`: All required installments have been paid in full; awaiting maturity redemption.
* `REDEEMED`: Final maturity benefit has been claimed towards jewellery purchase; scheme closed.
* `CLOSED_EARLY`: Scheme terminated prior to full term completion.
* `DEFAULTED`: Scheme defaulted due to non-payment past maximum grace period.

### Valid State Transitions

```
[ ACTIVE ] ───(All Installments Paid)───► [ COMPLETED ] ───(Redemption Approved)───► [ REDEEMED ]
    │                                          │
    ├───(Customer Request / Pre-maturity)──────┼─────────────────────────────────► [ CLOSED_EARLY ]
    │                                          │
    └───(Extended Non-Payment)─────────────────┴─────────────────────────────────► [ DEFAULTED ]
```

---

## 2. Installment Payment Status (`installments.status`)

### Allowed Status Values
* `PENDING`: Scheduled monthly installment, payment not yet received.
* `PAID`: Payment received and recorded in ledger.
* `OVERDUE`: Due date passed plus grace period, installment unpaid.

### Valid State Transitions

```
[ PENDING ] ───(Due Date + Grace Period Passed)───► [ OVERDUE ]
     │                                                     │
     └───(Payment Recorded)────────────────────────────────┴───► [ PAID ]
```
