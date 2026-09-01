const mcq_options_block = {
    name: 'mcq_options_block',
    level: 'block',
    start(src) {
        return src.indexOf('@options');
    },
    tokenizer(src) {
        // Match the @options block till the closing @endoptions
        const match = /^@options(?:[ \t]+([^\r\n]*))?\r?\n([\s\S]*?)\r?\n@endoptions(?:\r?\n|$)/.exec(src);
        if (match) {
            const raw_body = match[2];

            // Split options by lines starting with @option
            const option_items = raw_body
                .split(/^@option\s+/m)
                .map(item => item)
                .filter(Boolean);

            return {
                type: 'mcq_options_block',
                raw: match[0],
                options: option_items,
                classes: match[1] ? match[1].trim() : ""
            };
        }
    },
    renderer(token) {
        const options_html = token.options.map(option => {
            const parsed_option = marked.parseInline(option);
            return `<div class="qpapermd-mcq-option">${parsed_option}</div>`;
        }).join('');
        return `<div class="qpapermd-mcq-options-container ${token.classes}">${options_html}</div>`;
    }
}

export default mcq_options_block;