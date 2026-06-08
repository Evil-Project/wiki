import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Heading2, Italic, List, ListOrdered, Redo2, Undo2 } from "lucide-react";
import { useEffect, useRef } from "react";

interface WikiEditorProps {
  value: string;
  onChange: (value: string) => void;
}

function WikiEditor({ value, onChange }: WikiEditorProps) {
  const lastSyncedValue = useRef(value);
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    editorProps: {
      attributes: {
        class: "editor-surface",
        "aria-label": "Page body editor",
      },
    },
    onUpdate: ({ editor }) => {
      const nextValue = editor.getHTML();
      lastSyncedValue.current = nextValue;
      onChange(nextValue);
    },
  });

  useEffect(() => {
    if (editor && !editor.isDestroyed && value !== lastSyncedValue.current) {
      lastSyncedValue.current = value;
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) {
    return <div className="editor-loading">Loading editor</div>;
  }

  return (
    <div className="editor-shell">
      <div className="editor-toolbar" aria-label="Editor toolbar">
        <button
          type="button"
          aria-label="Bold"
          title="Bold"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={16} />
        </button>
        <button
          type="button"
          aria-label="Italic"
          title="Italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={16} />
        </button>
        <button
          type="button"
          aria-label="Heading"
          title="Heading"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 size={16} />
        </button>
        <button
          type="button"
          aria-label="Bullet list"
          title="Bullet list"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={16} />
        </button>
        <button
          type="button"
          aria-label="Numbered list"
          title="Numbered list"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={16} />
        </button>
        <button
          type="button"
          aria-label="Undo"
          title="Undo"
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 size={16} />
        </button>
        <button
          type="button"
          aria-label="Redo"
          title="Redo"
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 size={16} />
        </button>
      </div>
      <EditorContent editor={editor} />
      <p className="editor-hint">
        Use rich text controls or type wiki links such as <code>[[Main Page]]</code>.
      </p>
    </div>
  );
}

export default WikiEditor;
