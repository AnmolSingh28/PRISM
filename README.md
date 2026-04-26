PRISM — Pull Request Intelligence & Selection Mechanism

Ensuring domain experts review critical pull requests first, so important changes don't wait longer than they should.

<img width="806" height="453" alt="image" src="https://github.com/user-attachments/assets/6cb1382c-c5be-4e94-8bfb-42582f077955" />

[Watch Demo on Vimeo]
(https://vimeo.com/1186726507)

Tech Stack-

1. TypeScript, Node.js
2. Atlassian Forge
3. Bitbucket API
4. Groq (LLaMA 3.1)
5. React (Forge UI)


The Problem-
Pull requests often wait too long — not because teams lack skills, but because the right reviewers aren't identified early. Domain-specific changes like security or backend logic sit in queues while general PRs move faster. PRISM fixes this by ensuring domain experts review critical PRs first.
What PRISM Does

1. Classifies PRs into domains (backend, frontend, security, database, DevOps, etc.)
2. Detects risky changes (e.g., authentication or security-related code)
3. Ranks reviewers by matching PR domain with team expertise
4. Applies workload and availability penalties to avoid overloading reviewers
5. Tracks historical ranking and review data for transparency
6. Sends manual notifications and reminders — no spam, full team control

PRISM doesn't force actions. It provides structured intelligence to support better review decisions.

How It's Built-

1. Static analysis of PR metadata (files changed, paths, extensions, titles, descriptions)
2. Domain classification using heuristic rules and pattern detection
3. Ranking engine that prioritizes domain experts, then full-stack developers
4. AI layer using Groq (LLaMA 3.1) as a reasoning assistant — not a decision maker
5. Historical storage to track reviewer rankings, PR risk levels, and review outcomes
6. Manual notification controls to prevent unnecessary noise

Key Challenges-

1. Designing heuristic-based classification that works consistently across different PRs
2. Keeping AI-assisted ranking deterministic and explainable
3. Balancing workload penalties without pushing experts too far down the ranking
4. Calculating meaningful metrics like workload distribution and review velocity

Hackathon-
Built for Codegeist 2025 (Atlassian Global Hackathon)
