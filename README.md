# Periodic Notes Navigator

An Obsidian plugin that puts a small navigation bar in your periodic notes, so
you can move between your daily, weekly, monthly, quarterly and yearly notes
without keeping a block of links inside the note itself.

The bar is part of the interface rather than part of the document, so your
Markdown stays clean, and it stays readable on a phone.

```
 2025 / Q3 / September / Week 39
 ❮ Thursday | Friday | Saturday ❯
```

Up to three rows are shown, depending on the note you are in:

| Row               | What it holds                                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Parent notes      | The longer periods this note sits in — year, quarter, month, week                                                               |
| Previous and next | The period before and after this one, either side of the current note                                                           |
| Contained notes   | The shorter periods inside this one — the days of a week, the weeks of a month, the months of a quarter, the quarters of a year |

Notes you have not written yet are shown dimmed. Clicking one creates it, using
that period's template if you have set one.

## Highlights

- Works with core Obsidian only — no other plugins required.
- Only appears in notes that match your periodic note settings.
- Follows your theme: colours, fonts and sizes come from Obsidian's own
  variables, and the bar adapts to light and dark themes.
- Keyboard and screen reader friendly, with larger tap targets on mobile.
- Folder paths, file name formats and link labels are all configurable, with
  date placeholders.

## Privacy

The plugin makes no network requests, bundles no dependencies at runtime, and
collects nothing. It reads and writes notes in your vault, and its own settings
file, and nothing else.

## Installing

The plugin is not in the community plugin list yet. To install it by hand:

1. Download `main.js`, `manifest.json` and `styles.css` from a release.
2. Put them in `<your vault>/.obsidian/plugins/periodic-notes-nav/`.
3. Reload Obsidian and enable **Periodic Notes Navigator** in
   _Settings → Community plugins_.

Requires Obsidian 1.5.8 or later.

