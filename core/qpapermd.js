import section_block from './extensions/section-block.js';
import question_block from './extensions/question-block.js';
import mcq_options_block from './extensions/mcq-option-block.js';
import true_false_box from './extensions/true-false-box.js';
import answer_space from './extensions/answer-space.js';

import katex_inline from './extensions/katex-inline.js';
import katex_block from './extensions/katex-block.js';

const dom_parser = new DOMParser();

marked.use({
    extensions: [
        katex_inline,
        katex_block,
        question_block,
        mcq_options_block,
        section_block,
        true_false_box,
        answer_space
    ]
});

const QPaperMD = {
    parse: function (text) {
        return dom_parser.parseFromString(marked.parse(text), "text/html");
    }
}

export default QPaperMD;