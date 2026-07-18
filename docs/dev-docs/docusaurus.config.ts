import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
	title: "Private Project Template",
	tagline: "A template for private projects",
	favicon: "images/favicon.ico",

	headTags: [
		{
			tagName: "link",
			attributes: {
				rel: "alternate icon",
				href: "/images/favicon.ico",
			},
		},
	],

	// Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
	future: {
		v4: true, // Improve compatibility with the upcoming Docusaurus v4
	},

	url: "https://private-project-template.example.com",
	baseUrl: "/",
	organizationName: "dds",
	projectName: "private-project-template",
	onBrokenLinks: "throw",
	i18n: {
		defaultLocale: "ja",
		locales: ["ja"],
	},

	presets: [
		[
			"classic",
			{
				docs: false,
				blog: false,
				theme: {
					customCss: "./src/css/custom.css",
				},
			} satisfies Preset.Options,
		],
	],

	plugins: [
		[
			"@docusaurus/plugin-content-docs",
			{
				path: "content",
				routeBasePath: "docs",
				sidebarPath: "./sidebars.ts",
			},
		],
	],

	markdown: {
		mermaid: true,
	},
	themes: ["@docusaurus/theme-mermaid"],

	themeConfig: {
		// Replace with your project's social card
		image: "images/docusaurus-social-card.jpg",
		colorMode: {
			respectPrefersColorScheme: true,
		},
		navbar: {
			title: "Private Project Template",
			logo: {
				alt: "Logo",
				src: "images/docusaurus.png",
			},
			items: [
				{
					type: "docSidebar",
					sidebarId: "systemDesignSidebar",
					position: "left",
					label: "システムデザイン",
				},
				{
					type: "docSidebar",
					sidebarId: "requirementsSidebar",
					position: "left",
					label: "システム要求",
				},
				{
					type: "docSidebar",
					sidebarId: "adrSidebar",
					position: "left",
					label: "ADR",
				},
				{
					type: "docSidebar",
					sidebarId: "projectRulesSidebar",
					position: "left",
					label: "プロジェクトルール",
				},
				{
					type: "docSidebar",
					sidebarId: "technicalConcernsSidebar",
					position: "left",
					label: "技術的懸念",
				},
			],
		},
		footer: {
			style: "dark",
			links: [],
			copyright: `Copyright © ${new Date().getFullYear()} akebifiky. Built with Docusaurus.`,
		},
		prism: {
			theme: prismThemes.github,
			darkTheme: prismThemes.dracula,
		},
	} satisfies Preset.ThemeConfig,
};

export default config;