To build from source instead, see [Development](#development) below: `npm run
build` writes those same three files to `build/`, ready to be copied into the
plugin folder.

## How a note is recognised as periodic

For each period you give the plugin a **folder** and a **file name format**. A
note counts as, say, a daily note when its file name parses with the daily
format _and_ it sits in the folder those settings would put it in. Nothing else
in your vault is touched, so a meeting note called `2025-09-26 Standup.md` is
left alone.

Because recognition and link building use the same settings, a note the plugin
can find is also a note the plugin can link to.

## Settings

### Per period

| Setting          | What it does                                                                |
| ---------------- | --------------------------------------------------------------------------- |
| Enable           | Whether this period takes part in the bar at all                            |
| Folder           | Where the notes live. Empty means the vault root. Accepts date placeholders |
| File name format | The date format of the file name, without `.md`                             |
| Label format     | The date format used for this note's links in the bar                       |
| Template         | Optional file used as the body when a missing note is created               |

Formats use [moment.js tokens](https://momentjs.com/docs/#/displaying/format/),
the same ones Obsidian's own daily notes use. Wrap plain words in square
brackets so they are not read as tokens: `[Week] W`, `[Q]Q`.

Sensible starting points:

| Period    | File name format | Label format |
| --------- | ---------------- | ------------ |
| Daily     | `YYYY-MM-DD`     | `dddd`       |
| Weekly    | `gggg-[W]ww`     | `[Week] w`   |
| Monthly   | `YYYY-MM`        | `MMMM`       |
| Quarterly | `YYYY-[Q]Q`      | `[Q]Q`       |
| Yearly    | `YYYY`           | `YYYY`       |

The settings tab shows what today's note would be called with your current
settings, so you can check a format before committing to it.

### Date placeholders in folders

Folder paths take `{{date:FORMAT}}` placeholders, so notes can be filed by year
or month:

```
Journal/{{date:YYYY}}/{{date:MM}}    →  Journal/2025/09/2025-09-26.md
Journal/{{date:YYYY}}/Weeks          →  Journal/2025/Weeks/2025-W39.md
```

`{{date}}` on its own means `YYYY-MM-DD`.

### Templates

When a missing note is created, the template file for that period is used as the
body, with `{{title}}`, `{{date}}`, `{{date:FORMAT}}` and `{{time}}` filled in.
`{{date}}` is the date of the note being created, `{{time}}` is the time you
created it.

### Appearance

The general settings cover where the bar sits (top or bottom of the note — the
bottom is easier to reach on a phone), which of the three rows are shown, the
separators between links, whether the ❮ ❯ arrows appear, and whether notes that
do not exist are dimmed or hidden.

### Weeks

Weeks are the one period that can be counted in two ways. `W`, `WW` and `GGGG`
are ISO week tokens: weeks start on Monday and week 1 is the one holding the
first Thursday of the year. The lower case `w`, `ww` and `gggg` follow the
locale Obsidian is running in.

If your weekly file names use ISO tokens the plugin uses ISO weeks and the
**First day of the week** setting is ignored. Otherwise it uses that setting,
which defaults to following Obsidian's language. Use the same style of token in
the file name format and the label format, or the two can disagree by a week at
the turn of the year — the settings tab warns you when they do.

A week that straddles two months belongs to the month, quarter and year holding
its middle day, which is the same rule ISO uses for week years. That is why week
1 of 2025, which starts on 30 December 2024, is filed under January 2025.

## Commands

All of them can be given hotkeys in _Settings → Hotkeys_:

- **Open previous periodic note** and **Open next periodic note** — step one
  period back or forward from the note you are in.
- **Open parent periodic note** — go up one level, for example from a day to its
  week.
- **Open today's daily note**.
- **Toggle navigation bar**.

## Development

```bash
npm install
npm run dev       # rebuild on every change
npm run build     # typecheck, then write build/ for release
npm test          # unit tests: date, path, model and rendering
npm run test:e2e  # end-to-end tests in a real Obsidian
npm run lint      # eslint
npm run format    # prettier, in place
npm run validate  # manifest and version numbers
```

Everything the build produces goes to `build/`, which git ignores: `main.js`
alongside copies of `manifest.json` and `styles.css`, so the directory is an
installable plugin folder on its own, plus the compiled tests under
`build/test/`.

To work against a real vault, point the build at its plugin folder and let it
rebuild as you edit:

```bash
OUTDIR=~/vault/.obsidian/plugins/periodic-notes-nav npm run dev
```

The source is split so that the parts worth testing hold no Obsidian API:
`periods.ts` does the date arithmetic, `paths.ts` turns dates into vault paths
and recognises periodic notes, `model.ts` decides which links a note gets,
`navbar.ts` renders them, and `main.ts` is the only file that talks to the
workspace.

### Tests

Both suites are Mocha. The unit tests use Chai's `expect` and cover everything
that holds no Obsidian API; they run on every pull request.

The end-to-end tests drive a real Obsidian through
[wdio-obsidian-service](https://github.com/jesse-r-s-hines/wdio-obsidian-service),
so they cover `main.ts` — the navigation bar mounting into a note, links and
commands opening and creating notes. They use `expect` from `@wdio/globals`,
whose matchers wait for the UI to catch up. There are two vaults under
`e2e/vaults/`: `periodic/`, which holds periodic notes alongside normal ones,
and `plain/`, which holds none and proves the bar stays away. Both commit
plugin settings in `.obsidian/`, so assertions do not depend on the machine's
locale.

`npm run test:e2e` builds the plugin first, then downloads the Obsidian
versions it needs into `.obsidian-cache/` (git ignores it). On a headless Linux
box it needs a display:

```bash
Xvfb :99 -screen 0 1280x1024x24 &
DISPLAY=:99 npm run test:e2e
```

By default it tests two pairs: `earliest/earliest`, which resolves to this
plugin's `minAppVersion`, and `latest/latest`. Set `OBSIDIAN_VERSIONS` to a
specific `appVersion/installerVersion` pair to narrow that down, for example
`OBSIDIAN_VERSIONS="latest/latest"` while iterating.

`minAppVersion` is 1.5.8 rather than 1.5.7 because 1.5.7 was an Insiders-only
beta with no public installer — `earliest` could not be downloaded without an
Obsidian Insiders account, and no ordinary user was running it.

### Checks

Pull requests run lint, formatting, typecheck, unit tests, a production build
and the metadata validation on Node 22.

The end-to-end tests are slower, so they run only on the release pull requests
opened by **Prepare release** (branches named `release/<version>`), and can be
started by hand from the Actions tab. Because a pull request opened with the
default `GITHUB_TOKEN` does not trigger workflow runs, they report on the
release pull request automatically only when a `RELEASE_PAT` secret is set —
the same caveat that already applies to the ordinary checks.

### Releasing

Releases are driven entirely from the Actions tab, so a release, its tag and
its attached files can never disagree:

1. Run **Prepare release** and choose `patch`, `minor` or `major`. It runs the
   full check suite, raises the version in `package.json`, `manifest.json` and
   `versions.json`, and opens a pull request.
2. Review and merge that pull request.
3. **Publish release** picks up the merge, tags the commit with the bare
   version number (no `v` prefix, which is what Obsidian requires), builds, and
   opens a **draft** release with `main.js`, `manifest.json` and `styles.css`
   attached.
4. Read the notes and publish the draft.

Nothing else in the repository creates releases. Creating one by hand, or
pushing a tag, will not build or attach anything — and the publish workflow
refuses to run when a release for that version already exists, rather than
quietly leaving the build on a second, draft release.

The release notes are GitHub's generated pull request list, with a short
summary written above it by Copilot. That summary needs a `COPILOT_PAT`
repository secret holding a token from a Copilot-enabled account; without it,
or if the model call fails, the release still goes out with the generated notes
alone.

**Prepare release** needs two things from the repository settings:

- **Settings -> Actions -> General -> Workflow permissions** must allow GitHub
  Actions to create pull requests. Without it the workflow still pushes the
  `release/<version>` branch and puts a link to open the pull request in the run
  summary, but it cannot open it itself.
- A `RELEASE_PAT` secret is optional but worth setting if `main` requires status
  checks. Pull requests opened with the default `GITHUB_TOKEN` do not trigger
  workflow runs, so CI never reports on the release branch and required checks
  stay pending forever. With the secret, CI runs on the release pull request
  like any other. Note that **Prepare release** runs the whole check suite
  itself before writing the release commit either way.

## Licence

MIT
