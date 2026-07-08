import type { Task } from "./types";

export const TASK_KEYWORDS: Record<Task, RegExp[]> = {
  code: [
    /\bcódigo\b/i,
    /\bcode\b/i,
    /\bfunç(ão|ao|oes|ões)\b/i,
    /\bfunction\b/i,
    /\bscript\b/i,
    /\balgoritmo\b/i,
    /\balgorithm\b/i,
    /\brefactor\b/i,
    /\bbug\b/i,
    /\b(typescript|javascript|python|rust|golang|java|sql)\b/i,
    /\bimplement(e|ar|ation)?\b/i,
  ],
  summary: [
    /\bresum(a|o|ir|e)\b/i,
    /\bsummar(y|ize|ise)\b/i,
    /\btl;?dr\b/i,
    /\bsintetiz(e|ar)\b/i,
    /\bem\s+\d+\s+(linhas|frases|palavras)\b/i,
    /\bo\s+essencial\b/i,
  ],
  translation: [
    /\btraduz(a|ir|e)\b/i,
    /\btranslat(e|ion)\b/i,
    /\bpara\s+(o\s+)?(inglês|ingles|português|portugues|espanhol|francês|frances|english|spanish|french)\b/i,
    /\bversão\s+em\b/i,
  ],
  research: [
    /\bpesquis(a|e|ar)\b/i,
    /\bresearch\b/i,
    /\banalis(e|ar)\s+(profundamente|a\s+fundo|em\s+profundidade)/i,
    /\bprov(e|ar)\b/i,
    /\bdemonstr(e|ar)\b/i,
    /\barquitetura\s+de\s+software\b/i,
    /\braciocínio\b/i,
    /\bexpli(que|car)\s+em\s+detalhes\b/i,
  ],
  json_extraction: [],
  chat: [],
};

export const STRUCTURED_PATTERNS: RegExp[] = [
  /\bjson\b/i,
  /```json/i,
  /\bformato\s+json\b/i,
  /\btabela\b/i,
  /\btable\b/i,
  /\bchaves?\b/i,
  /\bkeys?\b/i,
  /\bschema\b/i,
  /\blista\s+estruturada\b/i,
  /\bstructured\s+(output|list)\b/i,
];

export const MATH_PATTERNS: RegExp[] = [
  /[∫∑√π]/,
  /\b\d+\s*[+\-*/^]\s*\d+/,
  /\bequ(ação|acao|ation)\b/i,
  /\bcalcul(e|ar|ate)\b/i,
  /\b(derivad|integral|matriz|matrix|teorema|theorem)\b/i,
  /\bprov(e|ar)\b/i,
];

export const TRIVIAL_CHAT: RegExp[] = [
  /^\s*(oi|olá|ola|hello|hi|hey|e\s*aí|eai)\b/i,
  /^\s*(bom\s+dia|boa\s+tarde|boa\s+noite)\b/i,
  /\btudo\s+bem\b/i,
  /\b(obrigad[oa]|valeu|thanks|thank\s+you)\b/i,
];
