import { describe, expect, it } from "bun:test";
import { Editor } from "@oh-my-pi/pi-tui/components/editor";
import { defaultEditorTheme } from "./test-themes";

const ESC = "\x1b";
const UP = "\x1b[A";
const DOWN = "\x1b[B";

function vimEditor(text = "", options: { cursorToStart?: boolean } = {}): Editor {
	const editor = new Editor(defaultEditorTheme);
	editor.setVimMode(true);
	editor.setText(text);
	// `setText` parks the cursor at the end; most tests want to drive from the top of the buffer.
	if (options.cursorToStart !== false) {
		editor.handleInput(ESC);
		editor.handleInput("g");
		editor.handleInput("g");
	}
	return editor;
}

/** Cursor position, via the editor's public accessor. */
function cursor(editor: Editor): { line: number; col: number } {
	return editor.getCursor();
}

describe("Editor vim mode", () => {
	describe("disabled by default", () => {
		it("types vim command letters as ordinary text", () => {
			const editor = new Editor(defaultEditorTheme);
			for (const key of "hjkldwvyGx") editor.handleInput(key);
			expect(editor.getText()).toBe("hjkldwvyGx");
			expect(editor.vimMode).toBe("insert");
		});

		it("never claims Escape", () => {
			const editor = new Editor(defaultEditorTheme);
			editor.setText("draft");
			editor.handleInput(ESC);
			expect(editor.vimConsumesEscape()).toBe(false);
			expect(editor.getText()).toBe("draft");
		});
	});

	describe("mode switching", () => {
		it("starts in insert mode so typing still works when the setting is flipped on", () => {
			const editor = new Editor(defaultEditorTheme);
			editor.setVimMode(true);
			editor.handleInput("hi");
			expect(editor.getText()).toBe("hi");
			expect(editor.vimMode).toBe("insert");
		});

		it("enters normal mode on Escape and stops inserting text", () => {
			const editor = new Editor(defaultEditorTheme);
			editor.setVimMode(true);
			editor.handleInput("abc");
			editor.handleInput(ESC);
			expect(editor.vimMode).toBe("normal");
			editor.handleInput("z");
			expect(editor.getText()).toBe("abc");
		});

		it("hands Escape back to the app once normal mode is quiet", () => {
			const editor = vimEditor("abc");
			expect(editor.vimMode).toBe("normal");
			expect(editor.vimConsumesEscape()).toBe(false);
		});

		it("claims Escape while a count or operator is half-typed", () => {
			const editor = vimEditor("abc");
			editor.handleInput("2");
			expect(editor.vimConsumesEscape()).toBe(true);
			editor.handleInput(ESC);
			expect(editor.vimConsumesEscape()).toBe(false);

			editor.handleInput("d");
			expect(editor.vimConsumesEscape()).toBe(true);
		});

		it("returns to insert mode via i/a/I/A", () => {
			const editor = vimEditor("ab");
			editor.handleInput("i");
			expect(editor.vimMode).toBe("insert");
			editor.handleInput("X");
			expect(editor.getText()).toBe("Xab");

			editor.handleInput(ESC);
			editor.handleInput("A");
			editor.handleInput("Z");
			expect(editor.getText()).toBe("XabZ");
		});

		it("opens a line below with o and above with O", () => {
			const editor = vimEditor("one");
			editor.handleInput("o");
			editor.handleInput("two");
			expect(editor.getText()).toBe("one\ntwo");

			editor.handleInput(ESC);
			editor.handleInput("O");
			editor.handleInput("mid");
			expect(editor.getText()).toBe("one\nmid\ntwo");
		});
	});

	describe("motions", () => {
		it("moves with h/j/k/l without editing the buffer", () => {
			const editor = vimEditor("alfa\nbeta");
			for (const key of "lljhk") editor.handleInput(key);
			expect(editor.getText()).toBe("alfa\nbeta");
		});

		it("0 and $ jump to the line edges", () => {
			const editor = vimEditor("alfa beta");
			editor.handleInput("$");
			editor.handleInput("a");
			editor.handleInput("!");
			expect(editor.getText()).toBe("alfa beta!");

			editor.handleInput(ESC);
			editor.handleInput("0");
			editor.handleInput("i");
			editor.handleInput(">");
			expect(editor.getText()).toBe(">alfa beta!");
		});

		it("w lands on the start of the next word", () => {
			const editor = vimEditor("alfa beta gamma");
			editor.handleInput("w");
			editor.handleInput("i");
			editor.handleInput("<");
			expect(editor.getText()).toBe("alfa <beta gamma");
		});

		it("b steps back to the start of the previous word", () => {
			const editor = vimEditor("alfa beta gamma");
			editor.handleInput("w");
			editor.handleInput("w");
			editor.handleInput("b");
			editor.handleInput("i");
			editor.handleInput(">");
			expect(editor.getText()).toBe("alfa >beta gamma");
		});

		it("applies a count prefix to a motion", () => {
			const editor = vimEditor("alfa beta gamma delta");
			editor.handleInput("3");
			editor.handleInput("w");
			editor.handleInput("i");
			editor.handleInput("|");
			expect(editor.getText()).toBe("alfa beta gamma |delta");
		});

		it("gg and G jump to the buffer edges", () => {
			const editor = vimEditor("one\ntwo\nthree");
			editor.handleInput("G");
			editor.handleInput("A");
			editor.handleInput("!");
			expect(editor.getText()).toBe("one\ntwo\nthree!");

			editor.handleInput(ESC);
			editor.handleInput("g");
			editor.handleInput("g");
			editor.handleInput("I");
			editor.handleInput(">");
			expect(editor.getText()).toBe(">one\ntwo\nthree!");
		});

		it("k on the first line moves the cursor instead of loading prompt history", () => {
			const editor = new Editor(defaultEditorTheme);
			editor.addToHistory("an older prompt");
			editor.setVimMode(true);
			editor.setText("current draft");
			editor.handleInput(ESC);
			editor.handleInput("k");
			editor.handleInput("k");
			expect(editor.getText()).toBe("current draft");
		});

		it("arrow keys act as motions in normal mode and never browse history", () => {
			const editor = new Editor(defaultEditorTheme);
			editor.addToHistory("an older prompt");
			editor.setVimMode(true);
			editor.setText("current draft");
			editor.handleInput(ESC);
			editor.handleInput(UP);
			editor.handleInput(DOWN);
			expect(editor.getText()).toBe("current draft");
		});

		it("backspace moves left in normal mode rather than deleting", () => {
			const editor = vimEditor("alfa", { cursorToStart: false });
			editor.handleInput(ESC);
			editor.handleInput("\x7f");
			expect(editor.getText()).toBe("alfa");
		});
	});

	describe("normal-mode edits", () => {
		it("x deletes the character under the cursor", () => {
			const editor = vimEditor("abcd");
			editor.handleInput("x");
			expect(editor.getText()).toBe("bcd");
			editor.handleInput("2");
			editor.handleInput("x");
			expect(editor.getText()).toBe("d");
		});

		it("D deletes to end of line and C changes to end of line", () => {
			const editor = vimEditor("alfa beta");
			editor.handleInput("w");
			editor.handleInput("D");
			expect(editor.getText()).toBe("alfa ");

			editor.handleInput("0");
			editor.handleInput("C");
			expect(editor.vimMode).toBe("insert");
			editor.handleInput("new");
			expect(editor.getText()).toBe("new");
		});

		it("D and C honor a count across lines", () => {
			const deleter = vimEditor("alfa beta\ngamma delta\nepsilon");
			deleter.handleInput("w");
			deleter.handleInput("2");
			deleter.handleInput("D");
			expect(deleter.getText()).toBe("alfa \nepsilon");

			const changer = vimEditor("alfa beta\ngamma delta\nepsilon");
			changer.handleInput("w");
			changer.handleInput("2");
			changer.handleInput("C");
			expect(changer.vimMode).toBe("insert");
			changer.handleInput("new");
			expect(changer.getText()).toBe("alfa new\nepsilon");
		});

		it("dw deletes a word and dd deletes a line", () => {
			const editor = vimEditor("alfa beta\nsecond line");
			editor.handleInput("d");
			editor.handleInput("w");
			expect(editor.getText()).toBe("beta\nsecond line");

			editor.handleInput("d");
			editor.handleInput("d");
			expect(editor.getText()).toBe("second line");
		});

		it("cw changes to the end of the word and enters insert mode", () => {
			const editor = vimEditor("alfa beta");
			editor.handleInput("c");
			editor.handleInput("w");
			expect(editor.vimMode).toBe("insert");
			editor.handleInput("new");
			// `cw` on a non-blank behaves like `ce`, so the separating space survives.
			expect(editor.getText()).toBe("new beta");
		});

		it("cc clears the line and enters insert mode", () => {
			const editor = vimEditor("alfa beta\nsecond");
			editor.handleInput("c");
			editor.handleInput("c");
			expect(editor.vimMode).toBe("insert");
			editor.handleInput("fresh");
			expect(editor.getText()).toBe("fresh\nsecond");
		});

		it("u undoes the previous edit", () => {
			const editor = vimEditor("alfa beta");
			editor.handleInput("d");
			editor.handleInput("w");
			expect(editor.getText()).toBe("beta");
			editor.handleInput("u");
			expect(editor.getText()).toBe("alfa beta");
		});

		it("yy then p duplicates a line", () => {
			const editor = vimEditor("alfa\nbeta");
			editor.handleInput("y");
			editor.handleInput("y");
			editor.handleInput("p");
			expect(editor.getText()).toBe("alfa\nalfa\nbeta");
		});
	});

	describe("text objects", () => {
		it("diw deletes the word under the cursor instead of entering insert mode", () => {
			const editor = vimEditor("alfa beta gamma");
			editor.handleInput("w");
			editor.handleInput("d");
			editor.handleInput("i");
			expect(editor.vimMode).toBe("normal");
			editor.handleInput("w");
			expect(editor.getText()).toBe("alfa  gamma");
			expect(editor.vimMode).toBe("normal");
		});

		it("daw takes the trailing whitespace with the word", () => {
			const editor = vimEditor("alfa beta gamma");
			editor.handleInput("w");
			for (const key of "daw") editor.handleInput(key);
			expect(editor.getText()).toBe("alfa gamma");
		});

		it("daw falls back to the leading whitespace at the end of a line", () => {
			const editor = vimEditor("alfa beta");
			editor.handleInput("w");
			for (const key of "daw") editor.handleInput(key);
			expect(editor.getText()).toBe("alfa");
		});

		it("a counted aw takes that many words", () => {
			const editor = vimEditor("alfa beta gamma");
			for (const key of "d2aw") editor.handleInput(key);
			expect(editor.getText()).toBe("gamma");
		});

		it("ciw replaces the word and enters insert mode", () => {
			const editor = vimEditor("alfa beta");
			for (const key of "ciw") editor.handleInput(key);
			expect(editor.vimMode).toBe("insert");
			editor.handleInput("x");
			expect(editor.getText()).toBe("x beta");
		});

		it("iw and aw over quoted spans", () => {
			const inner = vimEditor('say "hello there" now');
			for (const key of 'di"') inner.handleInput(key);
			expect(inner.getText()).toBe('say "" now');

			const around = vimEditor('say "hello there" now');
			for (const key of 'da"') around.handleInput(key);
			expect(around.getText()).toBe("say now");
		});

		it('ci" parks the cursor between empty quotes', () => {
			const editor = vimEditor('say "" now');
			for (const key of 'ci"') editor.handleInput(key);
			expect(editor.vimMode).toBe("insert");
			editor.handleInput("hi");
			expect(editor.getText()).toBe('say "hi" now');
		});

		it("di( takes the innermost pair around the cursor", () => {
			const editor = vimEditor("call(one, nest(two), three)");
			for (let i = 0; i < 15; i++) editor.handleInput("l");
			for (const key of "di(") editor.handleInput(key);
			expect(editor.getText()).toBe("call(one, nest(), three)");
		});

		it("da{ spans the lines the block covers", () => {
			const editor = vimEditor("fn {\n  body\n}\ntail");
			editor.handleInput("j");
			for (const key of "da{") editor.handleInput(key);
			expect(editor.getText()).toBe("fn \ntail");
		});

		it("dip deletes the paragraph under the cursor linewise", () => {
			const editor = vimEditor("one\ntwo\n\nthree");
			for (const key of "dip") editor.handleInput(key);
			expect(editor.getText()).toBe("\nthree");
		});

		it("viw selects the word so the next operator applies to it", () => {
			const editor = vimEditor("alfa beta");
			for (const key of "viw") editor.handleInput(key);
			expect(editor.vimMode).toBe("visual");
			editor.handleInput("d");
			expect(editor.getText()).toBe(" beta");
		});

		it("echoes the half-typed object and cancels it with Escape", () => {
			const editor = vimEditor("alfa beta");
			editor.handleInput("d");
			editor.handleInput("i");
			expect(editor.vimPending).toBe("di");
			expect(editor.vimConsumesEscape()).toBe(true);
			editor.handleInput(ESC);
			expect(editor.vimPending).toBe("");
			editor.handleInput("w");
			expect(editor.getText()).toBe("alfa beta");
		});
	});

	describe("visual mode", () => {
		it("v + motion + d deletes the selection", () => {
			const editor = vimEditor("alfa beta");
			editor.handleInput("v");
			expect(editor.vimMode).toBe("visual");
			for (let i = 0; i < 4; i++) editor.handleInput("l");
			editor.handleInput("d");
			expect(editor.getText()).toBe("beta");
			expect(editor.vimMode).toBe("normal");
		});

		it("v + motion + y copies without changing the buffer", () => {
			const yanked: string[] = [];
			const editor = vimEditor("alfa beta");
			editor.onYank = text => yanked.push(text);
			editor.handleInput("v");
			for (let i = 0; i < 3; i++) editor.handleInput("l");
			editor.handleInput("y");
			expect(editor.getText()).toBe("alfa beta");
			expect(yanked).toEqual(["alfa"]);
			expect(editor.vimMode).toBe("normal");
		});

		it("yanked text comes back through p", () => {
			const editor = vimEditor("alfa beta");
			editor.handleInput("v");
			for (let i = 0; i < 3; i++) editor.handleInput("l");
			editor.handleInput("y");
			editor.handleInput("$");
			editor.handleInput("p");
			expect(editor.getText()).toBe("alfa betaalfa");
		});

		it("selects across lines and deletes the joined range", () => {
			const editor = vimEditor("alfa\nbeta\ngamma");
			editor.handleInput("v");
			editor.handleInput("j");
			// Charwise selection is inclusive of the grapheme under the cursor, so this covers
			// "alfa\nb" and the surviving halves join.
			editor.handleInput("d");
			expect(editor.getText()).toBe("eta\ngamma");
		});

		it("V selects whole lines", () => {
			const editor = vimEditor("alfa\nbeta\ngamma");
			editor.handleInput("l");
			editor.handleInput("V");
			expect(editor.vimMode).toBe("visual-line");
			editor.handleInput("j");
			editor.handleInput("d");
			expect(editor.getText()).toBe("gamma");
		});

		it("Escape leaves visual mode without editing", () => {
			const editor = vimEditor("alfa beta");
			editor.handleInput("v");
			editor.handleInput("l");
			expect(editor.vimConsumesEscape()).toBe(true);
			editor.handleInput(ESC);
			expect(editor.vimMode).toBe("normal");
			expect(editor.getText()).toBe("alfa beta");
		});

		it("renders the selection in reverse video", () => {
			const editor = vimEditor("alfa beta");
			editor.handleInput("v");
			for (let i = 0; i < 3; i++) editor.handleInput("l");
			const frame = editor.render(40).join("\n");
			expect(frame).toContain("\x1b[7malfa\x1b[27m");
		});

		it("highlights the newline when the selection runs onto the next line", () => {
			const editor = vimEditor("alfa\nbeta");
			editor.handleInput("v");
			editor.handleInput("j");
			const frame = editor.render(40).join("\n");
			// The first row keeps its whole text plus a highlighted cell standing in for the newline.
			expect(frame).toContain("\x1b[7malfa\x1b[27m\x1b[7m \x1b[27m");
			// The second row highlights only the grapheme under the cursor.
			expect(frame).toContain("\x1b[7mb\x1b[27m");
		});

		it("renders an empty buffer without a selection artifact", () => {
			const editor = new Editor(defaultEditorTheme);
			editor.setVimMode(true);
			editor.handleInput(ESC);
			editor.handleInput("v");
			expect(() => editor.render(40)).not.toThrow();
		});
	});

	describe("batched input", () => {
		it("replays a multi-key run as separate commands", () => {
			const editor = vimEditor("alfa beta gamma");
			// Batched stdin can deliver a whole run at once; each grapheme is still one command.
			editor.handleInput("wwx");
			expect(editor.getText()).toBe("alfa beta amma");
		});

		it("types the tail of a run that switched back to insert mode", () => {
			const editor = vimEditor("xyz");
			editor.handleInput("iabc");
			expect(editor.getText()).toBe("abcxyz");
			expect(editor.vimMode).toBe("insert");
		});
	});

	describe("autocomplete", () => {
		it("spends the first Escape dismissing the popup, the second leaving insert mode", async () => {
			const editor = new Editor(defaultEditorTheme);
			editor.setVimMode(true);
			const { promise: shown, resolve: resolveShown } = Promise.withResolvers<void>();
			editor.setAutocompleteProvider({
				async getSuggestions() {
					return { items: [{ label: "/help", value: "/help" }], prefix: "/" };
				},
				applyCompletion(lines, cursorLine, cursorCol) {
					return { lines, cursorLine, cursorCol };
				},
			});
			editor.onAutocompleteUpdate = resolveShown;

			editor.handleInput("/");
			await shown;
			expect(editor.isShowingAutocomplete()).toBe(true);

			editor.handleInput(ESC);
			expect(editor.isShowingAutocomplete()).toBe(false);
			expect(editor.vimMode).toBe("insert");

			editor.handleInput(ESC);
			expect(editor.vimMode).toBe("normal");
		});
	});

	describe("protected regions", () => {
		it("a visual delete that clips an atomic token removes the whole token", () => {
			const editor = new Editor(defaultEditorTheme);
			editor.atomicTokenPattern = /\[Image #\d+, \d+x\d+\]/g;
			editor.setVimMode(true);
			editor.setText("see [Image #1, 800x600] here");
			editor.handleInput(ESC);
			editor.handleInput("g");
			editor.handleInput("g");
			// Select "see [Ima" — the tail lands inside the placeholder.
			editor.handleInput("v");
			for (let i = 0; i < 7; i++) editor.handleInput("l");
			editor.handleInput("d");
			// The partially covered token went with it rather than leaving a corrupt fragment.
			expect(editor.getText()).toBe(" here");
		});

		it("x never splits an atomic token", () => {
			const editor = new Editor(defaultEditorTheme);
			editor.atomicTokenPattern = /\[Image #\d+, \d+x\d+\]/g;
			editor.setVimMode(true);
			editor.setText("[Image #1, 800x600]!");
			editor.handleInput(ESC);
			editor.handleInput("g");
			editor.handleInput("g");
			editor.handleInput("x");
			expect(editor.getText()).toBe("!");
		});
	});

	describe("toggling the setting", () => {
		it("drops back to insert mode so typing always works after a toggle", () => {
			const editor = vimEditor("alfa");
			expect(editor.vimMode).toBe("normal");
			// `gg` left the cursor at the head of the buffer, so plain typing inserts there.
			editor.setVimMode(false);
			expect(editor.vimMode).toBe("insert");
			editor.handleInput("x");
			expect(editor.getText()).toBe("xalfa");

			editor.setVimMode(true);
			expect(editor.vimMode).toBe("insert");
			editor.handleInput("y");
			expect(editor.getText()).toBe("xyalfa");
		});
	});

	describe("mode chrome", () => {
		it("reports the half-typed command so hosts can echo it", () => {
			const editor = vimEditor("alfa bravo charlie");
			expect(editor.vimPending).toBe("");
			editor.handleInput("2");
			expect(editor.vimPending).toBe("2");
			editor.handleInput("d");
			expect(editor.vimPending).toBe("2d");
			editor.handleInput(ESC);
			expect(editor.vimPending).toBe("");
		});

		it("reports the Visual selection height as it grows", () => {
			const editor = vimEditor("one\ntwo\nthree");
			expect(editor.vimSelectedLines).toBe(0);
			editor.handleInput("V");
			expect(editor.vimSelectedLines).toBe(1);
			editor.handleInput("j");
			expect(editor.vimSelectedLines).toBe(2);
			editor.handleInput(ESC);
			expect(editor.vimSelectedLines).toBe(0);
		});

		it("notifies on pending and selection changes, not just mode switches", () => {
			const editor = vimEditor("one\ntwo\nthree");
			const seen: string[] = [];
			editor.onVimModeChange = () => seen.push(`${editor.vimMode}:${editor.vimPending}:${editor.vimSelectedLines}`);

			editor.handleInput("2"); // pending only — mode unchanged
			editor.handleInput(ESC); // pending cleared — mode unchanged
			editor.handleInput("V"); // mode switch
			editor.handleInput("j"); // selection grows — mode and pending unchanged

			expect(seen).toEqual(["normal:2:0", "normal::0", "visual-line::1", "visual-line::2"]);
		});

		it("draws a block cursor in Normal and an underline cursor in Insert", () => {
			const editor = vimEditor("alfa");
			editor.focused = true;
			expect(editor.render(20).join("\n")).toContain("\x1b[7m");

			editor.handleInput("i");
			expect(editor.vimMode).toBe("insert");
			const insertFrame = editor.render(20).join("\n");
			expect(insertFrame).toContain("\x1b[4m");
			expect(insertFrame).not.toContain("\x1b[7m");
		});

		it("keeps the reverse-video cursor for non-modal editors", () => {
			const editor = new Editor(defaultEditorTheme);
			editor.setText("alfa");
			editor.focused = true;
			const frame = editor.render(20).join("\n");
			expect(frame).not.toContain("\x1b[4m");
			expect(editor.vimEnabled).toBe(false);
		});
	});

	describe("desired column across vertical motions", () => {
		// Vim remembers the column you left, so passing over a short line does not permanently
		// collapse it. The middle line is deliberately shorter than the cursor column.
		const buf = "alfa bravo charlie\nxy\ndelta echo foxtrot";

		it("restores the column after descending through a shorter line", () => {
			const editor = vimEditor(buf);
			for (let i = 0; i < 12; i++) editor.handleInput("l");
			expect(cursor(editor)).toEqual({ line: 0, col: 12 });

			editor.handleInput("j");
			// Clamped to the short line, but the desired column is remembered.
			expect(cursor(editor)).toEqual({ line: 1, col: 1 });

			editor.handleInput("j");
			expect(cursor(editor)).toEqual({ line: 2, col: 12 });
		});

		it("re-anchors the column after a horizontal motion", () => {
			const editor = vimEditor(buf);
			for (let i = 0; i < 12; i++) editor.handleInput("l");
			editor.handleInput("j");
			// `0` is a horizontal motion, so the remembered column is dropped.
			editor.handleInput("0");
			editor.handleInput("j");
			expect(cursor(editor)).toEqual({ line: 2, col: 0 });
		});

		it("keeps the column across a counted vertical motion", () => {
			const editor = vimEditor(buf);
			for (let i = 0; i < 12; i++) editor.handleInput("l");
			editor.handleInput("j");
			// The count prefix must not clear the column `j` established.
			editor.handleInput("1");
			editor.handleInput("j");
			expect(cursor(editor)).toEqual({ line: 2, col: 12 });
		});

		it("makes `$` a sticky end-of-line column", () => {
			const editor = vimEditor(buf);
			editor.handleInput("$");
			expect(cursor(editor)).toEqual({ line: 0, col: 17 });

			editor.handleInput("j");
			expect(cursor(editor)).toEqual({ line: 1, col: 1 });

			// Not the 17 from line 0 — the end of *this* line.
			editor.handleInput("j");
			expect(cursor(editor)).toEqual({ line: 2, col: 17 });
		});
	});

	describe("WORD motions", () => {
		it("treats punctuation as part of a WORD", () => {
			const WORD = vimEditor("foo-bar baz.qux");
			WORD.handleInput("W");
			expect(cursor(WORD)).toEqual({ line: 0, col: 8 });

			WORD.handleInput("0E");
			expect(cursor(WORD)).toEqual({ line: 0, col: 6 });

			WORD.handleInput("$B");
			expect(cursor(WORD)).toEqual({ line: 0, col: 8 });
		});

		it("counts WORDs across newlines and blank lines", () => {
			const editor = vimEditor("foo-bar baz.qux\n\nlast:item end");
			editor.handleInput("2W");
			expect(cursor(editor)).toEqual({ line: 1, col: 0 });
			editor.handleInput("W");
			expect(cursor(editor)).toEqual({ line: 2, col: 0 });
			editor.handleInput("B");
			expect(cursor(editor)).toEqual({ line: 1, col: 0 });
			editor.handleInput("2B");
			expect(cursor(editor)).toEqual({ line: 0, col: 0 });
			editor.handleInput("3E");
			expect(cursor(editor)).toEqual({ line: 2, col: 8 });
		});

		it("cW preserves the separator while replacing a punctuation-containing WORD", () => {
			const editor = vimEditor("foo-bar baz.qux tail");
			editor.handleInput("cW");
			expect(editor.vimMode).toBe("insert");
			editor.handleInput("fresh");
			expect(editor.getText()).toBe("fresh baz.qux tail");
		});

		it("multiplies operator and WORD counts", () => {
			const editor = vimEditor("a-b c.d e:f g/h keep");
			editor.handleInput("2d2W");
			expect(editor.getText()).toBe("keep");
		});

		it("dB excludes the current WORD when deleting backward across a newline", () => {
			const editor = vimEditor("foo-bar\nbaz.qux");
			editor.handleInput("WdB");
			expect(editor.getText()).toBe("baz.qux");
		});

		it("includes the final grapheme of a Visual E selection", () => {
			const editor = vimEditor("foo-bar baz");
			editor.handleInput("vEd");
			expect(editor.getText()).toBe(" baz");
			expect(editor.vimMode).toBe("normal");
		});
	});

	describe("uppercase line and character edits", () => {
		it("counted X deletes whole graphemes before the cursor", () => {
			const editor = vimEditor("Ae\u0301👩‍💻Z");
			editor.handleInput("$2X");
			expect(editor.getText()).toBe("AZ");
			expect(cursor(editor)).toEqual({ line: 0, col: 1 });
			editor.handleInput("u");
			expect(editor.getText()).toBe("Ae\u0301👩‍💻Z");
		});

		it("X stops at the beginning of the line without consuming the next command", () => {
			const editor = vimEditor("before\nafter");
			editor.handleInput("j0Xx");
			expect(editor.getText()).toBe("before\nfter");
		});

		it("counted S replaces whole lines even when started in the middle of a line", () => {
			const editor = vimEditor("one\ntwo\nthree");
			editor.handleInput("l2S");
			expect(editor.vimMode).toBe("insert");
			editor.handleInput("replacement");
			expect(editor.getText()).toBe("replacement\nthree");
		});

		it("Y yanks counted whole lines for a linewise put", () => {
			const editor = vimEditor("one\ntwo\nthree");
			editor.handleInput("l2YGp");
			expect(editor.getText()).toBe("one\ntwo\nthree\none\ntwo");
		});

		it("counted J strips continuation indentation and is one undoable edit", () => {
			const original = "one\n  two\n   three\nfour";
			const editor = vimEditor(original);
			editor.handleInput("3J");
			expect(editor.getText()).toBe("one two three\nfour");
			editor.handleInput("u");
			expect(editor.getText()).toBe(original);
		});

		it("J joins at least two lines even with a count of one", () => {
			const editor = vimEditor("one\ntwo\nthree");
			editor.handleInput("1J");
			expect(editor.getText()).toBe("one two\nthree");
		});

		it("Visual J joins only the selected logical lines", () => {
			const editor = vimEditor("keep\none\n  two\nthree");
			editor.handleInput("jvjlJ");
			expect(editor.getText()).toBe("keep\none two\nthree");
			expect(editor.vimMode).toBe("normal");
		});
	});

	describe("character-target motions", () => {
		it("counts backward F and T targets rather than cursor steps", () => {
			const editor = vimEditor("a:b:c:d");
			editor.handleInput("$2F:");
			expect(cursor(editor)).toEqual({ line: 0, col: 3 });
			editor.handleInput("$2T:");
			expect(cursor(editor)).toEqual({ line: 0, col: 4 });
		});

		for (const [commands, expected] of [
			["dfc", ":d"],
			["dtc", "c:d"],
			["$dFb", "a:d"],
			["$dTb", "a:bd"],
		]) {
			it(`${commands} respects the target-side operator endpoint`, () => {
				const editor = vimEditor("a:b:c:d");
				editor.handleInput(commands!);
				expect(editor.getText()).toBe(expected!);
			});
		}

		it("a missing counted target cancels a change rather than deleting a partial match", () => {
			const editor = vimEditor("a:b\nz");
			editor.handleInput("$2cF:");
			expect(editor.vimMode).toBe("normal");
			editor.handleInput("0x");
			expect(editor.getText()).toBe(":b\nz");
		});

		it("finds are line-local even when the next line contains the target", () => {
			const editor = vimEditor("abc\nz");
			editor.handleInput("dfzx");
			expect(editor.getText()).toBe("bc\nz");
		});

		it("accepts a digit as a literal target and leaves subsequent counts independent", () => {
			const editor = vimEditor("a1b1c1d");
			editor.handleInput("$2F1x");
			expect(editor.getText()).toBe("a1bc1d");
			editor.handleInput("2h");
			expect(cursor(editor)).toEqual({ line: 0, col: 1 });
		});

		it("finds an entire Unicode grapheme and deletes without splitting it", () => {
			const editor = vimEditor("a👩‍💻b👩‍💻c");
			editor.handleInput("$F");
			editor.handleInput("👩‍💻");
			editor.handleInput("x");
			expect(editor.getText()).toBe("a👩‍💻bc");
		});

		it("Escape cancels a pending operator target and releases Escape to the host", () => {
			const editor = vimEditor("abc");
			editor.handleInput("dF");
			expect(editor.vimConsumesEscape()).toBe(true);
			editor.handleInput(ESC);
			expect(editor.vimConsumesEscape()).toBe(false);
			editor.handleInput("x");
			expect(editor.getText()).toBe("bc");
		});

		it("semicolon repeats the last find and comma reverses it without changing its direction", () => {
			const editor = vimEditor("a,b,c,d");
			editor.handleInput("f,;");
			expect(cursor(editor)).toEqual({ line: 0, col: 3 });
			editor.handleInput(",");
			expect(cursor(editor)).toEqual({ line: 0, col: 1 });
			editor.handleInput(";");
			expect(cursor(editor)).toEqual({ line: 0, col: 3 });
		});

		it("repeated till motions advance past the adjacent previous target", () => {
			const editor = vimEditor("a,b,c,d");
			editor.handleInput("t,;");
			expect(cursor(editor)).toEqual({ line: 0, col: 2 });
			editor.handleInput(";");
			expect(cursor(editor)).toEqual({ line: 0, col: 4 });
		});

		it("Visual F includes the backward target and the original cursor", () => {
			const editor = vimEditor("a:b:c:d");
			editor.handleInput("$vFbd");
			expect(editor.getText()).toBe("a:");
		});
	});

	describe("Visual uppercase edits", () => {
		for (const command of ["D", "X"]) {
			it(`Visual ${command} deletes whole touched lines rather than the character span`, () => {
				const editor = vimEditor("keep\nalpha\nbeta\ntail");
				editor.handleInput(`jlvj${command}`);
				expect(editor.getText()).toBe("keep\ntail");
				expect(editor.vimMode).toBe("normal");
			});
		}

		for (const command of ["S", "C"]) {
			it(`Visual ${command} replaces whole touched lines and enters Insert`, () => {
				const editor = vimEditor("keep\nalpha\nbeta\ntail");
				editor.handleInput(`jlvj${command}`);
				expect(editor.vimMode).toBe("insert");
				editor.handleInput("new");
				expect(editor.getText()).toBe("keep\nnew\ntail");
			});
		}

		it("Visual Y yanks whole touched lines for a linewise put", () => {
			const editor = vimEditor("alpha\nbeta\ntail");
			editor.handleInput("lvjYGp");
			expect(editor.getText()).toBe("alpha\nbeta\ntail\nalpha\nbeta");
		});

		it("Visual O swaps the active endpoint so the next motion contracts the other end", () => {
			const editor = vimEditor("abcdef");
			editor.handleInput("vllOld");
			expect(editor.getText()).toBe("adef");
		});

		it("Visual P replaces the selection and preserves the source register for another put", () => {
			const editor = vimEditor("red blue green");
			editor.handleInput("yiwwviwP");
			expect(editor.getText()).toBe("red red green");
			expect(editor.vimMode).toBe("normal");
			editor.handleInput("$p");
			expect(editor.getText()).toBe("red red greenred");
		});

		it("Visual-line P replaces selected lines without retaining a blank or duplicating the source", () => {
			const editor = vimEditor("red\nblue\ngreen");
			editor.handleInput("YjVP");
			expect(editor.getText()).toBe("red\nred\ngreen");
			editor.handleInput("Gp");
			expect(editor.getText()).toBe("red\nred\ngreen\nred");
		});
	});

	describe("join spacing boundaries", () => {
		it("preserves an existing separator and does not add a space before a closing parenthesis", () => {
			const editor = vimEditor("one    \n  two\n)\nthree");
			editor.handleInput("4J");
			expect(editor.getText()).toBe("one    two) three");
		});

		it("joins empty lines without introducing extra separators", () => {
			const editor = vimEditor("one\n\n  two");
			editor.handleInput("3J");
			expect(editor.getText()).toBe("one two");
		});
	});

	describe("core command boundary regressions", () => {
		it("a characterwise newline-ending yank puts inside the target line", () => {
			const editor = vimEditor("ab\n\ncd");
			editor.handleInput("vjyGp");
			expect(editor.getText()).toBe("ab\n\ncab\nd");
		});

		it("Emacs yank-pop rotates Vim register shape together with identical register text", () => {
			const editor = vimEditor("ab\n\ncd");
			editor.handleInput("YvjyGi");
			editor.handleInput("\x19");
			editor.handleInput("\x1by");
			editor.handleInput(ESC);
			editor.handleInput("p");
			expect(editor.getText()).toBe("ab\n\nab\ncd\nab");
		});

		it("WORD yanks retain empty lines as complete linewise register entries", () => {
			const empty = vimEditor("\ndef");
			empty.handleInput("yWp");
			expect(empty.getText()).toBe("\n\ndef");
			const counted = vimEditor("abc\n\ndef");
			counted.handleInput("2yWp");
			expect(counted.getText()).toBe("abc\nabc\n\n\ndef");
		});

		it("counted WORD deletion promotes a multiline span starting in indentation", () => {
			const editor = vimEditor("   \ndef");
			editor.handleInput("$2dW");
			expect(editor.getText()).toBe("");
		});

		it("Visual P preserves the prefix line and indented linewise register geometry", () => {
			const editor = vimEditor("  red\nblue\ntail");
			editor.handleInput("YjvlP");
			expect(editor.getText()).toBe("  red\n\n  red\nue\ntail");
			expect(cursor(editor)).toEqual({ line: 2, col: 2 });
			editor.handleInput("x");
			expect(editor.getText()).toBe("  red\n\n  ed\nue\ntail");
		});

		it("Visual P with a multiline characterwise register lands at the start of the insertion", () => {
			const editor = vimEditor("abc\ndef\nghi");
			editor.handleInput("vjlyG0vlP");
			expect(editor.getText()).toBe("abc\ndef\nabc\ndei");
			expect(cursor(editor)).toEqual({ line: 2, col: 0 });
		});

		it("Normal Y keeps its cursor while filling a whole-line register", () => {
			const editor = vimEditor("  abc def\n  ghi jkl");
			editor.handleInput("lllY");
			expect(cursor(editor)).toEqual({ line: 0, col: 3 });
			editor.handleInput("p");
			expect(editor.getText()).toBe("  abc def\n  abc def\n  ghi jkl");
		});

		it("Visual P lands on the last inserted grapheme so an immediate put follows it", () => {
			const editor = vimEditor("red blue green");
			editor.handleInput("yiwwviwPp");
			expect(editor.getText()).toBe("red redred green");
		});

		it("a counted W yank ending at column zero stays a characterwise register", () => {
			const editor = vimEditor("a\nb\nc");
			editor.handleInput("2yWp");
			expect(editor.getText()).toBe("aa\nb\nb\nc");
		});

		it("a counted W delete from mid-line preserves the final empty-line boundary", () => {
			const editor = vimEditor("abc\n\ndef");
			editor.handleInput("$2dW");
			expect(editor.getText()).toBe("ab\ndef");
		});

		it("host prompt replacement cancels a pending find before editing the new text", () => {
			const editor = vimEditor("abc def");
			editor.handleInput("dF");
			editor.setText("new fresh");
			editor.handleInput("e");
			expect(editor.getText()).toBe("new fresh");
			expect(editor.vimPending).toBe("");
		});

		it("bracketed paste cancels a pending find before subsequent motions", () => {
			const editor = vimEditor("abc def");
			editor.handleInput("dF");
			editor.handleInput("\x1b[200~new\x1b[201~");
			const pasted = editor.getText();
			editor.handleInput("e");
			expect(editor.getText()).toBe(pasted);
			expect(editor.vimPending).toBe("");
		});

		it("dW and yW stop at the original line end without consuming blank continuation lines", () => {
			const editor = vimEditor("foo/bar\n   \nnext");
			editor.handleInput("yWdW");
			expect(editor.getText()).toBe("\n   \nnext");
			editor.handleInput("p");
			expect(editor.getText()).toBe("foo/bar\n   \nnext");
		});

		it("counted WORD deletion preserves only the original line's final newline", () => {
			const sameLine = vimEditor("ab cd\nef gh\nij");
			sameLine.handleInput("2dW");
			expect(sameLine.getText()).toBe("\nef gh\nij");
			const acrossLines = vimEditor("a\nb\nc");
			acrossLines.handleInput("2dW");
			expect(acrossLines.getText()).toBe("c");
		});

		it("cW treats an empty line as a changeable WORD and counts subsequent WORD ends", () => {
			const empty = vimEditor("\ndef ghi\njkl");
			empty.handleInput("cWnew");
			expect(empty.getText()).toBe("new\ndef ghi\njkl");
			const counted = vimEditor("\ndef ghi\njkl");
			counted.handleInput("3cWnew");
			expect(counted.getText()).toBe("new\njkl");
		});

		it("host control navigation cancels a pending operator without changing Normal mode", () => {
			const editor = vimEditor("abc def");
			editor.handleInput("$d");
			editor.handleInput("\x05");
			editor.handleInput("B");
			expect(editor.getText()).toBe("abc def");
			expect(cursor(editor)).toEqual({ line: 0, col: 4 });
			expect(editor.vimMode).toBe("normal");
		});

		it("host control navigation cancels a pending find while retaining Visual selection", () => {
			const editor = vimEditor("abc def");
			editor.handleInput("vF");
			editor.handleInput("\x05");
			editor.handleInput("B");
			expect(editor.vimMode).toBe("visual");
			expect(cursor(editor)).toEqual({ line: 0, col: 4 });
			editor.handleInput("d");
			expect(editor.getText()).toBe("ef");
		});

		it("cW on a one-grapheme WORD does not consume the following WORD", () => {
			const editor = vimEditor("x next.word");
			editor.handleInput("cWnew");
			expect(editor.getText()).toBe("new next.word");
		});

		it("multiplies operator and find counts before resolving a target", () => {
			const editor = vimEditor("a:b:c:d:e:f:g");
			editor.handleInput("2d2f:");
			expect(editor.getText()).toBe("e:f:g");
		});

		it("Visual R substitutes selected whole lines rather than entering Replace mode", () => {
			const editor = vimEditor("keep\nalpha\nbeta\ntail");
			editor.handleInput("jlvjR");
			expect(editor.vimMode).toBe("insert");
			editor.handleInput("new");
			expect(editor.getText()).toBe("keep\nnew\ntail");
		});

		it("J uses one separating space after sentence punctuation", () => {
			const editor = vimEditor("Done.\nNext!\nWhy?");
			editor.handleInput("3J");
			expect(editor.getText()).toBe("Done. Next! Why?");
		});
	});
});
