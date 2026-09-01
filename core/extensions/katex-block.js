const katex_block = {
    name: 'katex_block',
    level: 'block',
    start(src) { return src.indexOf('$$'); },
    tokenizer(src) {
        const match = /^\$\$([\s\S]+?)\$\$(?:\n|$)/.exec(src);
        if (match) {
            return {
                type: 'katex_block',
                raw: match[0],
                text: match[1]
            };
        }
    },
    renderer(token) {
        return katex.renderToString(token.text, {
            displayMode: true,
            throwOnError: false
        });
    }
}

export default katex_block;