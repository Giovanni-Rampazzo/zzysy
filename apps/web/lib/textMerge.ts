// Utilitário de merge de texto — preserva estilos ao trocar conteúdo do asset

export interface TextSpan {
  text: string
  style: {
    color?: string
    fontSize?: number
    fontWeight?: string
    fontFamily?: string
    fontStyle?: string
    lineHeight?: number
    charSpacing?: number
    textAlign?: string
  }
}

/**
 * Faz merge do novo texto com os spans existentes, preservando estilos.
 * 
 * Exemplo:
 *   spans = [{ text: "c", style: {color:"red"} }, { text: "asa", style: {color:"white"} }]
 *   newText = "dasa"
 *   resultado = [{ text: "d", style: {color:"red"} }, { text: "asa", style: {color:"white"} }]
 * 
 * Algoritmo:
 * 1. Expande spans em array de caracteres com seus estilos
 * 2. Aplica diff LCS (Longest Common Subsequence) entre texto antigo e novo
 * 3. Reconstrói spans agrupando caracteres com mesmo estilo
 */
export function mergeTextIntoSpans(spans: TextSpan[], newText: string): TextSpan[] {
  if (!spans.length) {
    return [{ text: newText, style: {} }]
  }

  // Expandir spans em array de { char, style }
  const charStyles: Array<{ char: string; style: TextSpan["style"] }> = []
  for (const span of spans) {
    for (const char of span.text) {
      charStyles.push({ char, style: span.style })
    }
  }

  const oldText = charStyles.map(c => c.char).join("")

  // Se texto igual, retorna spans originais
  if (oldText === newText) return spans

  // Algoritmo LCS para encontrar o mapeamento entre texto antigo e novo
  const merged = lcsAlign(oldText, newText, charStyles)

  // Reagrupar em spans por estilo consecutivo igual
  return groupIntoSpans(merged)
}

/**
 * Alinha os caracteres do novo texto com os estilos do texto antigo via LCS.
 * Caracteres novos (inseridos) herdam o estilo do caractere vizinho mais próximo.
 */
function lcsAlign(
  oldText: string,
  newText: string,
  charStyles: Array<{ char: string; style: TextSpan["style"] }>
): Array<{ char: string; style: TextSpan["style"] }> {
  const m = oldText.length
  const n = newText.length

  // Tabela LCS
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldText[i - 1] === newText[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // Backtrack para encontrar alinhamento
  const result: Array<{ char: string; style: TextSpan["style"] }> = []
  let i = m, j = n

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldText[i - 1] === newText[j - 1]) {
      // Caractere em comum — preserva estilo
      result.unshift({ char: newText[j - 1], style: charStyles[i - 1].style })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      // Inserção — herda estilo do vizinho
      const neighborStyle = i > 0 ? charStyles[i - 1].style : (charStyles[0]?.style ?? {})
      result.unshift({ char: newText[j - 1], style: neighborStyle })
      j--
    } else {
      // Deleção — ignora
      i--
    }
  }

  return result
}

/**
 * Agrupa array de { char, style } em TextSpan[] consolidado.
 * Caracteres consecutivos com mesmo estilo viram um span.
 */
function groupIntoSpans(chars: Array<{ char: string; style: TextSpan["style"] }>): TextSpan[] {
  if (!chars.length) return [{ text: "", style: {} }]

  const spans: TextSpan[] = []
  let current = chars[0].char
  let currentStyle = chars[0].style

  for (let i = 1; i < chars.length; i++) {
    const styleKey = JSON.stringify(chars[i].style)
    const prevKey = JSON.stringify(currentStyle)
    if (styleKey === prevKey) {
      current += chars[i].char
    } else {
      spans.push({ text: current, style: currentStyle })
      current = chars[i].char
      currentStyle = chars[i].style
    }
  }
  spans.push({ text: current, style: currentStyle })

  return spans
}

/**
 * Extrai o texto puro de um array de spans.
 */
export function spansToText(spans: TextSpan[]): string {
  return spans.map(s => s.text).join("")
}
