"use client";

import { useState, useCallback, useMemo } from "react";
import { FileCode, Eye, Edit, Split, Copy, Check } from "lucide-react";
import DOMPurify from "dompurify";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWidgetStore } from "@/stores/widget-store";
import type { Widget } from "@/types/widget";

interface MarkdownPreviewWidgetProps {
  widget: Widget;
}

type ViewMode = "edit" | "preview" | "split";

/**
 * DOMPurify configuration for markdown preview
 * Allows safe HTML tags commonly used in markdown while blocking dangerous content
 */
const DOMPURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr',
    'ul', 'ol', 'li',
    'blockquote',
    'pre', 'code',
    'a',
    'strong', 'b', 'em', 'i', 'del', 's',
    'span', 'div',
  ],
  ALLOWED_ATTR: [
    'href', 'target', 'rel', 'class',
  ],
  ALLOW_DATA_ATTR: false,
  // Force all links to open in new tab with security attributes
  ADD_ATTR: ['target', 'rel'],
};

/**
 * Parse markdown to HTML with DOMPurify sanitization
 * This ensures all output is safe from XSS attacks
 */
function parseMarkdown(markdown: string): string {
  let html = markdown;

  // Escape HTML entities first to prevent raw HTML injection
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Headers (h1-h6)
  html = html.replace(/^######\s+(.+)$/gm, "<h6>$1</h6>");
  html = html.replace(/^#####\s+(.+)$/gm, "<h5>$1</h5>");
  html = html.replace(/^####\s+(.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^##\s+(.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^#\s+(.+)$/gm, "<h1>$1</h1>");

  // Horizontal rules
  html = html.replace(/^---+$/gm, "<hr />");
  html = html.replace(/^\*\*\*+$/gm, "<hr />");

  // Code blocks (must come before inline code)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    // Sanitize the language class to prevent class injection
    const safeClass = lang ? `language-${lang.replace(/[^a-zA-Z0-9-]/g, '')}` : '';
    return `<pre><code class="${safeClass}">${code}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Bold (must come before italic)
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/___(.+?)___/g, "<strong><em>$1</em></strong>");
  html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");

  // Italic
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/_(.+?)_/g, "<em>$1</em>");

  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, "<del>$1</del>");

  // Links - validate URL before creating link
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
    // Decode and check for javascript: protocol
    const decodedUrl = url.replace(/&amp;/g, '&');
    if (decodedUrl.toLowerCase().startsWith('javascript:') ||
        decodedUrl.toLowerCase().startsWith('data:') ||
        decodedUrl.toLowerCase().startsWith('vbscript:')) {
      return text; // Return just the text without link for dangerous protocols
    }
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  });

  // Blockquotes (process line by line)
  const lines = html.split("\n");
  const processed: string[] = [];
  let inBlockquote = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("&gt; ")) {
      if (!inBlockquote) {
        processed.push("<blockquote>");
        inBlockquote = true;
      }
      processed.push(line.substring(5));
    } else {
      if (inBlockquote) {
        processed.push("</blockquote>");
        inBlockquote = false;
      }
      processed.push(line);
    }
  }
  if (inBlockquote) {
    processed.push("</blockquote>");
  }
  html = processed.join("\n");

  // Unordered lists
  html = html.replace(/^\*\s+(.+)$/gm, "<li>$1</li>");
  html = html.replace(/^-\s+(.+)$/gm, "<li>$1</li>");
  html = html.replace(/^(\+)\s+(.+)$/gm, "<li>$2</li>");

  // Ordered lists
  html = html.replace(/^\d+\.\s+(.+)$/gm, "<li>$1</li>");

  // Wrap consecutive <li> in <ul> or <ol>
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => {
    return `<ul>${match}</ul>`;
  });

  // Paragraphs (wrap text that isn't already in a tag)
  const paragraphs = html.split("\n\n");
  html = paragraphs
    .map((para) => {
      para = para.trim();
      if (!para) return "";
      // Don't wrap if already in a block element
      if (
        para.startsWith("<h") ||
        para.startsWith("<ul") ||
        para.startsWith("<ol") ||
        para.startsWith("<pre") ||
        para.startsWith("<blockquote") ||
        para.startsWith("<hr")
      ) {
        return para;
      }
      return `<p>${para}</p>`;
    })
    .join("\n");

  // Clean up extra newlines
  html = html.replace(/\n{3,}/g, "\n\n");

  // Final sanitization pass with DOMPurify to ensure safety
  // This catches any edge cases our regex might miss
  return DOMPurify.sanitize(html, DOMPURIFY_CONFIG);
}

export function MarkdownPreviewWidget({ widget }: MarkdownPreviewWidgetProps) {
  // Note: Use getState() for updateWidget to prevent re-render loops

  const [viewMode, setViewMode] = useState<ViewMode>(
    (widget.config?.previewMode as ViewMode) || "edit"
  );
  const [content, setContent] = useState<string>(
    (widget.config?.markdownContent as string) || "# Welcome to Markdown Preview\n\nStart typing to see your **markdown** rendered in real-time!\n\n## Features\n\n- Headers\n- **Bold** and *italic* text\n- ~~Strikethrough~~\n- [Links](https://example.com)\n- `inline code`\n- Code blocks\n\n```javascript\nfunction hello() {\n  console.log('Hello, world!');\n}\n```\n\n> Blockquotes for emphasis\n\n---\n\nEnjoy!"
  );
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // Auto-save content to config
  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent);
      useWidgetStore.getState().updateWidget(widget.id, { config: { ...widget.config, markdownContent: newContent } });
    },
    [widget.id, widget.config]
  );

  // Save view mode to config
  const handleViewModeChange = useCallback(
    (mode: ViewMode) => {
      setViewMode(mode);
      useWidgetStore.getState().updateWidget(widget.id, { config: { ...widget.config, previewMode: mode } });
    },
    [widget.id, widget.config]
  );

  const htmlContent = useMemo(() => parseMarkdown(content), [content]);

  const copyMarkdown = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2000);
  }, [content]);

  const copyPlainText = useCallback(async () => {
    // Strip HTML tags for plain text
    const div = document.createElement("div");
    div.innerHTML = htmlContent;
    const text = div.textContent || div.innerText || "";
    await navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  }, [htmlContent]);

  const renderPreview = () => (
    <ScrollArea className="h-full w-full">
      <div
        className="markdown-preview prose prose-sm dark:prose-invert max-w-none p-4 @container"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </ScrollArea>
  );

  const renderEditor = () => (
    <Textarea
      value={content}
      onChange={(e) => handleContentChange(e.target.value)}
      placeholder="Enter your markdown here..."
      className="h-full w-full resize-none border-0 focus-visible:ring-0 font-mono text-sm @container"
    />
  );

  return (
    <div className="flex h-full w-full flex-col @container">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-background/50 px-3 py-2 @xs:px-4">
        <div className="flex items-center gap-2">
          <FileCode className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium hidden @xs:inline">Markdown Preview</span>
        </div>

        <div className="flex items-center gap-1">
          {/* View mode toggles */}
          <div className="flex items-center gap-0.5 rounded-md border bg-background p-0.5">
            <Button
              variant={viewMode === "edit" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handleViewModeChange("edit")}
              className="h-7 px-2"
              title="Edit Mode"
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === "split" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handleViewModeChange("split")}
              className="h-7 px-2"
              title="Split Mode"
            >
              <Split className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === "preview" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handleViewModeChange("preview")}
              className="h-7 px-2"
              title="Preview Mode"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Copy buttons */}
          <Button
            variant="ghost"
            size="sm"
            onClick={copyMarkdown}
            className="h-7 px-2 hidden @sm:flex"
            title="Copy Markdown"
          >
            {copiedMarkdown ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyPlainText}
            className="h-7 px-2 hidden @sm:flex"
            title="Copy Plain Text"
          >
            {copiedText ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === "edit" && renderEditor()}
        {viewMode === "preview" && renderPreview()}
        {viewMode === "split" && (
          <div className="flex h-full w-full @container">
            <div className="w-full @lg:w-1/2 border-r">
              {renderEditor()}
            </div>
            <div className="hidden @lg:block @lg:w-1/2">
              {renderPreview()}
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .markdown-preview h1 {
          font-size: 1.875rem;
          font-weight: 700;
          margin-top: 0;
          margin-bottom: 1rem;
          line-height: 1.25;
        }
        .markdown-preview h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          line-height: 1.3;
        }
        .markdown-preview h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
        }
        .markdown-preview h4 {
          font-size: 1.125rem;
          font-weight: 600;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }
        .markdown-preview h5 {
          font-size: 1rem;
          font-weight: 600;
          margin-top: 0.75rem;
          margin-bottom: 0.5rem;
        }
        .markdown-preview h6 {
          font-size: 0.875rem;
          font-weight: 600;
          margin-top: 0.75rem;
          margin-bottom: 0.5rem;
          color: hsl(var(--muted-foreground));
        }
        .markdown-preview p {
          margin-top: 0;
          margin-bottom: 1rem;
          line-height: 1.75;
        }
        .markdown-preview a {
          color: hsl(var(--primary));
          text-decoration: underline;
          font-weight: 500;
        }
        .markdown-preview a:hover {
          color: hsl(var(--primary) / 0.8);
        }
        .markdown-preview strong {
          font-weight: 600;
        }
        .markdown-preview em {
          font-style: italic;
        }
        .markdown-preview del {
          text-decoration: line-through;
          opacity: 0.7;
        }
        .markdown-preview code {
          background: hsl(var(--muted));
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-size: 0.875em;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }
        .markdown-preview pre {
          background: hsl(var(--muted));
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin-top: 0;
          margin-bottom: 1rem;
        }
        .markdown-preview pre code {
          background: transparent;
          padding: 0;
          font-size: 0.875rem;
          line-height: 1.7;
        }
        .markdown-preview blockquote {
          border-left: 4px solid hsl(var(--border));
          padding-left: 1rem;
          margin-left: 0;
          margin-right: 0;
          margin-top: 1rem;
          margin-bottom: 1rem;
          color: hsl(var(--muted-foreground));
          font-style: italic;
        }
        .markdown-preview ul,
        .markdown-preview ol {
          margin-top: 0;
          margin-bottom: 1rem;
          padding-left: 1.5rem;
        }
        .markdown-preview li {
          margin-top: 0.25rem;
          margin-bottom: 0.25rem;
          line-height: 1.75;
        }
        .markdown-preview hr {
          border: none;
          border-top: 1px solid hsl(var(--border));
          margin-top: 2rem;
          margin-bottom: 2rem;
        }
      `}</style>
    </div>
  );
}
