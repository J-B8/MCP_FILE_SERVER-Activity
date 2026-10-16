## Remaining Work and Final Submission Plan

1. **Finalize documentation.** Review and reconcile `README.md`, `CHECKPOINTS.md`, `PLAN_LOG.md`, `PROJECT_STATE.md`, `DECISIONS.md`, and `projects/demo/PROJECT_STATE.md`. Preserve the latest remote updates, historical records, and evidence distinctions.
2. **Validate Markdown files.** Check for unresolved conflict markers, inconsistent test results, inaccurate verification claims, and formatting issues. Run `git diff --check`.
3. **Test `git_commit` through the Claude connector.** Use a disposable file and an explicitly selected path. Verify whether the tool creates the expected commit, confirm the resulting repository state, and record the actual outcome. Do not claim success until the test passes.
4. **Update handoff records.** Record the connector test and any resulting changes in `CHECKPOINTS.md`, append the activity to `PLAN_LOG.md`, and update `PROJECT_STATE.md`. Preserve existing historical records and append new decisions to `DECISIONS.md` only when needed.
5. **Review untracked files.** Inspect `init.json` and `initialize-request.json` and decide whether they belong in the submission. Do not delete them without approval.
6. **Complete Git integration.** Finish the rebase of the local documentation commit onto the latest `origin/master` history. Inspect the final diff and commit history before proceeding.
7. **Push the final documentation.** Run `git push origin master` after the rebase succeeds, then verify the remote update and the final local repository status.
8. **Prepare the demonstration.** Use the already verified tools and safeguards, distinguish Inspector results from Claude connector results, and avoid demonstrating unverified behavior as if it had passed.
9. **Confirm submission readiness.** Ensure the repository contains the final documentation, the test evidence is accurate, and no unintended files or unresolved Git operations remain.

These items describe planned work. Update this section as each item is completed, and retain explicit verification labels for anything that remains unverified.