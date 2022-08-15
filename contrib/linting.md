# Keeping our code style aligned with linting

We're using linters for a couple of reasons:
- We've experienced a lot of reviews to focus on the stying of code rather than its design and architecture. In particular, this has the potential to be a real turn-off for a newcomer.
- Writing code in a shared style makes way easier to read across files.
- As with any static analysis of code, linting has the potential to find bugs before our users do.

## Setup your editor to format on save

To help yourself keep your code passing linters at all times, it's highly recommended to setup your editor to help you.

### Visual Studio Code

- Install and enable the ["eslint" extension for VS Code](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint).
- Disable any other code formatting extensions (such as Prettier / [`esbenp.prettier-vscode`](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)) for the workspace, as they might interfere with the format enforced by eslint.
- Make sure you've enabled "format on save" on your workspace.

The eslint formatting on save can be enabled via the UI or you can <kbd>Cmd</kbd> + <kbd>P</kbd>, type *"> Preferences Open Workspace Settings (JSON)"* and paste in the following in the `settings` object:

```json
"editor.formatOnSave": true
```

## Running the linters off the CLI

Linters are run for every pull-request, via [the `pr-linting` workflow](../.github/workflows/pr-linting.yml) on GitHub Actions.

Every package of this mono-repository should have a `lint` script - to lint, simply change your working directory and run the script:

```
npm run lint
```

To run linting on every package of the project, use the `workspaces:lint` script in the root package:

```
npm run workspaces:lint
```

The linter can automatically fix some issues. To run a fix across every sub-package, you can use the `workspaces:lint` script in the root package with a `--fix` argument:

```
npm run workspaces:lint -- --fix
```
