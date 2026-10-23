# Product

## Register

product

## Users
- **Students:** Senior High School learners (Grade 11–12, ages ~16–18) in the Philippines. They study Earth & Life Science and Disaster Readiness (DRRR), and Earthquakes is the first course; more science courses will follow. Most use budget Android phones or old school laptops on slow connections, often in short sessions between classes. They want to clear lessons and games, see their progress and know what to do next.
- **Teachers:** build course content (modules, sessions, lessons, quizzes, games, meetings), manage classes, track students and post announcements. They want fast, clear authoring that doesn't get in the way.
- **Admins:** manage users, roles, courses and analytics. They want calm, data-dense control.

## Product Purpose
Dulatuon is a gamified science LMS. Every course is a topic turned into explorable 3D low-poly labs, short lessons and checkpoints, wrapped in a learning path with visible progress. The first course is Earthquakes; more science courses (for example weather, oceans, space, life science) follow. In user-facing copy, always say "course". Success means students want to come back and actually understand the concepts, teachers can build a gamified course without design skills, and the platform can grow to new topics beyond Earthquakes.

## Brand Personality
Professional, playful, grounded. It should feel like a premium learning tool for young adults: clean and simple first, with gamified moments (progress, checkpoints, rewards, celebrations) that feel earned rather than noisy. The visual world is a tactile 3D / low-poly diorama: sky, grass, sand and layered earth, as in the course's own three.js simulations.

## Anti-references
- Generic admin templates (plain Bootstrap or stock shadcn dashboards). This is what the previous church-LMS version looked like.
- Childish or babyish UI: mascots everywhere, rainbow colours, comic fonts. Senior High students must feel respected.
- Neon esports or casino energy: glow overload, loot-box style rewards.
- Dense corporate LMS screens (Moodle, Canvas, Blackboard): walls of links and tables.

## Design Principles
1. **The 3D world is the hero.** The simulations set the visual language. App chrome supports and frames them and never competes with them.
2. **Clean first, gamified second.** Every screen must work as a clear, professional tool. Game elements add meaning (progress, mastery, next step) and never decorate.
3. **Show the path.** Students always see where they are, what's next and what they've earned.
4. **Earned delight.** Celebrations happen at real milestones (checkpoint cleared, quiz passed, course completed) and are quick and skippable.
5. **Light on the device.** Low-end phones come first. Real 3D appears only where it teaches or wows, and everything else is CSS/SVG.

## Accessibility & Inclusion
- Mobile-first: works from 360px wide, with touch targets of at least 44px and thumb-reachable primary actions.
- Built for low-end devices and slow networks: lazy-load heavy parts (three.js, editors), keep JS small, use skeleton states, and no auto-playing heavy media.
- WCAG 2.1 AA contrast, visible focus states and keyboard reachability.
- Respect `prefers-reduced-motion`. Never rely on colour alone (pair it with icons or labels, for example intensity levels).
