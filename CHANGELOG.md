# Changelog

## [0.2.0](https://github.com/Genesara/genesara-world-editor/compare/v0.1.0...v0.2.0) (2026-04-27)


### ⚠ BREAKING CHANGES

* localStorage keys changed prefix. Existing browsers with stored tokens or backend URLs will see the first-launch screen and need to re-authenticate. No automatic migration since the project has no production users yet.

### Features

* **api:** user-configurable backend URL with first-launch setup ([4f69937](https://github.com/Genesara/genesara-world-editor/commit/4f69937f8a77769a06032828d689bffad25a868d))


### Bug Fixes

* **deps:** pin vitest to 3.x to avoid vite 8 conflict ([9e6414d](https://github.com/Genesara/genesara-world-editor/commit/9e6414d96c36068d8b635019f2f48cf9b32e34b5))


### Refactors

* rename project from AgenticRPG to Genesara ([f9ba8cb](https://github.com/Genesara/genesara-world-editor/commit/f9ba8cb8431926c463a17960c17d13d8429478a5))


### Documentation

* rewrite README for current architecture and deployment ([c03179d](https://github.com/Genesara/genesara-world-editor/commit/c03179dcb3608452f458ac0306d7fe2ad6580c0b))
