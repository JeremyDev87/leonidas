import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { buildSystemPrompt } from './system';

vi.mock('fs');
vi.mock('path');

describe('prompts/system', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = originalEnv;
  });

  describe('buildSystemPrompt', () => {
    it('should load default system prompt successfully', () => {
      process.env.GITHUB_ACTION_PATH = '/action/path';
      const defaultPrompt = 'Default system instructions from file.';

      vi.mocked(path.join).mockReturnValue('/action/path/prompts/system.md');
      vi.mocked(fs.readFileSync).mockReturnValue(defaultPrompt);

      const result = buildSystemPrompt();

      expect(path.join).toHaveBeenCalledWith('/action/path', 'prompts/system.md');
      expect(fs.readFileSync).toHaveBeenCalledWith('/action/path/prompts/system.md', 'utf-8');
      expect(result).toBe(defaultPrompt);
    });

    it('should use fallback prompt when default file not found', () => {
      process.env.GITHUB_ACTION_PATH = '/action/path';

      vi.mocked(path.join).mockReturnValue('/action/path/prompts/system.md');
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      const result = buildSystemPrompt();

      expect(result).toBe('You are an automated implementation agent.');
    });

    it('should use __dirname when GITHUB_ACTION_PATH is not set', () => {
      delete process.env.GITHUB_ACTION_PATH;

      vi.mocked(path.join).mockImplementation((a, b) => {
        if (b === '..') return '/some/action/root';
        return '/some/action/root/prompts/system.md';
      });
      vi.mocked(fs.readFileSync).mockReturnValue('Default prompt');

      const result = buildSystemPrompt();

      expect(result).toBe('Default prompt');
    });

    it('should append user override when provided and file exists', () => {
      process.env.GITHUB_ACTION_PATH = '/action/path';
      const defaultPrompt = 'Default instructions.';
      const userOverride = 'User-specific instructions.';

      vi.mocked(path.join).mockReturnValue('/action/path/prompts/system.md');
      vi.mocked(fs.readFileSync)
        .mockReturnValueOnce(defaultPrompt)
        .mockReturnValueOnce(userOverride);

      const result = buildSystemPrompt('/repo/.leonidas/system.md');

      expect(fs.readFileSync).toHaveBeenCalledWith('/action/path/prompts/system.md', 'utf-8');
      expect(fs.readFileSync).toHaveBeenCalledWith('/repo/.leonidas/system.md', 'utf-8');
      expect(result).toBe(
        'Default instructions.\n\n## Repository-Specific Instructions\n\nUser-specific instructions.'
      );
    });

    it('should skip user override silently when file not found', () => {
      process.env.GITHUB_ACTION_PATH = '/action/path';
      const defaultPrompt = 'Default instructions.';

      vi.mocked(path.join).mockReturnValue('/action/path/prompts/system.md');
      vi.mocked(fs.readFileSync)
        .mockReturnValueOnce(defaultPrompt)
        .mockImplementationOnce(() => {
          throw new Error('ENOENT: no such file or directory');
        });

      const result = buildSystemPrompt('/repo/.leonidas/system.md');

      expect(result).toBe('Default instructions.');
    });

    it('should work when both default and user override load successfully', () => {
      process.env.GITHUB_ACTION_PATH = '/action/path';
      const defaultPrompt = 'Default prompt text';
      const userOverride = 'Custom repo instructions';

      vi.mocked(path.join).mockReturnValue('/action/path/prompts/system.md');
      vi.mocked(fs.readFileSync)
        .mockReturnValueOnce(defaultPrompt)
        .mockReturnValueOnce(userOverride);

      const result = buildSystemPrompt('/custom/path.md');

      expect(result).toContain('Default prompt text');
      expect(result).toContain('## Repository-Specific Instructions');
      expect(result).toContain('Custom repo instructions');
    });

    it('should use fallback when default fails and skip user override when it fails', () => {
      process.env.GITHUB_ACTION_PATH = '/action/path';

      vi.mocked(path.join).mockReturnValue('/action/path/prompts/system.md');
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('File read error');
      });

      const result = buildSystemPrompt('/user/override.md');

      expect(result).toBe('You are an automated implementation agent.');
    });

    it('should not include user override section when no path provided', () => {
      process.env.GITHUB_ACTION_PATH = '/action/path';
      const defaultPrompt = 'Default instructions.';

      vi.mocked(path.join).mockReturnValue('/action/path/prompts/system.md');
      vi.mocked(fs.readFileSync).mockReturnValue(defaultPrompt);

      const result = buildSystemPrompt();

      expect(result).toBe('Default instructions.');
      expect(result).not.toContain('## Repository-Specific Instructions');
    });

    it('should handle empty user override file', () => {
      process.env.GITHUB_ACTION_PATH = '/action/path';
      const defaultPrompt = 'Default instructions.';

      vi.mocked(path.join).mockReturnValue('/action/path/prompts/system.md');
      vi.mocked(fs.readFileSync)
        .mockReturnValueOnce(defaultPrompt)
        .mockReturnValueOnce('');

      const result = buildSystemPrompt('/repo/override.md');

      expect(result).toBe('Default instructions.\n\n## Repository-Specific Instructions\n\n');
    });

    it('should handle multiline user override', () => {
      process.env.GITHUB_ACTION_PATH = '/action/path';
      const defaultPrompt = 'Default instructions.';
      const userOverride = 'Line 1\nLine 2\nLine 3';

      vi.mocked(path.join).mockReturnValue('/action/path/prompts/system.md');
      vi.mocked(fs.readFileSync)
        .mockReturnValueOnce(defaultPrompt)
        .mockReturnValueOnce(userOverride);

      const result = buildSystemPrompt('/repo/override.md');

      expect(result).toContain('Line 1\nLine 2\nLine 3');
    });

    it('should use fallback and append user override when default fails but override succeeds', () => {
      process.env.GITHUB_ACTION_PATH = '/action/path';
      const userOverride = 'Custom instructions';

      vi.mocked(path.join).mockReturnValue('/action/path/prompts/system.md');
      vi.mocked(fs.readFileSync)
        .mockImplementationOnce(() => {
          throw new Error('Default file not found');
        })
        .mockReturnValueOnce(userOverride);

      const result = buildSystemPrompt('/repo/override.md');

      expect(result).toBe(
        'You are an automated implementation agent.\n\n## Repository-Specific Instructions\n\nCustom instructions'
      );
    });
  });
});
