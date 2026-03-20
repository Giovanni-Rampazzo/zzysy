"use client"
import { useEffect, useCallback } from "react"
import { LexicalComposer } from "@lexical/react/LexicalComposer"
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin"
import { ContentEditable } from "@lexical/react/LexicalContentEditable"
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import {
  $getRoot, $getSelection, $isRangeSelection,
  FORMAT_TEXT_COMMAND, COMMAND_PRIORITY_LOW,
  $createParagraphNode, $createTextNode,
  EditorState, LexicalEditor
} from "lexical"

interface TextSpan {
  text: string
  styles: {
    fontSize?: number
    color?: string
    fontWeight?: string
    fontFamily?: string
  }
}

interface Props {
  spans: TextSpan[]
  zoom: number
  editing: boolean
  onStartEdit: () => void
  onEndEdit: (spans: TextSpan[]) => void
  onSelectionChange?: (hasSelection: boolean) => void
  selectedColor?: string
  selectedFontSize?: number
  applyColorSignal?: string   // muda quando usuário clica numa cor
  applyFontSizeSignal?: string
}

// Plugin para aplicar cor na seleção
function ApplyStylePlugin({ color, fontSize, colorSignal, fontSizeSignal }: {
  color?: string; fontSize?: number; colorSignal?: string; fontSizeSignal?: string
}) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    if (!color || !colorSignal) return
    editor.update(() => {
      const sel = $getSelection()
      if (!$isRangeSelection(sel)) return
      sel.getNodes().forEach(node => {
        if ((node as any).setStyle) {
          const current = (node as any).getStyle?.() ?? ""
          const styles = Object.fromEntries(
            current.split(";").filter(Boolean).map((s: string) => s.split(":").map((x: string) => x.trim()))
          )
          styles["color"] = color
          ;(node as any).setStyle(Object.entries(styles).map(([k, v]) => `${k}:${v}`).join(";"))
        }
      })
    })
  }, [colorSignal])

  useEffect(() => {
    if (!fontSize || !fontSizeSignal) return
    editor.update(() => {
      const sel = $getSelection()
      if (!$isRangeSelection(sel)) return
      sel.getNodes().forEach(node => {
        if ((node as any).setStyle) {
          const current = (node as any).getStyle?.() ?? ""
          const styles = Object.fromEntries(
            current.split(";").filter(Boolean).map((s: string) => s.split(":").map((x: string) => x.trim()))
          )
          styles["font-size"] = `${fontSize}px`
          ;(node as any).setStyle(Object.entries(styles).map(([k, v]) => `${k}:${v}`).join(";"))
        }
      })
    })
  }, [fontSizeSignal])

  return null
}

function EditorContent({ spans, editing, onStartEdit, onEndEdit, onSelectionChange, zoom, applyColorSignal, applyFontSizeSignal, selectedColor, selectedFontSize }: Props) {
  const [editor] = useLexicalComposerContext()

  // Carregar conteúdo inicial
  useEffect(() => {
    editor.update(() => {
      const root = $getRoot()
      root.clear()
      const para = $createParagraphNode()
      spans.forEach(span => {
        const node = $createTextNode(span.text)
        if (span.styles.color) node.setStyle(`color:${span.styles.color};font-size:${span.styles.fontSize ?? 80}px`)
        para.append(node)
      })
      root.append(para)
    })
  }, [])

  // Converter EditorState para TextSpan[]
  function stateToSpans(state: EditorState): TextSpan[] {
    const result: TextSpan[] = []
    state.read(() => {
      const root = $getRoot()
      root.getChildren().forEach((para: any) => {
        para.getChildren?.().forEach((node: any) => {
          const text = node.getTextContent?.() ?? ""
          const style = node.getStyle?.() ?? ""
          const styleMap: Record<string, string> = {}
          style.split(";").filter(Boolean).forEach((s: string) => {
            const [k, v] = s.split(":").map((x: string) => x.trim())
            if (k && v) styleMap[k] = v
          })
          result.push({
            text,
            styles: {
              color: styleMap["color"] ?? spans[0]?.styles.color ?? "#111111",
              fontSize: styleMap["font-size"] ? parseInt(styleMap["font-size"]) : (spans[0]?.styles.fontSize ?? 80),
              fontWeight: styleMap["font-weight"] ?? spans[0]?.styles.fontWeight ?? "normal",
              fontFamily: styleMap["font-family"] ?? spans[0]?.styles.fontFamily ?? "Arial",
            }
          })
        })
      })
    })
    return result.length > 0 ? result : spans
  }

  const baseStyle = spans[0]?.styles ?? {}

  return (
    <div
      onDoubleClick={e => { e.stopPropagation(); onStartEdit() }}
      style={{ position: "relative", cursor: editing ? "text" : "grab" }}
    >
      <RichTextPlugin
        contentEditable={
          <ContentEditable
            style={{
              outline: editing ? "2px dashed #F5C400" : "none",
              padding: editing ? 4 : 0,
              minWidth: 50,
              lineHeight: 1.2,
              fontSize: (baseStyle.fontSize ?? 80) * zoom,
              fontFamily: baseStyle.fontFamily ?? "Arial",
              fontWeight: baseStyle.fontWeight ?? "normal",
              color: baseStyle.color ?? "#111111",
              caretColor: "#F5C400",
              userSelect: editing ? "text" : "none",
              pointerEvents: editing ? "auto" : "none",
            }}
            onBlur={() => {
              const state = editor.getEditorState()
              onEndEdit(stateToSpans(state))
            }}
          />
        }
        placeholder={null}
        ErrorBoundary={({ children }) => <>{children}</>}
      />
      <OnChangePlugin onChange={(state) => {
        state.read(() => {
          const sel = $getSelection()
          onSelectionChange?.($isRangeSelection(sel) && !sel.isCollapsed())
        })
      }} />
      <ApplyStylePlugin
        color={selectedColor}
        fontSize={selectedFontSize}
        colorSignal={applyColorSignal}
        fontSizeSignal={applyFontSizeSignal}
      />
    </div>
  )
}

export function TextLayer(props: Props) {
  const theme = {
    text: {
      bold: "font-bold",
      italic: "italic",
    }
  }

  const initialConfig = {
    namespace: `text-${Math.random()}`,
    theme,
    onError: (e: Error) => console.error(e),
  }

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <EditorContent {...props} />
    </LexicalComposer>
  )
}
