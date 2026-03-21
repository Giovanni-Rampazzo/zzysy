// Utilitário de merge de texto — preserva estilos E quebras de linha ao trocar conteúdo do asset

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

type CharStyle = { char: string; style: TextSpan["style"] }

/**
 * Faz merge do novo texto com os spans existentes.
 * Preserva estilos por caractere E quebras de linha (\n).
 *
 * Regra das quebras de linha:
 * - \n é específico do layout (cada formato pode ter sua quebra)
 * - O merge opera no texto PURO (sem \n)
 * - Após o merge, os \n são reinseridos nas posições proporcionais
 *
 * Exemplo:
 *   spans = [{text:"c",red},{text:"a",white},{text:"\n",base},{text:"sa",white}]
 *   newText = "dasa"  (texto puro sem \n, vindo da página de Assets)
 *   resultado = [{text:"d",red},{text:"a",white},{text:"\n",base},{text:"sa",white}]
 */
export function mergeTextIntoSpans(spans: TextSpan[], newText: string): TextSpan[] {
  if (!spans.length) {
    return [{ text: newText, style: {} }]
  }

  // Expandir spans em array plano de { char, style }
  const charStyles: CharStyle[] = []
  for (const span of spans) {
    for (const char of span.text) {
      charStyles.push({ char, style: span.style })
    }
  }

  // Separar \n do texto — quebras de linha ficam no layout, não no asset
  const lineBreaks: number[] = []
  const pureChars: CharStyle[] = []
  for (const c of charStyles) {
    if (c.char === "\n") {
      lineBreaks.push(pureChars.length) // posição no texto puro
    } else {
      pureChars.push(c)
    }
  }

  const oldText = pureChars.map(c => c.char).join("")

  // newText já vem sem \n (texto puro da página de Assets)
  // Se texto igual e sem quebras, retorna original
  if (oldText === newText && lineBreaks.length === 0) return spans

  // LCS no texto puro (sem \n)
  const mergedPure = oldText === newText
    ? pureChars
    : lcsAlign(oldText, newText, pureChars)

  // Reinserir \n nas posições proporcionais
  const newLen = mergedPure.length
  const oldLen = pureChars.length
  const defaultStyle = pureChars[0]?.style ?? {}

  const newLineBreakPositions = lineBreaks
    .map(pos => oldLen === 0 ? 0 : Math.round((pos / oldLen) * newLen))
    .filter((pos, i, arr) => i === 0 || pos !== arr[i - 1]) // deduplicar

  const finalChars: CharStyle[] = []
  let insertedBreaks = 0
  for (let i = 0; i <= mergedPure.length; i++) {
    while (insertedBreaks < newLineBreakPositions.length && newLineBreakPositions[insertedBreaks] === i) {
      finalChars.push({ char: "\n", style: defaultStyle })
      insertedBreaks++
    }
    if (i < mergedPure.length) finalChars.push(mergedPure[i])
  }

  return groupIntoSpans(finalChars)
}

function lcsAlign(oldText: string, newText: string, charStyles: CharStyle[]): CharStyle[] {
  const m = oldText.length
  const n = newText.length

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

  const result: CharStyle[] = []
  let i = m, j = n

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldText[i - 1] === newText[j - 1]) {
      result.unshift({ char: newText[j - 1], style: charStyles[i - 1].style })
      i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      const neighborStyle = i > 0 ? charStyles[i - 1].style : (charStyles[0]?.style ?? {})
      result.unshift({ char: newText[j - 1], style: neighborStyle })
      j--
    } else {
      i--
    }
  }

  return result
}

function groupIntoSpans(chars: CharStyle[]): TextSpan[] {
  if (!chars.length) return [{ text: "", style: {} }]
  const spans: TextSpan[] = []
  let current = chars[0].char
  let currentStyle = chars[0].style

  for (let i = 1; i < chars.length; i++) {
    if (JSON.stringify(chars[i].style) === JSON.stringify(currentStyle)) {
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
 * Extrai o texto puro de um array de spans (sem \n).
 * Usado para comparar com o value do asset.
 */
export function spansToText(spans: TextSpan[]): string {
  return spans.map(s => s.text).join("").replace(/\n/g, "")
}
