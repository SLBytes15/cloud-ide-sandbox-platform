export function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
    case 'mjs':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'py':
      return 'python';
    case 'cpp':
    case 'cc':
    case 'cxx':
    case 'c':
    case 'h':
    case 'hpp':
      return 'cpp';
    case 'go':
      return 'go';
    case 'rs':
      return 'rust';
    case 'json':
      return 'json';
    case 'md':
      return 'markdown';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    case 'sh':
    case 'bash':
      return 'shell';
    case 'sql':
      return 'sql';
    default:
      return 'plaintext';
  }
}
