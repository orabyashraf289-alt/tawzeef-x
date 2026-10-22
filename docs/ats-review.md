# Recruiter ATS review

The candidate profile and the candidate-list drawer use the same report. Opening
or filtering the list, and creating a candidate manually, do not start Gemini
analysis. Recruiters can request one evaluation or use the screening button for
up to ten candidates without an existing score. Screening from the selection
toolbar includes only selected candidates. Explicitly configured pipeline
automations retain their existing behavior.

The `evaluate-candidate` function requires an authenticated user with access to
the candidate's company. It validates the linked job and uses the existing
application match (company, job, email, private resume path) to load the optional
consented CV excerpt. No new consent or candidate data is collected by this change.

## Evidence checks

Gemini proposes a score, summary, questions, and evidence rows. Before saving a
report, the server rebuilds the rows in published requirement order. Each
`supported` row needs a quotation found in one of the professional profile
fields sent to Gemini, or in the consent-checked excerpt. Letter case, Unicode
compatibility and whitespace are normalized; fragments of unrelated words do
not match. The source is derived by the server, not trusted from the model.

Unknown requirements are discarded. Missing rows, duplicate/conflicting rows,
and quotations absent from the supplied candidate text become `unconfirmed`
without a quote. The report covers at most the first 25 published requirements;
it records the full requirement count and displays an explicit notice when
manual review is needed for the remainder. No published requirements means no
evidence rows.

Finding a quotation proves only that the text is present. It does not verify its
truth, interpretation, or whether the qualification is satisfied. Scores and
recommendations remain advisory; this function does not change the candidate's
stage or hiring status.

## Stored reports and rollout

Reports remain in `candidates.ai_evaluation`, with server-owned `evidenceVersion`,
`evaluatedAt`, `requestedBy`, `requirementsTotal`, and `cvAnalyzed` metadata. No
schema migration is needed. Legacy reports remain readable with a prompt to
re-evaluate because their quotations were not checked. Missing legacy CV
metadata is displayed as unknown rather than implying applicant consent.

The UI validates stored and returned report shapes, refreshes the candidate
profile and list after successful evaluation, and discards a pending response
when the recruiter switches to a different candidate or job.

Deploy `evaluate-candidate` with its `policy.ts`, `evidence.ts`, shared
`candidateEvaluation.ts`, and existing `cors.ts`; preserve JWT verification.
Deploying this backend before the UI is compatible with the previous report
shape. Do not trigger evaluations against real candidate data as a smoke test;
use synthetic fixtures and the mocked regression suite.
