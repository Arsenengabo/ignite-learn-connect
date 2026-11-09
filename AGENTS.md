## Study lectures
- Reuse StudyHub's lecture-only view for the Live Lectures navigation entry and keep the same lecture workflow in Study, so both entry points share saving and review behavior.

## Account approvals
- Store platform approvers separately from profiles; expose approval operations through invoker wrappers backed by private, caller-authorized functions to prevent self-approval and privilege escalation.
## Chat
- Keep room, posting and moderation rules in the database: caller-authorised functions in the `chat_private` schema behind invoker wrappers in `public`, plus the insert guard triggers on `chat_messages` and `dm_messages`. The app never updates or deletes chat rows directly.
- Private messages are only allowed between approved members of the same school (or an approved mentor link), and never when either person has blocked the other.
- Removing a message blanks it for everyone; the original text goes to `chat_moderation_log`, which the app cannot read.
