const question_block = {
    name: 'question_block',
    level: 'block',
    start(src) { return src.indexOf('@@@'); },
    tokenizer(src) {
        const match = /^@@@\s*Q([a-zA-Z0-9.]+)\s*\[(.*?)\]\n([\s\S]*?)\n@@@/.exec(src);
        if (match) {
            return {
                type: 'question_block',
                raw: match[0],
                number: match[1],
                marks: match[2],
                body: match[3]
            };
        }
    },
    renderer(token) {
        const body_html = this.parser.parse(marked.lexer(token.body));
        return `
            <div class="qpapermd-question-container">
                <div class="qpapermd-question-number">${token.number}.</div>
                <div class="qpapermd-question-body">${body_html}</div>
                <div class="qpapermd-question-marks">${token.marks}</div>
            </div>
        `;
    }
}

export default question_block;