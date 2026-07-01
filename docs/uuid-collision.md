# UUID Collision Risk

## Generated IDs
All primary keys use UUID v4 (random) via Prisma's `@default(uuid())`.

## Collision Probability
- UUID v4 has 122 random bits → 5.3×10³⁶ possible values
- Probability of collision after 1 billion records: ≈ 1 in 10¹⁸
- For context: you'd need to create 1 billion records per second for 100 years to reach a 50% collision probability

## Mitigation
- UUID collisions are not practically possible at any scale this system will reach
- All `@unique` constraints and `@@unique` compound indexes provide defense-in-depth
- Prisma throws a unique constraint violation error if a collision somehow occurs
- The `idempotencyKey` field on `WebhookEvent` uses SHA-256 hashing for additional uniqueness

## Conclusion
No action needed. The risk is astronomically low and Prisma handles the edge case via constraint violation errors.
