export default class CodeEditor {
    constructor({ input, highlight, content, onUpdate }) {
        this.input = document.querySelector(input);
        console.log(this.input);
        this.highlightWrapper = document.querySelector(highlight);
        this.code_view = document.querySelector(content);
        this.onUpdate = onUpdate;
        this.init_events();
    }

    init_events() {
        this.input.addEventListener('input', () => this.sync_view());
        this.input.addEventListener('keydown', (event) => {
            // One-click tidy up with 'Escape'
            if (event.key === "Escape") {
                event.preventDefault();
                this.auto_indent(); // Handled internally or wrapped if needed
                return;
            }

            // Keep indentation on 'Enter'
            if (event.key === "Enter") {
                event.preventDefault();

                const snapshot = this.save_cursor();
                const val = this.input.value;

                const text_before_cursor = val.substring(0, snapshot.start);
                const line_start_index = text_before_cursor.lastIndexOf('\n') + 1;
                const current_line = text_before_cursor.substring(line_start_index);

                const whitespace_match = current_line.match(/^[\t ]*/);
                let inherited_whitespace = whitespace_match ? whitespace_match[0] : '';

                const trimmed_line = current_line.trim();
                const ends_with_open_tag = /<[^\/!][^>]*[^\/]>$/.test(trimmed_line);
                const is_inline_pair = /^<([A-Za-z0-9_-]+)[^>]*>[^<]*<\/\1>$/.test(trimmed_line);

                if (ends_with_open_tag && !is_inline_pair) {
                    inherited_whitespace += '\t';
                }

                const injection = '\n' + inherited_whitespace;
                this.input.value = val.substring(0, snapshot.start) + injection + val.substring(snapshot.end);

                // Adjust the snapshot position forward by the length of our newline injection
                snapshot.start += injection.length;
                snapshot.end = snapshot.start;

                this.sync_view();
                this.restore_cursor(snapshot);
                return;
            }

            // Tab Interception
            if (event.key === "Tab") {
                event.preventDefault();

                const snapshot = this.save_cursor();
                const val = this.input.value;

                this.input.value = val.substring(0, snapshot.start) + "\t" + val.substring(snapshot.end);

                // Advance cursor position by exactly 1 character for the tab character slot
                snapshot.start += 1;
                snapshot.end = snapshot.start;

                this.sync_view();
                this.restore_cursor(snapshot);
            }
        });
    }

