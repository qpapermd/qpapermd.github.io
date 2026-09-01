const answer_space = {
    name: 'answer_space',
    level: 'block',
    start(src) {
        const match = /(?:^|\n)(.+?)___\[\d+\]/.exec(src);
        return match ? match.index + (match[0].startsWith('\n') ? 1 : 0) : -1;
    },
    tokenizer(src) {
        // Capture Label___[lines]
        const match = /^(.+?)___\[(\d+)\](?:\n|$)/.exec(src);
        if (match) {
            return {
                type: 'answer_space',
                raw: match[0],
                label: match[1],
                lines: +match[2]
            };
        }
    },
    renderer(token) {
        const label_html = marked.parseInline(token.label, this.parser.options);
        let lines_html = `<div class="answer-line">${label_html}</div>`;

        for (let i = 1; i < token.lines; i++) {
            lines_html += '<div class="answer-line"></div>';
        }

        return `<div class="answer-space">${lines_html}</div>`;
    }
}

export default answer_space;