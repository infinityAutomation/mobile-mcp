# Mobile MCP Server

This project is an MCP server for automating mobile devices (Android and iOS) using natural language prompts. It uses TypeScript, Node.js, and Appium to expose automation tools via the Model Context Protocol.

## Features
- Automate Android and iOS devices
- Tools for tap, swipe, type, screenshot, wait for element, get app state
- Integrates with Claude Haiku 4.5 and other MCP clients

## Quick Start
1. Install Node.js (v17+)
2. Install dependencies: `npm install`
3. Build: `npm run build`
4. Run MCP server: `npm start`

## References
- [Model Context Protocol TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Appium Documentation](https://appium.io/docs/en/about-appium/intro/)
- [MCP Server Quickstart](https://modelcontextprotocol.io/docs/develop/build-server)

## Claude Haiku 4.5
To enable Claude Haiku 4.5 for all clients, configure your MCP client or Claude Desktop to use this server and set the model to Haiku 4.5.