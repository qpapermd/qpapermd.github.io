const section_block = {
    name: 'section_block',
    level: 'block',
    start(src) { return src.indexOf('@section'); },
    tokenizer(src) {
        // Matches: @section [marks] Title
        const match = /^@section\s*\[(.*?)\]\s*(.*?)(?:\n|$)/.exec(src);
        if (match) {
            return {
                type: 'section_block',
                raw: match[0],
                marks: match[1].trim(),
                title: match[2]
            };
        }
    },
    renderer(token) {
        const title_html = marked.parseInline(token.title);
        const marks_html = token.marks ? marked.parseInline(token.marks) : '';

        return `
            <div class="qpapermd-section-header">
                <h2 class="qpapermd-section-title">${title_html}</h2>
                <span class="qpapermd-section-marks">${marks_html}</span>
            </div>
        `;
    }
}

export default section_block;