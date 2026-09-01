const katex_inline = {
    name: 'katex_inline',
    level: 'inline',
    start(src) { return src.indexOf('$'); },
    tokenizer(src) {
        const match = /^\$((?:\\\$|[^\$])+?)\$/.exec(src);
        if (match) {
            return {
                type: 'katex_inline',
                raw: match[0],
                text: match[1]
            };
        }
    },
    renderer(token) {
        return katex.renderToString(token.text, {
            displayMode: false,
            throwOnError: false
        });
    }
}

export default katex_inline;