    highlight_XML(raw_text) {
        // Clear the previous highlight tree completely
        this.code_view.textContent = "";

        // Comprehensive regex to isolate tags cleanly without modifying them
        const tokenRegex = /(<\/?[A-Za-z0-9_-]+(?:(?:\s+[A-Za-z0-9_-]+(?:=(?:"[^"]*"|'[^']*'))?)*)\s*\/?>)/g;
        const parts = raw_text.split(tokenRegex);

        parts.forEach(part => {
            if (!part) return;

            // If it's a tag, break down its components internally for coloring
            if (part.startsWith('<') && part.endsWith('>')) {
                const tagContainer = document.createElement('span');
                tagContainer.className = 'xml-tag';

                // Regex to find attributes: group 1 is " attr=", group 2 is "value"
                const attrRegex = /(\s+[A-Za-z0-9_-]+=)("[^"]*"|'[^']*')/g;
                let lastIndex = 0;
                let match;

                while ((match = attrRegex.exec(part)) !== null) {
                    // Append the tag text before the attribute (like "<XML" or space)
                    if (match.index > lastIndex) {
                        const plainPart = part.substring(lastIndex, match.index);
                        tagContainer.appendChild(document.createTextNode(plainPart));
                    }

                    // Append the colored attribute name (e.g., ' type=')
                    const attrNameSpan = document.createElement('span');
                    attrNameSpan.className = 'xml-attr';
                    attrNameSpan.textContent = match[1];
                    tagContainer.appendChild(attrNameSpan);

                    // Append the colored attribute value (e.g., '"mcq"')
                    const attrValSpan = document.createElement('span');
                    attrValSpan.className = 'xml-val';
                    attrValSpan.textContent = match[2];
                    tagContainer.appendChild(attrValSpan);

                    lastIndex = attrRegex.lastIndex;
                }

                // Append any remaining tag characters (like the closing '>')
                if (lastIndex < part.length) {
                    const remainingText = part.substring(lastIndex);
                    tagContainer.appendChild(document.createTextNode(remainingText));
                }

                this.code_view.appendChild(tagContainer);
            } else {
                // Out-of-tag text nodes or standard text formatting spacing blocks
                // textContent/createTextNode guarantees 100% pure, unmutated character mapping
                this.code_view.appendChild(document.createTextNode(part));
            }
        });
    }

    sync_view() {
        const val = this.input.value;
        this.highlight_XML(val);
        if (this.onUpdate) this.onUpdate(val);
    }

    get_value() {
        return this.input.value;
    }

    set_value(text) {
        this.input.value = text;
        this.sync_view();
        this.input.scrollTop = 0;
        this.input.scrollLeft = 0;
        this.highlightWrapper.scrollTop = 0;
        this.highlightWrapper.scrollLeft = 0;
    }

    save_cursor() {
        return {
            start: this.input.selectionStart,
            end: this.input.selectionEnd
        };
    }

    restore_cursor(snapshot) {
        this.input.focus();
        this.input.setSelectionRange(snapshot.start, snapshot.end);
    }

    auto_indent() {
        const input = this.input;

        // Snapshot cursor position and current text
        const original_selection_start = input.selectionStart;
        const original_value = input.value;

        // We need to track the character position of the cursor relative to the text content
        // to map it properly after line-splitting inserts new line characters.
        let cursorCharIndex = original_selection_start;

        const rawLines = original_value.split('\n');
        const expanded_lines = [];

        // --- Pass 1: Smart Line Splitting (Only expand nested tags) ---
        rawLines.forEach((line, lineIndex) => {
            const trimmed = line.trim();

            // Check if this line contains nested children elements (e.g., <Section><Title>...)
            // We match if there are multiple tags, and it's NOT a single flat pair like <Tag>Text</Tag>
            const tags = trimmed.match(/<[^>]+>/g) || [];
            const is_single_inline_pair = /^<([A-Za-z0-9_-]+)[^>]*>[^<]*<\/\1>$/.test(trimmed);

            if (tags.length > 2 && !is_single_inline_pair) {
                // It has nested tags on one line! Let's carefully insert breaks between tags
                let line_remainder = line;
                let current_offset = 0;

                // Regex to match structural tag boundaries safely
                const splitting_regex = /(<[^>]+>)/g;
                const pieces = line_remainder.split(splitting_regex);

                pieces.forEach(piece => {
                    const clean_piece = piece.trim();
                    if (!clean_piece) return;

                    expanded_lines.push(clean_piece);

                    // If the cursor was inside this specific piece during the split,
                    // we calculate how many newlines we're inserting to adjust the cursor.
                    // (Handled holistically below by tracking line text shifts)
                });
            } else {
                // It's a flat data line, an empty line, or a single tag. Keep it exactly as is.
                expanded_lines.push(line);
            }
        });

        // --- Pass 2: Precise Indentation and Cursor Mapping ---
        let indent_level = 0;
        const tab = '\t';
        const indented_lines = [];

        // To cleanly map the cursor, we'll rebuild the string character by character 
        // up to the original cursor position, watching how the text shapes shift.
        let old_text_analyzed = 0;
        let new_text_built = 0;
        let final_cursor_position = 0;
        let is_cursor_positioned = false;

        expanded_lines.forEach((line) => {
            const trimmed_line = line.trim();

            if (!trimmed_line) {
                indented_lines.push('');
                // Track background structural character consumption
                if (!is_cursor_positioned) {
                    const old_line_length = (rawLines[indented_lines.length - 1] || '').length + 1;
                    old_text_analyzed += old_line_length;
                    new_text_built += 1;
                }
                return;
            }

            const has_closing_tag_at_start = /^<\/\w/.test(trimmed_line);
            const all_tags = trimmed_line.match(/<[^>]+>/g) || [];

            let net_line_change = 0;
            let selfcontained_inline = /^<([A-Za-z0-9_-]+)[^>]*>.*<\/\1>$/.test(trimmed_line);

            if (!selfcontained_inline) {
                all_tags.forEach(tag => {
                    if (tag.startsWith('</')) net_line_change--;
                    else if (!tag.endsWith('/>')) net_line_change++;
                });
            }

            if (has_closing_tag_at_start && net_line_change < 0) {
                indent_level = Math.max(0, indent_level + net_line_change);
            }

            const new_line = tab.repeat(indent_level) + trimmed_line;
            indented_lines.push(new_line);

            // Map cursor vectors relative to whitespace changes dynamically
            if (!is_cursor_positioned) {
                // Approximate matching based on tracking raw text stream consumption
                const original_line_text = trimmed_line; // Content remains constant
                const original_line_with_whitespace = line;

                old_text_analyzed += original_line_with_whitespace.length + 1; // +1 for newline
                new_text_built += new_line.length + 1;

                if (old_text_analyzed >= original_selection_start) {
                    // The cursor falls inside or immediately after this processed block
                    const structural_overrun = old_text_analyzed - original_selection_start;
                    final_cursor_position = new_text_built - structural_overrun;
                    is_cursor_positioned = true;
                }
            }

            if (!has_closing_tag_at_start && net_line_change > 0) {
                indent_level += net_line_change;
            } else if (!has_closing_tag_at_start && net_line_change < 0) {
                indent_level = Math.max(0, indent_level + net_line_change);
            }
        });

        // Save the clean structural code block back into the workspace
        this.set_value(indented_lines.join('\n'));

        // Restore selection focus exactly where it belongs without jumping
        if (!is_cursor_positioned) final_cursor_position = input.value.length;
        final_cursor_position = Math.max(0, Math.min(final_cursor_position, input.value.length));

        input.focus();
        input.setSelectionRange(final_cursor_position, final_cursor_position);
    }
}