import QPaperMD from './core/qpapermd.js';
import CodeEditor from './core/editor.js';

window.QPaperMD = QPaperMD;

document.addEventListener('DOMContentLoaded', () => {
    window.editor = new CodeEditor({
        input: "#code-input",
        highlight: "#code-highlight",
        content: "#code-content",
        onUpdate: (text_content) => {
            FileHandler.set_markdown_file_save_state(false);
        }
    });
    FileHandler.markdown_filename_display = document.getElementById("markdown-filename-display");
    FileHandler.html_filename_display = document.getElementById("html-filename-display");
    FileHandler.page_logo = document.querySelector("#top-bar>h2");
    document.addEventListener("keydown", (event) => {
        console.log(event);
        const is_modifier = event.ctrlKey || event.metaKey;
        if (!is_modifier) return;
        let key = event.key.toLowerCase();
        if (key === 's') {
            event.preventDefault(); // Prevent default browser "Save Page As" dialog
            if (event.shiftKey) {
                // Ctrl+Shift+S / Cmd+Shift+S -> Save Markdown As...
                FileHandler.save_markdown_file_as(editor);
            } else {
                // Ctrl+S / Cmd+S -> Standard Save
                FileHandler.save_files(editor);
            }
        }
        if (key === 'e') {
            event.preventDefault(); // Prevent default browser actions (e.g., focusing search bar)
            if (event.shiftKey) {
                // Ctrl+Shift+E -> Export HTML As...
                FileHandler.export_html_file_as(editor);
            } else {
                // Ctrl+E -> Export HTML
                FileHandler.export_html_file(editor);
            }
        }
        if (key === 'o') {
            event.preventDefault();
            FileHandler.open_markdown_file(editor);
        }
    });
    window.addEventListener('beforeunload', (event) => {
        if (window.FileHandler.is_file_saved) return;
        event.preventDefault();
        event.returnValue = '';
    });
});

class FileHandler {
    static markdown_file_handle = null;
    static html_file_handle = null;
    static markdown_filename_display = null;
    static html_filename_display = null;
    static page_logo = null;
    static is_file_saved = true;

    static set_markdown_file_handle(handle) {
        this.markdown_file_handle = handle;
        if (this.markdown_filename_display) {
            this.markdown_filename_display.innerText = handle.name;
        }
    }

    static set_html_file_handle(handle) {
        this.html_file_handle = handle;
        if (this.html_filename_display) {
            this.html_filename_display.innerText = handle.name;
        }
    }

    static set_markdown_file_save_state(bool) {
        this.is_file_saved = bool ? true : false;
        if (this.page_logo) {
            if (bool) {
                this.page_logo.classList.remove("unsaved");
                document.title = "QPaperMD";
            }
            else {
                this.page_logo.classList.add("unsaved");
                document.title = "QPaperMD*";
            }
        }
    }

    // Helper to format/beautify raw HTML
    static beautify_html(raw_html) {
        // Requires beautify-html.min.js loaded in index.html
        return html_beautify(raw_html, {
            indent_size: 2,
            wrap_line_length: 80,
            unformatted: ['code', 'pre', 'span']
        }) || raw_html;
    }

    // Helper to write content directly to disk using a FileSystemFileHandle
    static async write_to_handle(handle, content, fallback_filename, mime_type) {
        if (handle && 'createWritable' in handle) {
            try {
                const writable = await handle.createWritable();
                await writable.write(content);
                await writable.close();
                return true; // Successfully saved directly to file system
            } catch (err) {
                console.warn('Native write failed, falling back to download:', err);
            }
        }
        // Fallback: Trigger browser download if handle is null, unsupported, or threw an error
        const filename = handle ? handle.name : fallback_filename;
        download_file_fallback(content, filename, mime_type);
        return false; // Saved via download fallback
    }

