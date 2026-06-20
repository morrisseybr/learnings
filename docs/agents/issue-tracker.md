# Issue tracker: GitHub

Issues and PRDs for this repo live as GitHub issues. Use the `gh` CLI for all operations.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --comments`, filtering comments by `jq` and also fetching labels.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

Infer the repo from `git remote -v` — `gh` does this automatically when run inside a clone.

## Pull requests as a triage surface

**No.** External pull requests are **not** pulled into the triage queue. `/triage` operates on GitHub Issues only; PRs are reviewed separately and not run through the triage labels/states.

## Parent/child relationships (sub-issues)

Issues that derive from a parent — most importantly **issues created from a PRD** (via `/to-issues`) — MUST be linked as native GitHub **sub-issues** of that parent, not just referenced textually in a "## Parent" section. The PRD issue is the parent; each generated slice is a sub-issue.

`gh` 2.93 has no native sub-issue command, so use the REST API. The endpoint expects the child's **REST database id** (the integer `id` field), not its issue number:

```sh
# 1. Resolve the child issue's REST database id
child_id=$(gh api "repos/{owner}/{repo}/issues/<child_number>" --jq '.id')

# 2. Attach it as a sub-issue of the parent (note: -F sends sub_issue_id as an integer)
gh api --method POST "repos/{owner}/{repo}/issues/<parent_number>/sub_issues" \
  -F sub_issue_id="$child_id"
```

Do this right after creating each child issue, once you know its number. Keep the textual "## Parent" reference too — the native link drives GitHub's hierarchy/UI; the text keeps the body self-describing.

To list a parent's sub-issues: `gh api "repos/{owner}/{repo}/issues/<parent_number>/sub_issues"`.

## When a skill says "publish to the issue tracker"

Create a GitHub issue. If the issue has a parent (e.g. a PRD it was sliced from), also create the native sub-issue link as described above.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.
