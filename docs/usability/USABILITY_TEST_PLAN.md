# NFR-03: Usability (onboarding) test plan (#21)

**Requirement (SRS 3.2 NFR-03):** a first-time user shall be able to register, create a task, and assign it within 3 minutes without external assistance, verified via a usability test with at least 5 participants achieving an 80% task-completion rate.

## Pass criteria

| Measure | Target |
|---|---|
| Participants | at least 5 first-time users (never used the app, not on the project team) |
| Task | register, create a task, assign it to another project member |
| Time limit | 3 minutes per participant, from the first screen to the assignment being visible |
| Assistance | none. A participant who is told what to click or asks the facilitator for help has not completed the task |
| Completion rate | at least 80% (with 5 participants, at least 4 must complete) |

## Setup

1. Start the app against a fresh database: `npm run migrate && npm start`.
2. Pre-create one user (`teammate@example.com`) and one project that includes them, so the participant has someone to assign to. Give the participant the project name and the teammate's name on a card.
3. Use the web client in `web/`, in a normal browser window, with a screen recording or a stopwatch.
4. Run each session with a fresh participant account (the participant registers during the test).

## Script for the facilitator

Read this aloud and nothing more:

> You are going to use a task manager for the first time. Please create an account, add a task called "Review report" to the project "Website", and assign it to Taylor. Think aloud if you like. I can't help, but I'll tell you when the three minutes are up. Start when you're ready.

Start the timer when the participant first touches the page. Stop it when the task shows Taylor as an assignee, or at 3:00.

## Recording

Record one row per participant in `results.csv` (template in this folder):

| Column | Meaning |
|---|---|
| participant | P1, P2, ... |
| registered | yes/no |
| task_created | yes/no |
| task_assigned | yes/no |
| seconds | time to finish, or 180 if the limit was reached |
| help_needed | yes/no (any help counts as a failed run) |
| notes | where the participant hesitated, misread or got stuck |

A participant **completes** the task only if registered, task_created and task_assigned are all `yes`, `seconds` is 180 or less, and `help_needed` is `no`.

## Scoring

```bash
node docs/usability/score.js docs/usability/results.csv
```

The script prints each participant's result, the completion rate, the median time, and PASS or FAIL against the 80% target (and a failure if there are fewer than 5 participants).

## After the sessions

- If the result is FAIL, list the steps where participants hesitated (from `notes`), fix the top issues, and rerun with new participants. Don't reuse participants, because they are no longer first-time users.
- Keep the filled-in `results.csv` with the project documents as the verification evidence for NFR-03.
