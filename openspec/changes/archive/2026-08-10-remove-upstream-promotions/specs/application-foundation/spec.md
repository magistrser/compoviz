## ADDED Requirements

### Requirement: Present the canonical Compoviz project identity

The application and maintained project materials SHALL identify `https://github.com/magistrser/compoviz` as the canonical Compoviz repository. First-party repository links, issue links, badges, raw-content URLs, and owner-qualified deployment references SHALL NOT point to `adavesik/compoviz`.

#### Scenario: Follow a repository action from the application

- **WHEN** a user follows a Compoviz repository, star, or issue action rendered by the application
- **THEN** the action targets the corresponding resource under `magistrser/compoviz`

#### Scenario: Use maintained project instructions

- **WHEN** a maintainer inspects clone, download, release, contribution, or container deployment references in maintained project files
- **THEN** owner-qualified Compoviz resources use the `magistrser/compoviz` project identity and contain no `adavesik/compoviz` reference

### Requirement: Keep the application free of donation and advertising surfaces

The application SHALL NOT render donation controls or advertisements and SHALL NOT load or initialize third-party donation or advertising integrations. Removing monetization surfaces SHALL NOT remove functional external resources that support documented Compoviz behavior.

#### Scenario: Start the application

- **WHEN** a user loads the Compoviz application
- **THEN** no donation or advertising control is displayed and no Ko-fi or advertising-provider script is requested or initialized

#### Scenario: Use external example sources after the cleanup

- **WHEN** a user browses or opens an example backed by Docker's `awesome-compose` repository
- **THEN** the existing catalog, Compose content, and source links remain available
