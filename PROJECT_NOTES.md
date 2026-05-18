# Project Notes

## User Profile Names

- `User.name` is optional so existing account creation flows can continue using phone/email only.
- Doctor creation currently requires `name`, `phone`, and `email`, and stores the doctor's name on `User`.
- When richer profile work is needed, revisit whether doctor-specific details should move to a `DoctorProfile` model.
