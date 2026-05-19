# Security Specification for Time & Money Assistant

## Data Invariants
1. A habit log cannot be created for a habit that does not belong to the user.
2. Transactions must have a positive amount.
3. Users can only read and write their own data.
4. Level and Exp should only be incremented by the system (but since we are client-side for now, we'll allow updates with validation).
5. Timestamps must be server-validated.

## The "Dirty Dozen" Payloads (Deny Cases)
1. Creating a transaction with `userId` of another user.
2. Updating `amount` of a transaction to a negative value.
3. Reading a `user_profile` of another user.
4. Listing `habits` without filtering by `userId == auth.uid`.
5. Creating a `habit_log` with a future date.
6. Updating a `goal` to set `currentAmount` higher than `targetAmount` without administrative permission (optional, but good practice).
7. Injecting a massive string into a habit `name`.
8. Updating `createdAt` field on any document.
9. Deleting a `habit` that belongs to another user.
10. Creating a `user_profile` where `isAdmin` is true (if admin exists).
11. Updating `exp` by a huge amount (difficult to prevent without server logic, but we can limit size).
12. Creating a task with an invalid ID format.

## Firestore Rules Drafting
I will now draft the `firestore.rules`.
