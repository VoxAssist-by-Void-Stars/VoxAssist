# Seed data — fabricated demo users

Fully **made-up** users for the VoxAssist demo. Each folder = one user (its name is the `username`).
Every file carries frontmatter with `owner` (= username), which the seed script uses to tag chunks
so friend-queries can scope to a single person.

| Username | Persona | Stack (headline) |
|----------|---------|------------------|
| `alex`   | Full-stack web dev | TypeScript / React / Next.js / Node |
| `priya`  | ML / data engineer | Python / PyTorch / SQL / Airflow |
| `marcus` | Embedded / systems dev | C / Rust / STM32 / MQTT |

They're intentionally **distinct** so demo queries contrast clearly — e.g. *"what's marcus's stack
and how does he like to work?"* vs. *"what's priya's?"*.

**Not real people. Not real projects.** Safe to commit.
