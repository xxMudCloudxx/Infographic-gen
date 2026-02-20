# Changelog

所有重要变更都记录在这个文件中。

这个项目遵循 [Semantic Versioning](https://semver.org/)。

## [Unreleased]

### Added

-

### Changed

-

### Fixed

-

### Deprecated

-

### Removed

-

### Security

-

---

## [1.0.0] - 2026-02-20

### Added

- Initial release of infographic-gen
- Natural language to AntV Infographic DSL generation using LLMs
- Support for 60+ professional infographic templates
- Self-correcting generation with error feedback (up to 3 retries)
- Multi-provider support: OpenAI, DeepSeek, Alibaba Cloud DashScope, etc.
- Persistent configuration management (apiKey, baseUrl, modelName, etc.)
- Global CLI installation support (`npm install -g`)
- Comprehensive test suite (131 tests covering all features)
- Automated upstream sync for @antv/infographic version changes and SKILL.md updates
- GitHub Actions workflows for:
  - Weekly upstream change detection and PR creation
  - Automated npm publishing on tagged releases
  - CI/CD with build and test validation

### Fixed

- CJS/ESM interoperability issues in bundled CLI
- Mock hoisting issues in test suite
- Integration test stderr capture for proper command validation

[Unreleased]: https://github.com/yourusername/infographic-gen/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/yourusername/infographic-gen/releases/tag/v1.0.0
