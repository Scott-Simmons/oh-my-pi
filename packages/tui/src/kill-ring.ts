/**
 * Ring buffer for Emacs-style kill/yank operations.
 *
 * Tracks killed (deleted) text entries. Consecutive kills can accumulate
 * into a single entry. Supports yank (paste most recent) and yank-pop
 * (cycle through older entries).
 */
const MAX_ENTRIES = 60;

export interface KillRingEntry {
	readonly text: string;
	readonly linewise: boolean;
}

export class KillRing {
	#ring: KillRingEntry[] = [];

	/**
	 * Add text to the kill ring.
	 *
	 * @param text - The killed text to add
	 * @param opts - Push options
	 * @param opts.prepend - If accumulating, prepend (backward deletion) or append (forward deletion)
	 * @param opts.accumulate - Merge with the most recent entry instead of creating a new one
	 * @param opts.linewise - Whole-line Vim payload including its terminating newline; defaults to characterwise
	 */
	push(text: string, opts: { prepend: boolean; accumulate?: boolean; linewise?: boolean }): void {
		if (!text) return;

		if (opts.accumulate && this.#ring.length > 0) {
			const last = this.#ring.pop()!;
			this.#ring.push({
				text: opts.prepend ? text + last.text : last.text + text,
				linewise: last.linewise && (opts.linewise ?? false),
			});
		} else {
			this.#ring.push({ text, linewise: opts.linewise ?? false });
			if (this.#ring.length > MAX_ENTRIES) {
				this.#ring.shift();
			}
		}
	}

	/** Get most recent entry without modifying the ring. */
	peek(): string | undefined {
		return this.peekEntry()?.text;
	}

	/** Most recent text and its Vim register shape; rotation keeps the two together. */
	peekEntry(): KillRingEntry | undefined {
		return this.#ring.at(-1);
	}

	/** Move last entry to front (for yank-pop cycling). */
	rotate(): void {
		if (this.#ring.length > 1) {
			const last = this.#ring.pop()!;
			this.#ring.unshift(last);
		}
	}

	get length(): number {
		return this.#ring.length;
	}
}
