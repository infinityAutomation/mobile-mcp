#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { spawn } from "child_process";
import { promisify } from "util";
import { exec as execCallback } from "child_process";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf-8"));

const exec = promisify(execCallback);

// Global variables to track Appium server and session
let appiumProcess = null;
let currentSession = null;
let sessionCapabilities = null;
let appiumUrl = "http://localhost:4723";
let currentPlatform = null; // Track current platform: 'iOS', 'Android', or null

const server = new Server(
  {
    name: "mobile-mcp",
    version: packageJson.version,
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Check if required dependencies are installed
 */
async function checkDependencies(platform = null) {
  const errors = [];

  // Check Appium
  try {
    await exec("which appium");
  } catch (error) {
    errors.push("Appium is not installed. Install with: npm install -g appium");
  }

  // Check Node.js version
  try {
    const { stdout } = await exec("node --version");
    const version = stdout.trim().replace('v', '');
    const major = parseInt(version.split('.')[0]);
    if (major < 18) {
      errors.push(`Node.js version ${version} is too old. Required: Node.js >= 18.0.0`);
    }
  } catch (error) {
    errors.push("Node.js is not installed");
  }

  // Platform-specific checks
  if (platform === "Android") {
    // Check adb
    try {
      await exec("which adb");
    } catch (error) {
      errors.push("Android SDK (adb) is not installed or not in PATH. Install Android SDK and add to PATH.");
    }

    // Check Appium UiAutomator2 driver
    try {
      const { stdout } = await exec("appium driver list --installed");
      if (!stdout.includes("uiautomator2")) {
        errors.push("Appium UiAutomator2 driver not installed. Install with: appium driver install uiautomator2");
      }
    } catch (error) {
      // If we can't check drivers, add a warning but don't fail
      errors.push("Could not verify Appium drivers. Ensure uiautomator2 driver is installed: appium driver install uiautomator2");
    }
  } else if (platform === "iOS") {
    // Check if running on macOS
    if (process.platform !== "darwin") {
      errors.push("iOS automation requires macOS");
    } else {
      // Check Xcode command line tools
      try {
        await exec("which xcrun");
      } catch (error) {
        errors.push("Xcode command line tools not installed. Install with: xcode-select --install");
      }

      // Check Appium XCUITest driver
      try {
        const { stdout } = await exec("appium driver list --installed");
        if (!stdout.includes("xcuitest")) {
          errors.push("Appium XCUITest driver not installed. Install with: appium driver install xcuitest");
        }
      } catch (error) {
        errors.push("Could not verify Appium drivers. Ensure xcuitest driver is installed: appium driver install xcuitest");
      }
    }
  }

  return errors;
}

/**
 * Start Appium server
 */
async function startAppiumServer(port = 4723, host = "localhost") {
  // Check if Appium is installed
  const errors = await checkDependencies();
  if (errors.length > 0) {
    throw new Error("Missing dependencies:\n" + errors.map(e => `  - ${e}`).join('\n'));
  }

  return new Promise((resolve, reject) => {
    if (appiumProcess) {
      resolve(`Appium server already running at ${appiumUrl}`);
      return;
    }

    appiumProcess = spawn("appium", ["--port", port.toString()], {
      stdio: "pipe",
    });

    let serverStarted = false;

    appiumProcess.stdout.on("data", (data) => {
      const output = data.toString();
      if (output.includes("Appium REST http interface listener started") && !serverStarted) {
        serverStarted = true;
        appiumUrl = `http://${host}:${port}`;
        resolve(`Appium server started successfully at ${appiumUrl}`);
      }
    });

    appiumProcess.stderr.on("data", (data) => {
      console.error(`Appium stderr: ${data}`);
    });

    appiumProcess.on("error", (error) => {
      appiumProcess = null;
      reject(`Failed to start Appium: ${error.message}`);
    });

    appiumProcess.on("close", (code) => {
      appiumProcess = null;
      console.error(`Appium process exited with code ${code}`);
    });

    // Timeout if server doesn't start
    setTimeout(() => {
      if (!serverStarted) {
        appiumProcess = null;
        reject("Appium server failed to start within timeout");
      }
    }, 15000);
  });
}

/**
 * Stop Appium server
 */
async function stopAppiumServer() {
  return new Promise((resolve) => {
    if (!appiumProcess) {
      resolve("No Appium server running");
      return;
    }

    appiumProcess.kill();
    appiumProcess = null;
    currentSession = null;
    sessionCapabilities = null;
    appiumUrl = "http://localhost:4723";
    resolve("Appium server stopped successfully");
  });
}

/**
 * Create a new mobile session
 */
async function createSession(capabilities) {
  // Extract platform from capabilities
  const platform = capabilities.alwaysMatch?.["appium:platformName"] || 
                  capabilities.platformName;
  
  // Check platform-specific dependencies
  const errors = await checkDependencies(platform);
  if (errors.length > 0) {
    throw new Error("Missing dependencies for " + platform + ":\n" + errors.map(e => `  - ${e}`).join('\n'));
  }

  try {
    const response = await fetch(`${appiumUrl}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ capabilities }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create session: ${error}`);
    }

    const data = await response.json();
    currentSession = data.value.sessionId;
    sessionCapabilities = capabilities;
    currentPlatform = platform;

    return `Session created successfully. Session ID: ${currentSession}`;
  } catch (error) {
    throw new Error(`Failed to create session: ${error.message}`);
  }
}

/**
 * Delete current session
 */
async function deleteSession() {
  if (!currentSession) {
    return "No active session to delete";
  }

  try {
    await fetch(`${appiumUrl}/session/${currentSession}`, {
      method: "DELETE",
    });

    const sessionId = currentSession;
    currentSession = null;
    sessionCapabilities = null;
    currentPlatform = null;

    return `Session ${sessionId} deleted successfully`;
  } catch (error) {
    throw new Error(`Failed to delete session: ${error.message}`);
  }
}

/**
 * Execute Appium command
 */
async function executeCommand(method, endpoint, body) {
  if (!currentSession) {
    throw new Error("No active session. Create a session first.");
  }

  const url = `${appiumUrl}/session/${currentSession}${endpoint}`;
  const options = {
    method,
    headers: { "Content-Type": "application/json" },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Command failed: ${JSON.stringify(data)}`);
  }

  return data.value;
}

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  // Platform-specific tools
  const androidOnlyTools = [
    "toggle_wifi",
    "toggle_airplane_mode",
    "open_notifications",
    "press_keycode",
    "start_activity",
    "clear_app",
  ];

  const iosOnlyTools = [
    "touch_id",
    "face_id",
    "press_key",
  ];

  const allTools = [
      {
        name: "start_appium",
        description: "Start the Appium server for mobile automation",
        inputSchema: {
          type: "object",
          properties: {
            port: {
              type: "number",
              description: "Port number for Appium server (default: 4723)",
              default: 4723,
            },
            host: {
              type: "string",
              description: "Host address for Appium server (default: localhost)",
              default: "localhost",
            },
          },
        },
      },
      {
        name: "stop_appium",
        description: "Stop the Appium server",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "create_session",
        description: "Create a new mobile automation session with specified capabilities",
        inputSchema: {
          type: "object",
          properties: {
            platformName: {
              type: "string",
              description: "Platform name: iOS or Android",
              enum: ["iOS", "Android"],
            },
            deviceName: {
              type: "string",
              description: "Name of the device or emulator",
            },
            app: {
              type: "string",
              description: "Path to the app file (.apk for Android, .app/.ipa for iOS)",
            },
            appPackage: {
              type: "string",
              description: "Android app package name (Android only)",
            },
            appActivity: {
              type: "string",
              description: "Android app activity name (Android only)",
            },
            bundleId: {
              type: "string",
              description: "iOS bundle identifier (iOS only)",
            },
            automationName: {
              type: "string",
              description: "Automation engine: UiAutomator2 (Android) or XCUITest (iOS)",
            },
            udid: {
              type: "string",
              description: "Device UDID for real devices",
            },
          },
          required: ["platformName", "deviceName"],
        },
      },
      {
        name: "delete_session",
        description: "Delete the current mobile automation session",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "find_element",
        description: "Find an element using various locator strategies",
        inputSchema: {
          type: "object",
          properties: {
            using: {
              type: "string",
              description: "Locator strategy: id, xpath, accessibility id, class name, etc.",
              enum: ["id", "xpath", "accessibility id", "class name", "name", "-android uiautomator", "-ios predicate string"],
            },
            value: {
              type: "string",
              description: "The locator value",
            },
          },
          required: ["using", "value"],
        },
      },
      {
        name: "find_elements",
        description: "Find multiple elements using various locator strategies",
        inputSchema: {
          type: "object",
          properties: {
            using: {
              type: "string",
              description: "Locator strategy",
              enum: ["id", "xpath", "accessibility id", "class name", "name"],
            },
            value: {
              type: "string",
              description: "The locator value",
            },
          },
          required: ["using", "value"],
        },
      },
      {
        name: "click_element",
        description: "Click on an element",
        inputSchema: {
          type: "object",
          properties: {
            elementId: {
              type: "string",
              description: "Element ID returned from find_element",
            },
          },
          required: ["elementId"],
        },
      },
      {
        name: "send_keys",
        description: "Send text to an element",
        inputSchema: {
          type: "object",
          properties: {
            elementId: {
              type: "string",
              description: "Element ID to send keys to",
            },
            text: {
              type: "string",
              description: "Text to send",
            },
          },
          required: ["elementId", "text"],
        },
      },
      {
        name: "get_element_text",
        description: "Get text content of an element",
        inputSchema: {
          type: "object",
          properties: {
            elementId: {
              type: "string",
              description: "Element ID to get text from",
            },
          },
          required: ["elementId"],
        },
      },
      {
        name: "get_element_attribute",
        description: "Get an attribute value of an element",
        inputSchema: {
          type: "object",
          properties: {
            elementId: {
              type: "string",
              description: "Element ID",
            },
            attribute: {
              type: "string",
              description: "Attribute name (e.g., 'text', 'enabled', 'displayed')",
            },
          },
          required: ["elementId", "attribute"],
        },
      },
      {
        name: "tap",
        description: "Tap at specific coordinates",
        inputSchema: {
          type: "object",
          properties: {
            x: {
              type: "number",
              description: "X coordinate",
            },
            y: {
              type: "number",
              description: "Y coordinate",
            },
          },
          required: ["x", "y"],
        },
      },
      {
        name: "swipe",
        description: "Perform a swipe gesture",
        inputSchema: {
          type: "object",
          properties: {
            startX: {
              type: "number",
              description: "Starting X coordinate",
            },
            startY: {
              type: "number",
              description: "Starting Y coordinate",
            },
            endX: {
              type: "number",
              description: "Ending X coordinate",
            },
            endY: {
              type: "number",
              description: "Ending Y coordinate",
            },
            duration: {
              type: "number",
              description: "Duration in milliseconds (default: 500)",
              default: 500,
            },
          },
          required: ["startX", "startY", "endX", "endY"],
        },
      },
      {
        name: "get_page_source",
        description: "Get the page source (XML hierarchy) of the current screen",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "take_screenshot",
        description: "Take a screenshot and return base64 encoded image",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "install_app",
        description: "Install an app on the device",
        inputSchema: {
          type: "object",
          properties: {
            appPath: {
              type: "string",
              description: "Path to the app file",
            },
          },
          required: ["appPath"],
        },
      },
      {
        name: "remove_app",
        description: "Remove an app from the device",
        inputSchema: {
          type: "object",
          properties: {
            bundleId: {
              type: "string",
              description: "Bundle ID (iOS) or package name (Android)",
            },
          },
          required: ["bundleId"],
        },
      },
      {
        name: "launch_app",
        description: "Launch the app associated with current session",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "close_app",
        description: "Close the currently running app",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_device_info",
        description: "Get information about the connected device",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "long_press",
        description: "Long press on element or coordinates",
        inputSchema: {
          type: "object",
          properties: {
            elementId: {
              type: "string",
              description: "Element ID to long press (optional if x,y provided)",
            },
            x: {
              type: "number",
              description: "X coordinate (optional if elementId provided)",
            },
            y: {
              type: "number",
              description: "Y coordinate (optional if elementId provided)",
            },
            duration: {
              type: "number",
              description: "Duration in milliseconds (default: 1000)",
              default: 1000,
            },
          },
        },
      },
      {
        name: "hide_keyboard",
        description: "Hide the on-screen keyboard",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "is_keyboard_shown",
        description: "Check if keyboard is visible",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "scroll_to_element",
        description: "Scroll until element is visible (Android UiAutomator2 or iOS)",
        inputSchema: {
          type: "object",
          properties: {
            strategy: {
              type: "string",
              description: "Scroll strategy: 'uiautomator' (Android) or 'ios-predicate' (iOS)",
              enum: ["uiautomator", "ios-predicate"],
            },
            selector: {
              type: "string",
              description: "UiSelector string for Android or predicate for iOS",
            },
          },
          required: ["strategy", "selector"],
        },
      },
      {
        name: "set_orientation",
        description: "Set device orientation",
        inputSchema: {
          type: "object",
          properties: {
            orientation: {
              type: "string",
              description: "Device orientation",
              enum: ["PORTRAIT", "LANDSCAPE"],
            },
          },
          required: ["orientation"],
        },
      },
      {
        name: "get_orientation",
        description: "Get current device orientation",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "background_app",
        description: "Send app to background for specified seconds",
        inputSchema: {
          type: "object",
          properties: {
            seconds: {
              type: "number",
              description: "Number of seconds to background the app (default: 5)",
              default: 5,
            },
          },
        },
      },
      {
        name: "activate_app",
        description: "Bring app to foreground by bundle ID",
        inputSchema: {
          type: "object",
          properties: {
            bundleId: {
              type: "string",
              description: "Bundle ID (iOS) or package name (Android)",
            },
          },
          required: ["bundleId"],
        },
      },
      {
        name: "get_app_state",
        description: "Check if app is running, in background, or not running",
        inputSchema: {
          type: "object",
          properties: {
            bundleId: {
              type: "string",
              description: "Bundle ID (iOS) or package name (Android)",
            },
          },
          required: ["bundleId"],
        },
      },
      {
        name: "clear_app",
        description: "Clear app data/cache (Android only)",
        inputSchema: {
          type: "object",
          properties: {
            bundleId: {
              type: "string",
              description: "Package name (Android)",
            },
          },
          required: ["bundleId"],
        },
      },
      {
        name: "start_activity",
        description: "Start specific Android activity",
        inputSchema: {
          type: "object",
          properties: {
            appPackage: {
              type: "string",
              description: "Android app package name",
            },
            appActivity: {
              type: "string",
              description: "Android app activity name",
            },
          },
          required: ["appPackage", "appActivity"],
        },
      },
      {
        name: "toggle_wifi",
        description: "Enable/disable WiFi (Android only)",
        inputSchema: {
          type: "object",
          properties: {
            enabled: {
              type: "boolean",
              description: "true to enable, false to disable",
            },
          },
          required: ["enabled"],
        },
      },
      {
        name: "toggle_airplane_mode",
        description: "Enable/disable airplane mode (Android only)",
        inputSchema: {
          type: "object",
          properties: {
            enabled: {
              type: "boolean",
              description: "true to enable, false to disable",
            },
          },
          required: ["enabled"],
        },
      },
      {
        name: "open_notifications",
        description: "Open notification panel (Android only)",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "touch_id",
        description: "Simulate Touch ID authentication (iOS Simulator only)",
        inputSchema: {
          type: "object",
          properties: {
            match: {
              type: "boolean",
              description: "true for successful authentication, false for failure",
            },
          },
          required: ["match"],
        },
      },
      {
        name: "face_id",
        description: "Simulate Face ID authentication (iOS Simulator only)",
        inputSchema: {
          type: "object",
          properties: {
            match: {
              type: "boolean",
              description: "true for successful authentication, false for failure",
            },
          },
          required: ["match"],
        },
      },
      {
        name: "is_element_displayed",
        description: "Check if element is displayed/visible",
        inputSchema: {
          type: "object",
          properties: {
            elementId: {
              type: "string",
              description: "Element ID",
            },
          },
          required: ["elementId"],
        },
      },
      {
        name: "is_element_enabled",
        description: "Check if element is enabled",
        inputSchema: {
          type: "object",
          properties: {
            elementId: {
              type: "string",
              description: "Element ID",
            },
          },
          required: ["elementId"],
        },
      },
      {
        name: "is_element_selected",
        description: "Check if element is selected (checkbox/radio)",
        inputSchema: {
          type: "object",
          properties: {
            elementId: {
              type: "string",
              description: "Element ID",
            },
          },
          required: ["elementId"],
        },
      },
      {
        name: "get_element_location",
        description: "Get element x, y coordinates",
        inputSchema: {
          type: "object",
          properties: {
            elementId: {
              type: "string",
              description: "Element ID",
            },
          },
          required: ["elementId"],
        },
      },
      {
        name: "get_element_size",
        description: "Get element width and height",
        inputSchema: {
          type: "object",
          properties: {
            elementId: {
              type: "string",
              description: "Element ID",
            },
          },
          required: ["elementId"],
        },
      },
      {
        name: "get_element_rect",
        description: "Get element location and size (x, y, width, height)",
        inputSchema: {
          type: "object",
          properties: {
            elementId: {
              type: "string",
              description: "Element ID",
            },
          },
          required: ["elementId"],
        },
      },
      {
        name: "scroll_up",
        description: "Perform scroll up gesture",
        inputSchema: {
          type: "object",
          properties: {
            distance: {
              type: "number",
              description: "Scroll distance in pixels (default: 500)",
              default: 500,
            },
          },
        },
      },
      {
        name: "scroll_down",
        description: "Perform scroll down gesture",
        inputSchema: {
          type: "object",
          properties: {
            distance: {
              type: "number",
              description: "Scroll distance in pixels (default: 500)",
              default: 500,
            },
          },
        },
      },
      {
        name: "scroll_left",
        description: "Perform scroll left gesture",
        inputSchema: {
          type: "object",
          properties: {
            distance: {
              type: "number",
              description: "Scroll distance in pixels (default: 500)",
              default: 500,
            },
          },
        },
      },
      {
        name: "scroll_right",
        description: "Perform scroll right gesture",
        inputSchema: {
          type: "object",
          properties: {
            distance: {
              type: "number",
              description: "Scroll distance in pixels (default: 500)",
              default: 500,
            },
          },
        },
      },
      {
        name: "wait_for_element",
        description: "Wait for element to appear with timeout",
        inputSchema: {
          type: "object",
          properties: {
            using: {
              type: "string",
              description: "Locator strategy",
              enum: ["id", "xpath", "accessibility id", "class name", "name"],
            },
            value: {
              type: "string",
              description: "The locator value",
            },
            timeout: {
              type: "number",
              description: "Timeout in milliseconds (default: 10000)",
              default: 10000,
            },
          },
          required: ["using", "value"],
        },
      },
      {
        name: "get_contexts",
        description: "List available contexts (NATIVE_APP, WEBVIEW)",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_current_context",
        description: "Get current active context",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "switch_context",
        description: "Switch between native app and webview contexts",
        inputSchema: {
          type: "object",
          properties: {
            context: {
              type: "string",
              description: "Context name (e.g., 'NATIVE_APP', 'WEBVIEW_1')",
            },
          },
          required: ["context"],
        },
      },
      {
        name: "clear_element",
        description: "Clear text from input field",
        inputSchema: {
          type: "object",
          properties: {
            elementId: {
              type: "string",
              description: "Element ID to clear",
            },
          },
          required: ["elementId"],
        },
      },
      {
        name: "submit_element",
        description: "Submit form element",
        inputSchema: {
          type: "object",
          properties: {
            elementId: {
              type: "string",
              description: "Element ID to submit",
            },
          },
          required: ["elementId"],
        },
      },
      {
        name: "press_keycode",
        description: "Press Android keycode (e.g., BACK=4, HOME=3, ENTER=66)",
        inputSchema: {
          type: "object",
          properties: {
            keycode: {
              type: "number",
              description: "Android keycode number",
            },
            metastate: {
              type: "number",
              description: "Meta state for modifier keys (optional)",
            },
          },
          required: ["keycode"],
        },
      },
      {
        name: "press_key",
        description: "Press iOS key (home, volumeUp, volumeDown)",
        inputSchema: {
          type: "object",
          properties: {
            key: {
              type: "string",
              description: "Key name",
              enum: ["home", "volumeUp", "volumeDown"],
            },
          },
          required: ["key"],
        },
      },
      {
        name: "set_implicit_wait",
        description: "Set implicit wait timeout for element finding",
        inputSchema: {
          type: "object",
          properties: {
            timeout: {
              type: "number",
              description: "Timeout in milliseconds",
            },
          },
          required: ["timeout"],
        },
      },
      {
        name: "get_timeouts",
        description: "Get all timeout values",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "execute_script",
        description: "Execute JavaScript in webview context",
        inputSchema: {
          type: "object",
          properties: {
            script: {
              type: "string",
              description: "JavaScript code to execute",
            },
            args: {
              type: "array",
              description: "Arguments to pass to the script",
              items: {},
            },
          },
          required: ["script"],
        },
      },
      {
        name: "get_window_size",
        description: "Get screen/window dimensions",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ];

  // Filter tools based on current platform
  let filteredTools = allTools;
  
  if (currentPlatform === "Android") {
    // Show common + Android-specific tools only
    filteredTools = allTools.filter(
      tool => !iosOnlyTools.includes(tool.name)
    );
  } else if (currentPlatform === "iOS") {
    // Show common + iOS-specific tools only
    filteredTools = allTools.filter(
      tool => !androidOnlyTools.includes(tool.name)
    );
  }
  // If no session active (currentPlatform === null), show all tools

  return {
    tools: filteredTools,
  };
});

/**
 * Handle tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "start_appium": {
        const port = args?.port || 4723;
        const host = args?.host || "localhost";
        const result = await startAppiumServer(port, host);
        return { content: [{ type: "text", text: result }] };
      }

      case "stop_appium": {
        const result = await stopAppiumServer();
        return { content: [{ type: "text", text: result }] };
      }

      case "create_session": {
        const capabilities = {
          alwaysMatch: {
            "appium:platformName": args.platformName,
            "appium:deviceName": args.deviceName,
            "appium:automationName": args.automationName || 
              (args.platformName === "Android" ? "UiAutomator2" : "XCUITest"),
            ...(args.app && { "appium:app": args.app }),
            ...(args.appPackage && { "appium:appPackage": args.appPackage }),
            ...(args.appActivity && { "appium:appActivity": args.appActivity }),
            ...(args.bundleId && { "appium:bundleId": args.bundleId }),
            ...(args.udid && { "appium:udid": args.udid }),
          },
        };
        const result = await createSession(capabilities);
        return { content: [{ type: "text", text: result }] };
      }

      case "delete_session": {
        const result = await deleteSession();
        return { content: [{ type: "text", text: result }] };
      }

      case "find_element": {
        const result = await executeCommand("POST", "/element", {
          using: args.using,
          value: args.value,
        });
        return {
          content: [
            {
              type: "text",
              text: `Element found: ${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      }

      case "find_elements": {
        const result = await executeCommand("POST", "/elements", {
          using: args.using,
          value: args.value,
        });
        return {
          content: [
            {
              type: "text",
              text: `Found ${result.length} elements: ${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      }

      case "click_element": {
        await executeCommand(
          "POST",
          `/element/${args.elementId}/click`,
          {}
        );
        return {
          content: [{ type: "text", text: "Element clicked successfully" }],
        };
      }

      case "send_keys": {
        await executeCommand(
          "POST",
          `/element/${args.elementId}/value`,
          { text: args.text }
        );
        return {
          content: [{ type: "text", text: "Text sent successfully" }],
        };
      }

      case "get_element_text": {
        const result = await executeCommand(
          "GET",
          `/element/${args.elementId}/text`,
          undefined
        );
        return {
          content: [{ type: "text", text: `Element text: ${result}` }],
        };
      }

      case "get_element_attribute": {
        const result = await executeCommand(
          "GET",
          `/element/${args.elementId}/attribute/${args.attribute}`,
          undefined
        );
        return {
          content: [
            {
              type: "text",
              text: `Attribute value: ${JSON.stringify(result)}`,
            },
          ],
        };
      }

      case "tap": {
        await executeCommand("POST", "/actions", {
          actions: [
            {
              type: "pointer",
              id: "finger1",
              parameters: { pointerType: "touch" },
              actions: [
                { type: "pointerMove", duration: 0, x: args.x, y: args.y },
                { type: "pointerDown", button: 0 },
                { type: "pause", duration: 100 },
                { type: "pointerUp", button: 0 },
              ],
            },
          ],
        });
        return {
          content: [
            { type: "text", text: `Tapped at (${args.x}, ${args.y})` },
          ],
        };
      }

      case "swipe": {
        const duration = args.duration || 500;
        await executeCommand("POST", "/actions", {
          actions: [
            {
              type: "pointer",
              id: "finger1",
              parameters: { pointerType: "touch" },
              actions: [
                {
                  type: "pointerMove",
                  duration: 0,
                  x: args.startX,
                  y: args.startY,
                },
                { type: "pointerDown", button: 0 },
                {
                  type: "pointerMove",
                  duration,
                  x: args.endX,
                  y: args.endY,
                },
                { type: "pointerUp", button: 0 },
              ],
            },
          ],
        });
        return { content: [{ type: "text", text: "Swipe completed" }] };
      }

      case "get_page_source": {
        const result = await executeCommand("GET", "/source", undefined);
        return {
          content: [
            {
              type: "text",
              text: `Page source:\n${result}`,
            },
          ],
        };
      }

      case "take_screenshot": {
        const result = await executeCommand("GET", "/screenshot", undefined);
        return {
          content: [
            {
              type: "text",
              text: `Screenshot captured (base64): ${result.substring(0, 100)}...`,
            },
          ],
        };
      }

      case "install_app": {
        await executeCommand("POST", "/appium/device/install_app", {
          appPath: args.appPath,
        });
        return { content: [{ type: "text", text: "App installed successfully" }] };
      }

      case "remove_app": {
        await executeCommand("POST", "/appium/device/remove_app", {
          bundleId: args.bundleId,
        });
        return { content: [{ type: "text", text: "App removed successfully" }] };
      }

      case "launch_app": {
        await executeCommand("POST", "/appium/app/launch", {});
        return { content: [{ type: "text", text: "App launched" }] };
      }

      case "close_app": {
        await executeCommand("POST", "/appium/app/close", {});
        return { content: [{ type: "text", text: "App closed" }] };
      }

      case "get_device_info": {
        const result = await executeCommand("GET", "/appium/device/info", undefined);
        return {
          content: [
            {
              type: "text",
              text: `Device info: ${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      }

      case "long_press": {
        const duration = args.duration || 1000;
        if (args.elementId) {
          await executeCommand("POST", "/actions", {
            actions: [
              {
                type: "pointer",
                id: "finger1",
                parameters: { pointerType: "touch" },
                actions: [
                  { type: "pointerMove", duration: 0, origin: { "element-6066-11e4-a52e-4f735466cecf": args.elementId } },
                  { type: "pointerDown", button: 0 },
                  { type: "pause", duration },
                  { type: "pointerUp", button: 0 },
                ],
              },
            ],
          });
        } else {
          await executeCommand("POST", "/actions", {
            actions: [
              {
                type: "pointer",
                id: "finger1",
                parameters: { pointerType: "touch" },
                actions: [
                  { type: "pointerMove", duration: 0, x: args.x, y: args.y },
                  { type: "pointerDown", button: 0 },
                  { type: "pause", duration },
                  { type: "pointerUp", button: 0 },
                ],
              },
            ],
          });
        }
        return { content: [{ type: "text", text: `Long pressed for ${duration}ms` }] };
      }

      case "hide_keyboard": {
        await executeCommand("POST", "/appium/device/hide_keyboard", {});
        return { content: [{ type: "text", text: "Keyboard hidden" }] };
      }

      case "is_keyboard_shown": {
        const result = await executeCommand("GET", "/appium/device/is_keyboard_shown", undefined);
        return {
          content: [{ type: "text", text: `Keyboard shown: ${result}` }],
        };
      }

      case "scroll_to_element": {
        if (args.strategy === "uiautomator") {
          const result = await executeCommand("POST", "/element", {
            using: "-android uiautomator",
            value: `new UiScrollable(new UiSelector().scrollable(true).instance(0)).scrollIntoView(${args.selector})`,
          });
          return {
            content: [{ type: "text", text: `Scrolled to element: ${JSON.stringify(result)}` }],
          };
        } else {
          const result = await executeCommand("POST", "/element", {
            using: "-ios predicate string",
            value: args.selector,
          });
          return {
            content: [{ type: "text", text: `Found element: ${JSON.stringify(result)}` }],
          };
        }
      }

      case "set_orientation": {
        await executeCommand("POST", "/orientation", {
          orientation: args.orientation,
        });
        return {
          content: [{ type: "text", text: `Orientation set to ${args.orientation}` }],
        };
      }

      case "get_orientation": {
        const result = await executeCommand("GET", "/orientation", undefined);
        return {
          content: [{ type: "text", text: `Current orientation: ${result}` }],
        };
      }

      case "background_app": {
        const seconds = args.seconds || 5;
        await executeCommand("POST", "/appium/app/background", {
          seconds,
        });
        return {
          content: [{ type: "text", text: `App backgrounded for ${seconds} seconds` }],
        };
      }

      case "activate_app": {
        await executeCommand("POST", "/appium/device/activate_app", {
          bundleId: args.bundleId,
        });
        return {
          content: [{ type: "text", text: `App ${args.bundleId} activated` }],
        };
      }

      case "get_app_state": {
        const result = await executeCommand("POST", "/appium/device/app_state", {
          bundleId: args.bundleId,
        });
        const states = {
          0: "not installed",
          1: "not running",
          2: "running in background (suspended)",
          3: "running in background",
          4: "running in foreground",
        };
        return {
          content: [{ type: "text", text: `App state: ${states[result] || result}` }],
        };
      }

      case "clear_app": {
        await executeCommand("POST", "/appium/device/clear_app", {
          bundleId: args.bundleId,
        });
        return {
          content: [{ type: "text", text: `App ${args.bundleId} data cleared` }],
        };
      }

      case "start_activity": {
        await executeCommand("POST", "/appium/device/start_activity", {
          appPackage: args.appPackage,
          appActivity: args.appActivity,
        });
        return {
          content: [
            {
              type: "text",
              text: `Started activity ${args.appPackage}/${args.appActivity}`,
            },
          ],
        };
      }

      case "toggle_wifi": {
        await executeCommand("POST", "/appium/device/toggle_wifi", {});
        return {
          content: [{ type: "text", text: `WiFi ${args.enabled ? "enabled" : "disabled"}` }],
        };
      }

      case "toggle_airplane_mode": {
        await executeCommand("POST", "/appium/device/toggle_airplane_mode", {});
        return {
          content: [
            {
              type: "text",
              text: `Airplane mode ${args.enabled ? "enabled" : "disabled"}`,
            },
          ],
        };
      }

      case "open_notifications": {
        await executeCommand("POST", "/appium/device/open_notifications", {});
        return { content: [{ type: "text", text: "Notification panel opened" }] };
      }

      case "touch_id": {
        await executeCommand("POST", "/appium/simulator/touch_id", {
          match: args.match,
        });
        return {
          content: [
            {
              type: "text",
              text: `Touch ID ${args.match ? "matched" : "not matched"}`,
            },
          ],
        };
      }

      case "face_id": {
        await executeCommand("POST", "/appium/simulator/face_id", {
          match: args.match,
        });
        return {
          content: [
            {
              type: "text",
              text: `Face ID ${args.match ? "matched" : "not matched"}`,
            },
          ],
        };
      }

      case "is_element_displayed": {
        const result = await executeCommand(
          "GET",
          `/element/${args.elementId}/displayed`,
          undefined
        );
        return {
          content: [{ type: "text", text: `Element displayed: ${result}` }],
        };
      }

      case "is_element_enabled": {
        const result = await executeCommand(
          "GET",
          `/element/${args.elementId}/enabled`,
          undefined
        );
        return {
          content: [{ type: "text", text: `Element enabled: ${result}` }],
        };
      }

      case "is_element_selected": {
        const result = await executeCommand(
          "GET",
          `/element/${args.elementId}/selected`,
          undefined
        );
        return {
          content: [{ type: "text", text: `Element selected: ${result}` }],
        };
      }

      case "get_element_location": {
        const result = await executeCommand(
          "GET",
          `/element/${args.elementId}/location`,
          undefined
        );
        return {
          content: [
            {
              type: "text",
              text: `Element location: ${JSON.stringify(result)}`,
            },
          ],
        };
      }

      case "get_element_size": {
        const result = await executeCommand(
          "GET",
          `/element/${args.elementId}/size`,
          undefined
        );
        return {
          content: [
            {
              type: "text",
              text: `Element size: ${JSON.stringify(result)}`,
            },
          ],
        };
      }

      case "get_element_rect": {
        const result = await executeCommand(
          "GET",
          `/element/${args.elementId}/rect`,
          undefined
        );
        return {
          content: [
            {
              type: "text",
              text: `Element rect: ${JSON.stringify(result)}`,
            },
          ],
        };
      }

      case "scroll_up": {
        const distance = args.distance || 500;
        const screenHeight = 800; // Default, could get actual from device
        const startY = screenHeight * 0.8;
        const endY = startY - distance;
        await executeCommand("POST", "/actions", {
          actions: [
            {
              type: "pointer",
              id: "finger1",
              parameters: { pointerType: "touch" },
              actions: [
                { type: "pointerMove", duration: 0, x: 200, y: startY },
                { type: "pointerDown", button: 0 },
                { type: "pointerMove", duration: 500, x: 200, y: endY },
                { type: "pointerUp", button: 0 },
              ],
            },
          ],
        });
        return { content: [{ type: "text", text: `Scrolled up ${distance}px` }] };
      }

      case "scroll_down": {
        const distance = args.distance || 500;
        const screenHeight = 800;
        const startY = screenHeight * 0.2;
        const endY = startY + distance;
        await executeCommand("POST", "/actions", {
          actions: [
            {
              type: "pointer",
              id: "finger1",
              parameters: { pointerType: "touch" },
              actions: [
                { type: "pointerMove", duration: 0, x: 200, y: startY },
                { type: "pointerDown", button: 0 },
                { type: "pointerMove", duration: 500, x: 200, y: endY },
                { type: "pointerUp", button: 0 },
              ],
            },
          ],
        });
        return { content: [{ type: "text", text: `Scrolled down ${distance}px` }] };
      }

      case "scroll_left": {
        const distance = args.distance || 500;
        const screenWidth = 400;
        const startX = screenWidth * 0.8;
        const endX = startX - distance;
        await executeCommand("POST", "/actions", {
          actions: [
            {
              type: "pointer",
              id: "finger1",
              parameters: { pointerType: "touch" },
              actions: [
                { type: "pointerMove", duration: 0, x: startX, y: 400 },
                { type: "pointerDown", button: 0 },
                { type: "pointerMove", duration: 500, x: endX, y: 400 },
                { type: "pointerUp", button: 0 },
              ],
            },
          ],
        });
        return { content: [{ type: "text", text: `Scrolled left ${distance}px` }] };
      }

      case "scroll_right": {
        const distance = args.distance || 500;
        const screenWidth = 400;
        const startX = screenWidth * 0.2;
        const endX = startX + distance;
        await executeCommand("POST", "/actions", {
          actions: [
            {
              type: "pointer",
              id: "finger1",
              parameters: { pointerType: "touch" },
              actions: [
                { type: "pointerMove", duration: 0, x: startX, y: 400 },
                { type: "pointerDown", button: 0 },
                { type: "pointerMove", duration: 500, x: endX, y: 400 },
                { type: "pointerUp", button: 0 },
              ],
            },
          ],
        });
        return { content: [{ type: "text", text: `Scrolled right ${distance}px` }] };
      }

      case "wait_for_element": {
        const timeout = args.timeout || 10000;
        const startTime = Date.now();
        let element = null;
        let lastError = null;

        while (Date.now() - startTime < timeout) {
          try {
            element = await executeCommand("POST", "/element", {
              using: args.using,
              value: args.value,
            });
            if (element) {
              return {
                content: [
                  {
                    type: "text",
                    text: `Element found after ${Date.now() - startTime}ms: ${JSON.stringify(element)}`,
                  },
                ],
              };
            }
          } catch (error) {
            lastError = error;
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }

        throw new Error(
          `Element not found after ${timeout}ms timeout: ${lastError?.message || ""}`
        );
      }

      case "get_contexts": {
        const result = await executeCommand("GET", "/contexts", undefined);
        return {
          content: [
            {
              type: "text",
              text: `Available contexts: ${JSON.stringify(result)}`,
            },
          ],
        };
      }

      case "get_current_context": {
        const result = await executeCommand("GET", "/context", undefined);
        return {
          content: [{ type: "text", text: `Current context: ${result}` }],
        };
      }

      case "switch_context": {
        await executeCommand("POST", "/context", {
          name: args.context,
        });
        return {
          content: [{ type: "text", text: `Switched to context: ${args.context}` }],
        };
      }

      case "clear_element": {
        await executeCommand(
          "POST",
          `/element/${args.elementId}/clear`,
          {}
        );
        return {
          content: [{ type: "text", text: "Element cleared successfully" }],
        };
      }

      case "submit_element": {
        await executeCommand(
          "POST",
          `/element/${args.elementId}/submit`,
          {}
        );
        return {
          content: [{ type: "text", text: "Form submitted successfully" }],
        };
      }

      case "press_keycode": {
        const payload = { keycode: args.keycode };
        if (args.metastate !== undefined) {
          payload.metastate = args.metastate;
        }
        await executeCommand("POST", "/appium/device/press_keycode", payload);
        return {
          content: [{ type: "text", text: `Pressed keycode: ${args.keycode}` }],
        };
      }

      case "press_key": {
        await executeCommand("POST", "/appium/device/press_button", {
          name: args.key,
        });
        return {
          content: [{ type: "text", text: `Pressed key: ${args.key}` }],
        };
      }

      case "set_implicit_wait": {
        await executeCommand("POST", "/timeouts", {
          implicit: args.timeout,
        });
        return {
          content: [
            { type: "text", text: `Implicit wait set to ${args.timeout}ms` },
          ],
        };
      }

      case "get_timeouts": {
        const result = await executeCommand("GET", "/timeouts", undefined);
        return {
          content: [
            {
              type: "text",
              text: `Timeouts: ${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      }

      case "execute_script": {
        const result = await executeCommand("POST", "/execute/sync", {
          script: args.script,
          args: args.args || [],
        });
        return {
          content: [
            {
              type: "text",
              text: `Script result: ${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      }

      case "get_window_size": {
        const result = await executeCommand("GET", "/window/rect", undefined);
        return {
          content: [
            {
              type: "text",
              text: `Window size: ${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

/**
 * Start the server
 */
async function main() {
  // Check for version flag
  if (process.argv.includes("--version") || process.argv.includes("-v")) {
    console.log(packageJson.version);
    process.exit(0);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Mobile MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
