# Brie Contributing Guide

Before submitting your contribution, be sure to take a moment and read the following guidelines.

### Table of content

- [Becoming a Contributor](/docs/CONTRIBUTING.md#becoming-a-contributor)
- [Code of Conduct](/docs/CODE_OF_CONDUCT.md)
- [Standards and Best Practices](/docs/CONTRIBUTING.md#standards-and-best-practices)
- [Tooling](/docs/CONTRIBUTING.md#tooling)
- [Development Setup](/docs/CONTRIBUTING.md#development-setup)
- [Branch Creation](/docs/CONTRIBUTING.md#branch-creation)
- [Commit Convention](/docs/CONTRIBUTING.md#commit-convention)
- [Pull Request Guidelines](#/docs/CONTRIBUTING.md#pull-request-guidelines)

## Becoming a Contributor

If you are interested to contribute to Brie project, start by
reviewing pull requests. Suggest us your favorite best practices and standards that can improve our project. Your can join our small team by requesting to join the contributors team in the
[Discord Chat](https://go.brie.io/discord?utm_source=github) or we will reach out and ask you if you want to join or you can ask one of the current maintainers to add you.

Being a contributor is not an obligation. You can help when you have time and be
less active when you don't, being busy with your projects tasks.

## Standards and Best Practices

In order to maintain the Brie structure and guarantee code quality please use the following standards and best practices that would lead to lower code complexity and more elegant design.

- [Architecture](/docs/best-practices/ARCHITECTURE.md)
- [Naming Convention](/docs/best-practices/NAMING-CONVENTION.md)

## Tooling

- [pnpm](https://pnpm.io/) to manage packages and dependencies;
- [TypeScript](https://www.typescriptlang.org/) for type safety;
- [ESLint](https://eslint.org/) to find and fix problems in the code;
- [Prettier](https://prettier.io/) to format the code.

## Development Setup

0. (Win only) When you're using Windows run this:

   - `git config --global core.eol lf`
   - `git config --global core.autocrlf input`

   **This will set the EOL (End of line) character to be the same as on Linux/macOS. Without this, our bash script won't work, and you will have conflicts with developers on Linux/macOS.**

1. Clone or fork the repo on your local machine;
   - **[important]** make sure to uncheck “Copy the master branch only” option, so you get access to the `develop` branch.
   - next, clone forked repo, see [guide](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/fork-a-repo#cloning-your-forked-repository);
2. Ensure your node version is >= than in `.nvmrc` file, recommend to use [nvm](https://github.com/nvm-sh/nvm?tab=readme-ov-file#intro);
3. Install **pnpm** globally: `npm install -g pnpm` (ensure your node version >= 22.12.0);
4. Inside **brie-extension** folder run `pnpm i` command to install all dependencies;
5. Don't forget to create your env files, see [ENV](/packages/env/README.md);
6. To check if everything is working, run `pnpm run:chrome:local` command in terminal.

***[optional]** Also,
when you completed your task, feature or issue, bump up the extension version, see [UPDATE-PACKAGE-VERSIONS](/docs/UPDATE-PACKAGE-VERSIONS.md).*

Then, depending on the target browser:

### For Chrome (Chromium-based): <a name="getting-started-chrome"></a>

1. Run:
   - Dev: `pnpm run:chrome:local` (on Windows, you should run as administrator;
     see [issue#456](https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite/issues/456))
   - Prod: `pnpm run:chrome:production`
2. Open in browser - `chrome://extensions`
3. Check - <kbd>Developer mode</kbd>
4. Click - <kbd>Load unpacked</kbd> in the upper left corner
5. Select the `dist` directory from the boilerplate project

### For Firefox: <a name="getting-started-firefox"></a>

1. Run:
   - Dev: `pnpm run:chrome:local`
   - Prod: `pnpm run:chrome:production`
2. Open in browser - `about:debugging#/runtime/this-firefox`
3. Click - <kbd>Load Temporary Add-on...</kbd> in the upper right corner
4. Select the `./dist/manifest.json` file from the boilerplate project

> [!NOTE]
> 1. In Firefox, you load add-ons in temporary mode. That means they'll disappear after each browser close. You have to:
> load the add-on on every browser launch.
>
> 2. Remember that these commands must be executed in the root folder of the project.

### Multi Env Support

This setup supports scoped and environment-based builds via the following pattern:

```
pnpm <action>:<scope>:<env>
```

- **Actions**: `run` | `build`
- **Scopes**: `chrome` | `firefox`
- **Environments**: `local` | `production`

### Example Commands

```bash
pnpm run:chrome:local       # Dev Chrome with Local env
pnpm run:firefox:production # Dev Firefox with Production env
```

## Branch Creation

There are multiple ways how to create a branch to start the test scripts development, please follow the most preferred approach.

**Method 1:**
Create a branch for your feature or fix using the terminal:

```bash
# Create and switch into a new feature branch created from development branch
git checkout -b feature/<ID_OF_STORY>
```

```bash
# Create and switch into a new fix branch created from development branch
git checkout -b fix/<ID_OF_STORY>
```

**Method 2:**
Create a branch for your feature or fix using web interface: [click here](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-and-deleting-branches-within-your-repository)

### Commit Convention

Before you create a Pull Request, please check whether your commits comply with
the commit conventions used in this repository.

When you create a commit we kindly ask you to follow the convention
`<type>[(optional <scope>)]: <description>` in your commit message while using one of the following types:

- `feat / feature`: all changes that introduce completely new code or new features, such as adding new test cases;
- `fix / bugfix`: changes that fix a bug (ideally you will additionally reference an issue, if present);
- `refactor`: any code change of existing behavior in the product;
- `docs`: changing existing or creating new documentation (i.e. README, docs for usage of a util or method usage);
- `build`: all changes regarding the build of the software, changes to dependencies or the addition of new dependencies;
- `ci`: all changes regarding the configuration of continuous integration (i.e. azure actions, ci system);
- `chore`: all changes to the repository that do not fit into any of the above categories;

**Example:** `git commit -m 'feat(job-proposals): add test scripts to submit candidate to the active job flow'`

If you are interested in the detailed specification you can visit [Conventional Committing](https://www.conventionalcommits.org/) or check out the [Angular Commit Message Guidelines](https://github.com/angular/angular/blob/22b96b9/CONTRIBUTING.md#-commit-message-guidelines).

## Pull Request Guidelines

- The `develop` branch is basically a snapshot of the latest stable version. All development must be done in dedicated branches;
- Create your pull request to the under the `develop` branch;
- Make sure that there are no issues on running CI/CD pipeline;
- It is good to have multiple small commits while working on the PR. Azure Repos will squash it automatically before the merge;
- Provide a detailed description of the content in the PR;
- Add the appropriate screenshots of the tests that was touched;
- The maintainers or you will merge the changes into the `develop` branch once the pull request will be approved.

#### Steps to create a Pull Request

1. Create a new branch using the `develop` branch, check [here](/docs/CONTRIBUTING.md#branch-creation) the instructions.

2. Create a new branch out of the `develop` branch. We follow the convention
   `[<type>/<scope>]`.

   - `type` can be either `docs`, `bugfix`, `feature`, `build`, or any other conventional commit type.
   - `scope` is just a short id that describes the scope of work or the id of story.

   **Example:** `fix/210988` or `docs/maintenance`.

3. Make and commit your changes following the [commit convention](/docs/CONTRIBUTING.md#commit-convention).
4. Now you are good to create the pull request, that should contain a descriptive title, description and screenshots with running tests.
