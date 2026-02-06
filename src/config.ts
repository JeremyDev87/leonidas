import * as fs from 'fs';
import * as yaml from 'js-yaml';

export interface LeonidasConfig {
  label: string;
  model: string;
  branch_prefix: string;
  base_branch: string;
  allowed_tools: string[];
  max_turns: number;
  language: string;
}

const DEFAULT_CONFIG: LeonidasConfig = {
  label: 'leonidas',
  model: 'claude-sonnet-4-5-20250929',
  branch_prefix: 'claude/issue-',
  base_branch: 'main',
  allowed_tools: [
    'Read',
    'Write',
    'Edit',
    'Bash(npm:*)',
    'Bash(git:*)',
    'Bash(gh pr:*)',
    'Bash(npx:*)',
    'Bash(node:*)',
  ],
  max_turns: 30,
  language: 'en',
};

export function loadConfig(configPath = 'leonidas.config.yml'): LeonidasConfig {
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    const parsed = yaml.load(content) as Partial<LeonidasConfig>;
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}
