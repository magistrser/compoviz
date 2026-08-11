## 1. Comparison Module Seam

- [x] 1.1 Add failing public-hook tests for name precedence, ordered one-to-three admissions, and typed invalid-input rejection
- [x] 1.2 Add `src/features/project-comparison/` public types, provider/hook, simple parser, and immutable snapshot transition
- [x] 1.3 Add failing tests proving a fourth admission is rejected before parsing with complete snapshot equality

## 2. Synchronized Findings and Summary

- [x] 2.1 Move `compareProjects` integration, severity counts, and summary prose behind the module interface
- [x] 2.2 Add public-hook tests that findings, counts, and summary remain synchronized after admission, removal, and clear
- [x] 2.3 Retain focused `compareProjects` utility tests without exposing comparison reducers or identity helpers

## 3. View Migration and Cleanup

- [x] 3.1 Migrate CompareView file selection/drop admission, project cards, conflicts, counts, summary, removal, and clear to `useProjectComparison`
- [x] 3.2 Remove unused active-project, update-project, and compare-mode APIs by deleting `useMultiProject`
- [x] 3.3 Add comparison view regression tests for capacity and parsing rejection messages without collection mutation

## 4. Validation

- [x] 4.1 Run focused project-comparison hook, view, comparison utility, and multi-project DOT tests
- [x] 4.2 Validate `deepen-project-comparison` strictly, run `yarn check` and `yarn build`, and smoke-test comparison admission/removal in the browser
