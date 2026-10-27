import ts from 'typescript';

export interface GuardIssue { readonly file: string; readonly line: number; readonly message: string }

/** AST-based checks apply to maintained TypeScript, including scripts and tests. */
export class SourceGuard {
  public inspect(file: string, text: string): readonly GuardIssue[] {
    if (/\.(js|jsx|mjs|cjs)$/i.test(file)) return [{ file, line: 1, message: 'Use TypeScript for maintained source' }];
    if (!/\.(ts|tsx|mts|cts)$/i.test(file)) return [];
    const issues: GuardIssue[] = [];
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    if (text.split('\n').length > 250) issues.push({ file, line: 1, message: 'Module exceeds 250 lines; extract a focused concern' });
    const visit = (node: ts.Node, insideIf: boolean): void => {
      const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
      if (node.kind === ts.SyntaxKind.AnyKeyword) issues.push({ file, line, message: 'Explicit any' });
      if (ts.isIfStatement(node) && insideIf) issues.push({ file, line, message: 'Nested if' });
      const nested = ts.isFunctionLike(node) ? false : insideIf || ts.isIfStatement(node);
      ts.forEachChild(node, child => { visit(child, nested); });
    };
    visit(source, false);
    return issues;
  }
}
