# Entity Relationship & Cardinality Model

```
 ┌────────────────┐         1:1         ┌────────────────┐
 │   auth.users   ├────────────────────►│    profiles    │
 └────────────────┘                     └───────┬────────┘
                                                │ 1:0..1
                                                ▼
                                        ┌────────────────┐
                                        │   customers    │
                                        └───────┬────────┘
                                                │ 1:N
 ┌────────────────┐                             │
 │  scheme_plans  │                             │
 └───────┬────────┘                             │
         │ 1:N                                  │
         └──────────────────┬───────────────────┘
                            ▼
                  ┌──────────────────┐
                  │ customer_schemes │
                  └─────────┬────────┘
                            │
            ┌───────────────┼───────────────┐
        1:N │           1:N │           1:1 │
            ▼               ▼               ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │ installments │ │   payments   │ │ redemptions  │
    └──────────────┘ └──────────────┘ └──────────────┘
```

---

## Entity Cardinality Summary

1. `auth.users` ──(1 : 1)── `profiles`: Every authentication user has exactly one application profile.
2. `profiles` ──(1 : 0..1)── `customers`: A profile with role `CUSTOMER` links to one customer record.
3. `customers` ──(1 : N)── `customer_schemes`: A customer can enroll in multiple savings schemes over time.
4. `scheme_plans` ──(1 : N)── `customer_schemes`: A scheme plan template can be used for many customer enrollments.
5. `customer_schemes` ──(1 : N)── `installments`: A scheme enrollment generates 11 or 12 scheduled monthly installments.
6. `customer_schemes` ──(1 : N)── `payments`: Each payment transaction records funds collected for a scheme enrollment.
7. `customer_schemes` ──(1 : 1)── `redemptions`: A scheme enrollment has at most one final maturity redemption record.
