# Keybindings

Run `/hotkeys` inside an `omp` session to see the active chords for your current build. The list reflects any remaps loaded from disk and any bindings added by extensions.

## Customize keybindings

User remaps live in `~/.omp/agent/keybindings.yml`. The file is a YAML mapping whose keys are keybinding action IDs and whose values are either one chord string or an array of chord strings. It is not read from `~/.omp/agent/config.yml`, and there is no nested `keybindings` object.

With a named profile, bindings from the default profile's agent directory are loaded first and the active profile's `keybindings.yml` overrides them action by action. The inherited file is read-only during that profile's startup.

```yaml
app.model.cycleForward: Ctrl+P
app.model.selectTemporary: Alt+P
app.plan.toggle: Alt+Shift+P
```

Chord names are case-insensitive and use the same notation shown in the UI, such as `Ctrl+P`, `Alt+Shift+P`, `Shift+Enter`, and `Ctrl+Backspace`.

Set an action to an empty array to disable it:

```yaml
app.history.search: []
```

## Common action IDs

| Action ID                    | Default                                                               | Meaning                                                                                                                                                                              |
| ---------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app.model.cycleForward`     | `Ctrl+P`                                                              | Cycle role models forward                                                                                                                                                            |
| `app.model.cycleBackward`    | `Shift+Ctrl+P`                                                        | Cycle role models backward                                                                                                                                                           |
| `app.model.selectTemporary`  | `Alt+P`                                                               | Pick a model temporarily for this session                                                                                                                                            |
| `app.model.select`           | `Alt+M`                                                               | Open the model selector and set roles                                                                                                                                                |
| `app.plan.toggle`            | `Alt+Shift+P`                                                         | Toggle plan mode                                                                                                                                                                     |
| `app.history.search`         | `Ctrl+R`                                                              | Search prompt history                                                                                                                                                                |
| `app.tools.expand`           | `Ctrl+O`                                                              | Toggle tool-output expansion                                                                                                                                                         |
| `app.tools.toggleVisibility` | `Ctrl+Shift+O`                                                        | Show or hide tool activity                                                                                                                                                           |
| `app.thinking.toggle`        | `Ctrl+T`                                                              | Toggle thinking-block visibility                                                                                                                                                     |
| `app.thinking.cycle`         | `Shift+Tab`                                                           | Cycle thinking level                                                                                                                                                                 |
| `app.editor.external`        | `Ctrl+G`                                                              | Edit the draft in `$VISUAL` / `$EDITOR`                                                                                                                                              |
| `app.message.followUp`       | `Ctrl+Q`, `Ctrl+Enter`                                                | Queue a follow-up message                                                                                                                                                            |
| `app.message.dequeue`        | `Alt+Up`, `Shift+Up`                                                  | Dequeue a queued message back into the editor                                                                                                                                        |
| `app.retry`                  | `Alt+R`                                                               | Retry the last failed assistant turn                                                                                                                                                 |
| `app.display.reset`          | `Alt+L`                                                               | Reset terminal display                                                                                                                                                               |
| `app.clipboard.copyLine`     | `Alt+Shift+L`                                                         | Copy the current line                                                                                                                                                                |
| `app.clipboard.copyPrompt`   | `Alt+Shift+C`                                                         | Copy the whole prompt                                                                                                                                                                |
| `app.clipboard.pasteTextRaw` | `Ctrl+Shift+V`, `Alt+Shift+V`                                         | Paste clipboard text without collapsing it                                                                                                                                           |
| `app.clipboard.pasteImage`   | Linux: `Ctrl+V`; macOS: `Ctrl+V`, `Cmd+V`; Windows: `Ctrl+V`, `Alt+V` | Paste from the clipboard (image preferred, text fallback)                                                                                                                            |
| `app.stt.toggle`             | Unbound (hold `Space`)                                                | Toggle speech-to-text. By default there is no key chord — hold the space bar to record (push-to-talk) and release to transcribe; bind a chord here for a press-to-toggle alternative |
| `app.live.toggle`            | `Ctrl+L`                                                              | Start or stop live voice mode (same as `/live`)                                                                                                                                      |
| `app.agents.hub`             | `Alt+A`                                                               | [Open the Agent Hub](./agent-hub.md)                                                                                                                                                 |

## Recover a cleared prompt

Press `Ctrl+C` to clear an unsent composer draft, then `Up` to recall it. Older drafts and submitted prompts share the existing Up/Down navigation. Recalled drafts remain editable and are never sent until you submit them.

Cleared drafts preserve whitespace, collapsed pastes, and image attachments in the current editor's bounded history (100 entries). They are not written to persistent prompt history and do not appear in `Ctrl+R` search. Closing the process discards these canceled drafts; the separate save-on-exit behavior still applies to text currently in the composer. This is not a per-agent stash: history follows the editor, including when Agent Hub changes focus.

The existing double-`Ctrl+C` exit behavior is unchanged. Empty clears do not add history entries.

Recovery is on by default. Turn off **Recall Cleared Drafts** in `/settings` under Interaction > Input, or set `composer.recallClearedDrafts: false`. This takes effect on the next clear without restarting; previously retained drafts remain in history until evicted or the editor closes.

On Windows Terminal, `Ctrl+V` may be handled by the terminal paste command before `omp` sees it; use the `Alt+V` fallback when clipboard image paste appears to do nothing. When the clipboard holds no image, `app.clipboard.pasteImage` pastes the clipboard text instead, so hosts that deliver only this chord (VS Code's integrated terminal when configured to forward `Ctrl+V`, Windows clipboard history via `Win+V`) work for both payload kinds. Windows Terminal also swallows `Ctrl+Enter`, so the `app.message.followUp` chord also binds `Ctrl+Q` — the same chord GitHub Copilot CLI uses — and the same chord submits the agent dashboard's new-agent description and hook-editor prompts. If your existing `keybindings.yml` already assigns `Ctrl+Q` to another action, that user remap wins and follow-up keeps `Ctrl+Enter` unless you explicitly bind `app.message.followUp`.

Terminals that implement OSC 5522 enhanced paste can send clipboard MIME data directly to `omp`; image pastes are attached as `[Image #N]`, while text/plain paste events keep normal paste behavior. When OSC 5522 is unavailable, bracketed paste still handles text, and a pasted single image-file path is loaded as an image when the file is readable from the `omp` host.

Older unqualified action names are migrated when `keybindings.yml` is loaded, but new docs and new configs should use the namespaced action IDs above. Existing `keybindings.json` files are still accepted and migrated to `keybindings.yml`; `keybindings.yaml` is also accepted.

## Vim editing mode

Off by default. Turn it on with **Vim Editing Mode** in `/settings` (Interaction → Input), or set it directly:

```yaml
tui.vimMode: true
```

The prompt then starts in Insert mode and behaves exactly as it always has. `Escape` switches to Normal mode; the prompt border changes color so the current mode is visible at a glance. While Vim mode is on, Insert draws a bar cursor and Normal/Replace/Visual a block — the software cursor always, the real terminal cursor via DECSCUSR under `PI_HARDWARE_CURSOR` — overriding the terminal's configured shape until the session restores it on exit. This is a useful subset of Vim, not a full implementation — enough for keyboard-only navigation and selection without adding more `Ctrl` chords that terminals, shells, and tmux already claim.

| Mode        | Enter with                         | Leave with                              |
| ----------- | ---------------------------------- | --------------------------------------- |
| Insert      | `i` `a` `I` `A` `o` `O`, or change | `Escape`                                |
| Normal      | `Escape` from another mode          | an Insert, Replace, or Visual entry key |
| Replace     | `R` in Normal                      | `Escape`                                |
| Visual      | `v`                                | `Escape`, or a selection operation      |
| Visual line | `V`                                | `Escape`, or a selection operation      |

The `vim` status-line segment shows `INSERT`, `NORMAL`, `REPLACE`, `VISUAL`, or `V-LINE`, plus pending commands and Visual selection height. `tui.vimModeDisplay` selects `text`, `icon`, or `none`; custom status-line presets can include `"vim"` in `statusLine.leftSegments`. Replace uses the theme's error color (red by default) for its prompt border and status label, and `icon.vimReplace` for icon display. Like the other mode icons, this symbol follows the active symbol preset and can be overridden in a theme's `symbols` map.

### Normal mode

| Keys                          | Meaning                                                        |
| ----------------------------- | -------------------------------------------------------------- |
| `h` `j` `k` `l`               | Move by character and line (arrow keys work too)               |
| `0` `^` `$`                   | Line start / first non-blank / line end                        |
| `w` `b` `e`                   | Next word, previous word, end of word                          |
| `W` `B` `E`                   | Next WORD, previous WORD, end of WORD; whitespace-delimited, including punctuation and slashes, across lines |
| `gg` `G`                      | First line, last line (`5gg` and `5G` jump to line 5)          |
| `H` `M` `L`                   | First / middle / last visible prompt line; `2H` is the second visible line, `2L` the second from the bottom |
| `f{char}` `F{char}`            | Find the next / previous occurrence of a character on the current line |
| `t{char}` `T{char}`            | Move just before the next / just after the previous occurrence on the current line |
| `;` `,`                       | Repeat the last character find in its original / opposite direction |
| `1`–`9` prefix                | Repeat a motion or operator, e.g. `3w`, `5j`, `2dd`            |
| `i` `a` `I` `A`               | Insert before / after cursor, at line start / line end         |
| `o` `O`                       | Open a line below / above and insert                           |
| `x` `X`                       | Delete the current / previous grapheme; `X` never crosses the line start |
| `D` `C`                       | Delete / change to line end (`2D` and `2C` extend through the next line) |
| `S`                           | Change whole lines, like `cc`; a count changes that many lines |
| `Y`                           | Yank whole lines, like classic Vim `yy` (not `y$`); accepts a count |
| `J`                           | Join with the next line; a count selects the number of lines to join |
| `R`                           | Enter Replace mode |
| `d` `y` `c` + motion          | Operate over a motion, e.g. `dw`, `d$`, `yb`, `cw`             |
| `dd` `yy` `cc`                | Linewise delete / yank / change                                |
| `d` `y` `c` + text object     | Operate over a text object, e.g. `diw`, `ca(`, `ci"`, `dap`    |
| `p` `P`                       | Put the last yank or delete after / before the cursor          |
| `u`                           | Undo                                                            |
| `U`                           | Restore the current line's baseline; repeating `U` toggles the restoration |

`H`/`M`/`L` use visible **logical lines of the prompt**, not transcript lines or individual wrapped screen rows. Counts apply to `H` and `L`. Character finds and their `;`/`,` repeats also accept counts and work as operator or Visual motions.

`J` removes the following line's leading whitespace and adds one separating space when needed. It preserves existing trailing whitespace, adds no space before `)`, and does not add a second space after sentence punctuation (`nojoinspaces` behavior).

`U` restores the line as it was before the first edit during the current visit. Repeating `U` toggles between that baseline and the edited line, and ordinary `u` can undo the restoration. Leaving the line, a host replacement of the draft, or a structural edit resets the baseline.

### Replace mode

`R` overwrites graphemes at the cursor and extends the line when it reaches the end. `Backspace` restores text overwritten in the current contiguous literal overwrite segment, including removing text appended beyond the line end. `Escape` returns to Normal mode.

Each contiguous literal overwrite segment is one undo unit, **not** the entire session from `R` to `Escape`. Navigation, newline insertion with `Shift+Enter`, completion, and host/control chords end the current undo/restoration segment without leaving Replace mode; subsequent `Backspace` does not restore text from earlier segments.

### Text objects

A text object follows an operator (`diw`) or extends a Visual selection (`viw`). `i` takes the inside, `a` takes the surroundings; counts apply, e.g. `d2aw`.

| Object            | Covers                                                                     |
| ----------------- | -------------------------------------------------------------------------- |
| `iw` `aw`         | Word; `aw` also takes the adjoining whitespace                             |
| `iW` `aW`         | Whitespace-delimited WORD                                                  |
| `i"` `i'` `` i` `` | Inside the quotes on the current line (`a"` takes the quotes too)          |
| `i(` `i[` `i{` `i<` | Inside the innermost matching pair, nesting-aware and across lines         |
| `a(` `a[` `a{` `a<` | The same pair including its delimiters (`b` and `B` alias `(` and `{`)     |
| `ip` `ap`         | Paragraph — the run of non-blank (or blank) lines, linewise                |

### Visual mode

`v` starts a character-wise selection and `V` a line-wise one; motions move the free end. `Escape` cancels.

| Keys              | Meaning |
| ----------------- | ------- |
| `y`               | Copy the selection to the system clipboard and internal register |
| `d` `x`           | Delete the selection |
| `c` `s`           | Delete the selection and enter Insert mode |
| `D` `X`           | Delete all lines touched by the selection |
| `Y`               | Yank all lines touched by the selection |
| `S` `C` `R`       | Change all lines touched by the selection and enter Insert mode |
| `U` `u`           | Uppercase / lowercase the selection, preserving protected placeholder labels |
| `J`               | Join the selected lines |
| `o` `O`           | Swap the active and anchored selection endpoints |
| `p` `P`           | Replace the selection with the internal register, preserving that source register |

A selection that would cut through an attachment placeholder such as `[Image #1, 800x600]` or `[Paste #2, +30 lines]` takes the whole placeholder with it, so a delete can never leave a corrupt fragment behind.

### Escape

`Escape` is shared with the app-level interrupt, so Vim mode takes it only when it has something to do:

- **Insert or Replace mode** → switch to Normal mode.
- **Visual mode**, or a half-typed count or operator → cancel back to a quiet Normal mode.
- **Normal mode with nothing pending** → falls through to its usual meaning (dismiss autocomplete, abort the running turn, clear the draft).

Vim keys never shadow app chords: `Ctrl`-combinations, `Enter`, and `Tab` keep their normal behavior in every mode, so `Enter` still submits from Normal mode. Prompt history stays on `Up`/`Down` in Insert mode only — in Normal mode those keys are `k` and `j`, so navigating a multi-line draft never loads a previous prompt.

Normal-mode `K`, `N`, `Q`, and `Z` commands are not implemented. This editor does not provide Vim's external keyword lookup, search-repeat, Ex mode, or file/window commands.
