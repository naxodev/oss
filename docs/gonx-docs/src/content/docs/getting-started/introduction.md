---
title: Introduction
description: What is GoNx and what can it do for you?
---

GoNx is an [Nx](https://nx.dev/) plugin for [Go](https://go.dev/) development. It
brings the benefits of Nx — caching, affected-task detection, project graph
visualization, and generators — to Go projects without requiring hand-written
`project.json` targets.

## What gonx does

gonx infers build, serve, test, lint, tidy, and generate targets automatically
from every `go.mod` in your workspace. It builds the Nx project graph by
parsing Go source files with [tree-sitter](https://tree-sitter.github.io/) to
extract import statements and resolve them to Nx projects — no Go toolchain
required for graph computation. It also ships generators for scaffolding
applications, libraries, and [Go Blueprint](https://github.com/melkeydev/go-blueprint)
projects with web frameworks and database drivers.

## Who it's for

gonx is for teams and individuals who already use Nx (or want to) and have Go
projects in their workspace. It is a fork of
[@nx-go/nx-go](https://github.com/nx-go/nx-go), modernized for Nx 23 with
inferred tasks and a tree-sitter-based project graph. If you are migrating from
nx-go, see the [migration guide](/community/migration).

## Where to go next

- New to gonx? Start with the [quick start](/getting-started/quick-start).
- Adding gonx to an existing workspace? See
  [install gonx](/getting-started/installation).
- Want a step-by-step walkthrough? Read
  [create your first Go project](/tutorials/first-go-project).
- Curious how the project graph works? See
  [how static analysis works](/understanding/static-analysis).
