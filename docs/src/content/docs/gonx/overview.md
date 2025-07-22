---
title: GoNx Overview
description: Modern Nx plugin for Go/Golang development
---


<p style="text-align: center;">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://pub-2030b241eb284b5291e3e59724e55a66.r2.dev/gonx.svg" />
    <img alt="gonx - Nx plugin for Go/Golang" src="https://pub-2030b241eb284b5291e3e59724e55a66.r2.dev/gonx.svg" width="100%" />
  </picture>
</p>

GoNx is a very opinionated Nx plugin for Go/Golang development that brings modern Nx features to Go projects.

:::note
**Important:** This project is a fork of [@nx-go/nx-go](https://github.com/nx-go/nx-go). We give most of the credit to the original maintainers and have built upon their excellent foundation to modernize the plugin for the latest Nx features.
:::

## Philosophy

The philosophy of GoNx is to generate non-invasive tooling to work with Go and Nx, heavily relying on inferred tasks and modern Nx features. We keep non-JS monorepos as pure as possible while providing excellent developer experience.

## Key Features

<CardGrid>
	<Card title="Go Applications" icon="rocket">
		Generate Go applications with customizable module setup and well-structured code scaffolding.
	</Card>
	<Card title="Go Libraries" icon="puzzle">
		Create reusable Go libraries that integrate seamlessly with your Nx workspace.
	</Card>
	<Card title="Full Nx Integration" icon="setting">
		Inferred tasks, cacheable operations, GraphV2 support, and version actions for Go releases.
	</Card>
	<Card title="Official Go Commands" icon="approval-check">
		Uses official Go commands in the background for maximum compatibility and reliability.
	</Card>
</CardGrid>

## Inferred Tasks

GoNx automatically detects your Go projects and provides these inferred tasks:

- **Build** - Compile your Go applications
- **Generate** - Run `go generate` for code generation
- **Tidy** - Ensure `go.mod` matches source code
- **Test** - Run Go tests with caching
- **Run** - Execute Go applications
- **Lint** - Format and lint Go code

All tasks are fully cacheable for optimal performance in large monorepos.

## Modern Nx Features

### GraphV2 Support
GoNx implements the latest CreateNodesV2 API, enabling advanced project graph detection and inferred task configuration.

### Version Actions
Integrated with Nx Release for proper Go module versioning:
- Project names use full paths for Go release tagging convention (`projectRoot/vx.x.x`)
- Automated version bumping
- Registry publishing support

### Nx Release Integration
GoNx provides a specialized publish executor for releasing Go modules to the registry as part of the `nx release` workflow.

## What's Different from nx-go

GoNx introduces several modernizations and improvements:

### Breaking Changes
- **Modern Nx-only**: Breaks compatibility with older Nx versions
- **No project.json generation**: Follows pure monorepo philosophy
- **Inferred-tasks first**: Relies on automatic task detection
- **Changed command execution**: Runs from project root instead of workspace root

### New Features
- **Cacheable tasks**: All operations are properly cached
- **CreateNodesV2**: Latest Nx project detection API
- **Version Actions**: Proper Go versioning with Nx Release
- **Publish executor**: Automated registry publishing
- **Go Blueprint integration**: Generate applications using Go Blueprint

### Removed Features
- **go.work creation**: Now opt-in via `addGoDotWork` flag
- **convert-to-one-module generator**: Removed for simplicity
- **Automatic project.json**: Keeps projects pure

## Getting Started

Ready to start using GoNx? Check out the [installation guide](/gonx/installation/) or jump straight to [usage examples](/gonx/usage/).

For migration from the original nx-go plugin, see our [migration guide](/gonx/migration/).
