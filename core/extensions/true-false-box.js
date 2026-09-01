const true_false_box = {
    name: 'true_false_box',
    level: 'inline',
    start(src) { return src.indexOf('[T/F]'); },
    tokenizer(src) {
        const match = /^\[T\/F\]/.exec(src);
        if (match) {
            return {
                type: 'true_false_box',
                raw: match[0]
            };
        }
    },
    renderer(token) {
        return `<span class="true-false-box"></span>`;
    }
}

export default true_false_box;