    static download_file_fallback(content, filename, mime_type = 'text/plain') {
        // Create a Blob with the content and specified type
        const blob = new Blob([content], { type: `${mime_type};charset=utf-8` });
        const url = URL.createObjectURL(blob);

        // Create a temporary <a> element to trigger download
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;

        // Append, trigger click, and clean up
        document.body.appendChild(link);
        link.click();

        // Remove element and revoke object URL to free memory
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // Helper to prompt user for a file save location
    static async prompt_for_save_handle(suggested_name, extension, mime_type) {
        if (!window.showSaveFilePicker) return null;
        return await window.showSaveFilePicker({
            suggestedName: suggested_name,
            types: [{
                description: `${extension.toUpperCase()} File`,
                accept: { [mime_type]: [`.${extension}`] }
            }]
        });
    }

    // Open local Markdown file, load text, and store its handle
    static async open_markdown_file(editor) {
        try {
            if (!this.is_file_saved) {
                if (!confirm("Do you want to discard current edits?")) return;
            }
            if (!window.showOpenFilePicker) {
                this.open_markdown_file_fallback(editor);
                return;
            }
            const [handle] = await window.showOpenFilePicker({
                types: [{
                    description: 'Markdown Files',
                    accept: { 'text/markdown': ['.md', '.txt'] }
                }]
            });

            this.set_markdown_file_handle(handle);
            const file = await handle.getFile();
            const text = await file.text();
            editor.set_value(text);
            FileHandler.set_markdown_file_save_state(true);
            if (this.markdown_filename_display) {
                this.markdown_filename_display.innerText = handle.name;
            }
        } catch (err) {
            if (err.name !== 'AbortError') console.error('Error opening file:', err);
        }
    }

    static open_markdown_file_fallback(editor) {
        // Create a hidden input element
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.md'; // Adjust accepted extensions as needed

        // Listen for file selection
        input.onchange = (event) => {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            // Read content and append to editor
            reader.onload = (e) => {
                const content = e.target.result;
                editor.set_value(content);
            };
            reader.onerror = (err) => {
                console.error('Error reading file:', err);
            };
            reader.readAsText(file);
        };
        // Programmatically trigger the file chooser dialog
        input.click();
    }

    static package_html(raw_html) {
        return `<!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Question Paper</title>
                    <link rel="stylesheet" href="qpaper.css">
                </head>
                <body>${raw_html}</body>
                </html>`;
    }

    // Export beautified HTML file
    static async export_html_file(editor) {
        try {
            if (!this.html_file_handle) {
                this.export_html_file_as(editor);
                return;
            }
            const raw_html = marked.parse(editor.get_value());
            const packaged_html = this.package_html(raw_html);
            const pretty_html = this.beautify_html(packaged_html);
            await this.write_to_handle(this.html_file_handle, pretty_html);
        } catch (err) {
            if (err.name !== 'AbortError') console.error('Error in export_html_file:', err);
        }
    }

    // Export HTML As...
    static async export_html_file_as(editor) {
        try {
            const raw_html = marked.parse(editor.get_value());
            const packaged_html = this.package_html(raw_html);
            const pretty_html = this.beautify_html(packaged_html);
            this.set_html_file_handle(await this.prompt_for_save_handle('paper.html', 'html', 'text/html'));
            await this.write_to_handle(this.html_file_handle, pretty_html);
        } catch (err) {
            if (err.name !== 'AbortError') console.error('Error in export_html_file_as:', err);
        }
    }

    static async save_markdown_file(editor) {
        try {
            if (!this.markdown_file_handle) {
                this.save_markdown_file_as(editor);
                return;
            }
            const md_text = editor.get_value();
            await this.write_to_handle(this.markdown_file_handle, md_text);
            FileHandler.set_markdown_file_save_state(true);
        } catch (err) {
            if (err.name !== 'AbortError') console.error('Error in save_markdown_file:', err);
        }
    }

    // Save Markdown As... (ALWAYS prompts for new location and rebinds md_file_handle)
    static async save_markdown_file_as(editor) {
        try {
            const md_text = editor.get_value();
            this.set_markdown_file_handle(await this.prompt_for_save_handle('paper.md', 'md', 'text/markdown'));
            await this.write_to_handle(this.markdown_file_handle, md_text);
            FileHandler.set_markdown_file_save_state(true);
        } catch (err) {
            if (err.name !== 'AbortError') console.error('Error in save_markdown_file_as:', err);
        }
    }

    // Standard Save (Prompts ONLY for Markdown if handle missing)
    static async save_files(editor) {
        const md_text = editor.get_value();

        try {
            this.save_markdown_file(editor);
            if (this.html_file_handle) {
                this.export_html_file(editor);
            }

        } catch (err) {
            if (err.name !== 'AbortError') console.error('Error during save_files:', err);
        }
    }

    // Display beautified HTML inside #output
    /*static render_beautified_html(text) {
        const raw_html = marked.parse(text);
        const packaged_html = FileHandler.package_html(raw_html);
        const pretty_html = FileHandler.beautify_html(packaged_html);
        document.getElementById('output').textContent = pretty_html;
    }*/
}

window.FileHandler = FileHandler;