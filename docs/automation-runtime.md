# Internal workflow automation

Owners can save structured drafts and explicitly activate or pause them. Activation validates every action and condition on the server. Editing the event, actions, or conditions pauses a live rule for another review. Existing drafts are not activated by the migration, and installing the runtime aborts if a previously active rule requires review.

| Event | Supported actions |
| --- | --- |
| Candidate stage changes | Move stage; assign reviewer |
| Application is created | Move stage; assign reviewer |

Email, WhatsApp, outbound webhooks, offers, and SLA events are not implemented by this runtime. Their historical drafts remain readable but cannot be activated. Free-text descriptions are never interpreted as executable configuration.

## Execution

Database triggers process new events without a browser being open. Application processing runs after the existing candidate creation/deduplication trigger. If the application cannot be linked to exactly one candidate in the same company, the rule records a failure instead of choosing a candidate arbitrarily.

Moving a stage from the candidate profile updates one candidate by ID and company, then reads its stored stage separately. This prevents a second client update from repeating the event or overwriting an automation move. The profile and pipeline refresh their displayed state after the change. Application status synchronization remains within the candidate's company and uses an exact email match.

Rules run in creation order, then ID order. Conditions use the candidate snapshot at the start of the event. Each rule's actions form one transaction block: a failure rolls back that rule's actions, records a stable failure code, and permits other rules to continue. Replaying the same event ID does not repeat a completed attempt. Failures are visible in the log and are not retried automatically; a subsequent business event is a new attempt.

An automation stage move does not emit another automation event. Interview, evaluation, score, and assessment requirements are checked before a move. Assessment completion must be linked to the candidate ID. Unknown stage requirements fail closed. The activation RPC permits at most 25 active rules per company; a rule accepts up to 10 conditions and 10 actions.

Stage targets must be active and explicitly belong to the rule's company. Legacy stages without a company are not reassigned automatically. Newly added individual stages include the selected company. Reviewers must be current owners or HR members of that company. Reviewer assignments are separate from candidate ownership, appear on candidate profiles, and are removed when the candidate or membership is removed. Deleting a rule preserves its assignment with an empty source-rule link.

## Access and deployment

The client cannot update `is_active` directly, write execution logs, or write reviewer assignments. The public activation RPC checks company ownership; execution helpers live in an unexposed schema without client execution privileges. Composite foreign keys enforce company consistency for reviewer assignments.

Apply the new migration individually after source review and database replay checks. Publish the corresponding UI and generated table/function types together. Never replay the archived candidate repairs or use a global database push for this change.

The additive `align_application_candidate_profile_fields` migration captures the nullable text columns read by the existing application trigger: `license_number`, `license_expiry`, `university_degree`, and `demo_video_url` on applications and candidates. It creates missing columns without rewriting existing values or changing existing column definitions.

`supabase/tests/automation_runtime.sql` exercises activation boundaries, stage gates, transaction rollback, event deduplication, loop prevention, assignments, and real application-trigger integration, including copied profile fields, using disposable fixtures. `automation_rls.sql` retains the draft-storage and log-isolation checks. Frontend tests cover company switching, failed writes, activation review, and scoped stage creation.
