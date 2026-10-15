import { danger, warn, fail, message, markdown } from "danger"

const { git, github } = danger

// ---------------------------------------------------------------------------
// 1. Work In Progress (WIP) check
// ---------------------------------------------------------------------------
const isWIP =
  (github && github.pr.draft) ||
  (github && /wip/i.test(github.pr.title)) ||
  git.commits.some(c => /wip/i.test(c.message))

if (isWIP) {
  warn(":construction: This PR is marked as Work in Progress (WIP). Do not merge yet.")
}

// ---------------------------------------------------------------------------
// 2. PR Metadata Checks (GitHub-specific)
// ---------------------------------------------------------------------------
if (github) {
  // Description check
  if (!github.pr.body || github.pr.body.trim().length < 10) {
    warn("Please provide a meaningful description explaining what this PR changes and why.")
  }

  // Assignee / Reviewer check
  const hasAssignee = Boolean(github.pr.assignee)
  const hasReviewers =
    Boolean(github.requested_reviewers?.users?.length) ||
    Boolean(github.requested_reviewers?.teams?.length)

  if (!hasAssignee && !hasReviewers) {
    message("Don't forget to assign someone or request a reviewer for this PR.")
  }

  // Big PR warning (threshold: 500 lines changed, excluding lockfile)
  const changes = github.pr.additions + github.pr.deletions
  if (changes > 500) {
    warn(
      `:exclamation: Big PR! This PR has +${github.pr.additions} / -${github.pr.deletions} lines changed. ` +
        "Consider splitting large changes into smaller, more focused PRs."
    )
  }
}

// ---------------------------------------------------------------------------
// 3. Package & Lockfile Consistency (pnpm)
// ---------------------------------------------------------------------------
const packageChanged = git.modified_files.includes("package.json")
const lockfileChanged = git.modified_files.includes("pnpm-lock.yaml")

if (packageChanged && !lockfileChanged) {
  warn(
    ":warning: `package.json` was modified, but `pnpm-lock.yaml` was not updated. " +
      "Run `pnpm install` and commit the updated lockfile."
  )
}

// ---------------------------------------------------------------------------
// 4. Test Coverage Check
// ---------------------------------------------------------------------------
const appFilesChanged = [...git.modified_files, ...git.created_files].filter(
  file => file.endsWith(".js") && !file.includes("dangerfile") && !file.includes(".test.") && !file.includes(".spec.")
)
const testFilesChanged = [...git.modified_files, ...git.created_files].filter(
  file => file.includes(".test.") || file.includes(".spec.")
)

if (appFilesChanged.length > 0 && testFilesChanged.length === 0) {
  message(
    ":information_source: Application files were modified without accompanying test files. " +
      "Consider adding tests if new behavior was introduced."
  )
}

// ---------------------------------------------------------------------------
// 5. Summary Breakdown Table
// ---------------------------------------------------------------------------
const created = git.created_files.length ? git.created_files.map(f => `- :sparkles: \`${f}\``).join("\n") : "_None_"
const modified = git.modified_files.length ? git.modified_files.map(f => `- :pencil2: \`${f}\``).join("\n") : "_None_"
const deleted = git.deleted_files.length ? git.deleted_files.map(f => `- :wastebasket: \`${f}\``).join("\n") : "_None_"

markdown(`
### :mag: PR File Changes Summary

| Created Files | Modified Files | Deleted Files |
| --- | --- | --- |
| ${git.created_files.length} | ${git.modified_files.length} | ${git.deleted_files.length} |

<details>
<summary>Click to view file details</summary>

**Created:**
${created}

**Modified:**
${modified}

**Deleted:**
${deleted}

</details>
`)
