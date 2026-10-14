import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';
import svelteConfig from './svelte.config.js';

export default defineConfig(
	{ ignores: ['build/', '.svelte-kit/', '.wrangler/', 'static/'] },
	js.configs.recommended,
	ts.configs.recommendedTypeChecked,
	svelte.configs.recommended,
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node },
			parserOptions: { projectService: true, extraFileExtensions: ['.svelte'] }
		},
		rules: {
			// TypeScript checks every name.
			'no-undef': 'off',
			// An action's `_value` is read by Svelte (it calls `update` when it changes), not by the action.
			'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts'],
		languageOptions: { parserOptions: { parser: ts.parser, svelteConfig } }
	},
	{
		// The Node scripts and configs are plain JS outside the app's TS project.
		files: ['**/*.js'],
		extends: [ts.configs.disableTypeChecked]
	}
);
