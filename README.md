<div align="center">

# 📱 Mobile MCP

### Model Context Protocol Server for Mobile App Automation

[![npm version](https://img.shields.io/npm/v/mcp-mobile-automation.svg)](https://www.npmjs.com/package/mcp-mobile-automation)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

A powerful [Model Context Protocol](https://modelcontextprotocol.io/) server that enables AI assistants to automate iOS and Android mobile applications using [Appium](https://appium.io/). Perfect for mobile testing, automation, and interaction workflows.

[Installation](#installation) • [Quick Start](#quick-start) • [Documentation](#available-tools) • [Examples](#usage-examples)

</div>

---

---

## ✨ Features

- 🤖 **Appium Integration**: Full Appium 2.0 support for iOS and Android
- 📱 **Cross-Platform**: Automate both iOS and Android applications
- 🛠️ **56 Tools**: Comprehensive set of mobile automation tools with platform-specific filtering
- 🔍 **Element Finding**: Multiple locator strategies (ID, XPath, Accessibility ID, etc.)
- 👆 **Gestures**: Tap, swipe, long press, drag & drop, and other touch interactions
- 📸 **Screenshots**: Capture device screenshots
- 🔧 **App Management**: Install, remove, launch, and close apps
- 🌳 **Page Source**: Get XML hierarchy of the current screen
- 💾 **Session Management**: Create and manage automation sessions
- 🎯 **Platform Filtering**: Tools automatically filtered based on iOS/Android
- 📦 **Easy Installation**: Available as npm package

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Available Tools](#available-tools)
- [Usage Examples](#usage-examples)
- [Device Setup](#device-setup)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## 🔧 Prerequisites

Before using this MCP server, ensure you have the following installed:

### Required Software

1. **Node.js** (v18 or higher)
   ```bash
   node --version
   ```

2. **Appium** (will be installed with npm install)

3. **For Android Automation:**
   - [Android Studio](https://developer.android.com/studio)
   - Android SDK Platform Tools
   - Java JDK 8 or higher
   - Set environment variables:
     ```bash
     export ANDROID_HOME=$HOME/Library/Android/sdk
     export PATH=$PATH:$ANDROID_HOME/platform-tools
     export PATH=$PATH:$ANDROID_HOME/tools
     ```

4. **For iOS Automation (macOS only):**
   - Xcode (latest version)
   - Xcode Command Line Tools
   - Carthage: `brew install carthage`
   - ios-deploy: `npm install -g ios-deploy`

## 📦 Installation

### Option 1: NPM (Recommended)

Install globally via npm:

```bash
npm install -g mcp-mobile-automation
```

Install Appium drivers:

```bash
# For Android
npx appium driver install uiautomator2

# For iOS (macOS only)
npx appium driver install xcuitest
```

### Option 2: From Source

Clone and install:

```bash
git clone https://github.com/infinityAutomation/mobile-mcp.git
cd mobile-mcp
npm install

# Install drivers
npx appium driver install uiautomator2
npx appium driver install xcuitest
```

## 🚀 Quick Start

### 1. Configure Your MCP Client

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "mobile-automation": {
      "command": "npx",
      "args": ["mcp-mobile-automation"]
    }
  }
}
```

**VS Code** (`.vscode/mcp.json`):
```json
{
  "servers": {
    "mobile-automation": {
      "type": "stdio",
      "command": "npx",
      "args": ["mcp-mobile-automation"]
    }
  }
}
```

### 2. Basic Usage

```plaintext
1. Start Appium: "Start the Appium server"
2. Create Session: "Create a session for Android emulator Pixel_6"
3. Automate: "Find the login button and click it"
4. Clean Up: "Delete the session and stop Appium"
```

## ⚙️ Configuration

<details>
<summary><b>Claude Desktop Configuration</b></summary>

**Location:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%/Claude/claude_desktop_config.json`

**NPM Installation:**
```json
{
  "mcpServers": {
    "mobile-automation": {
      "command": "npx",
      "args": ["mcp-mobile-automation"]
    }
  }
}
```

**Source Installation:**
```json
{
  "mcpServers": {
    "mobile-automation": {
      "command": "node",
      "args": ["/path/to/mobile-mcp/src/index.js"]
    }
  }
}
```
</details>

<details>
<summary><b>VS Code Configuration</b></summary>

**Location:** `.vscode/mcp.json` in your workspace

**NPM Installation:**
```json
{
  "servers": {
    "mobile-automation": {
      "type": "stdio",
      "command": "npx",
      "args": ["mcp-mobile-automation"]
    }
  }
}
```

**Source Installation:**
```json
{
  "servers": {
    "mobile-automation": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/mobile-mcp/src/index.js"]
    }
  }
}
```
</details>

## 📚 Available Tools

The server provides 56 comprehensive tools organized into the following categories:

<details open>
<summary><b>🖥️ Server Management</b></summary>

### `start_appium`
Start the Appium server.
- `port` (optional): Port number (default: 4723)
- `host` (optional): Host address (default: localhost)

### `stop_appium`
Stop the Appium server.

</details>

<details open>
<parameter name="summary"><b>🔌 Session Management</b>

<details open>
<summary><b>🔌 Session Management</b></summary>

### `create_session`
Create a new automation session.
- `platformName`: "iOS" or "Android"
- `deviceName`: Device/emulator name
- `app`: Path to app file (optional)
- `appPackage`/`appActivity`: Android app details (optional)
- `bundleId`: iOS bundle identifier (optional)

### `delete_session`
End the current automation session.

</details>

<details>
<summary><b>🔍 Element Interaction (10+ tools)</b></summary>

- `find_element` - Find single element by ID, XPath, etc.
- `find_elements` - Find multiple elements
- `click_element` - Click an element
- `send_keys` - Send text to element
- `clear_element` - Clear element text
- `get_element_text` - Get element text
- `get_element_attribute` - Get element attributes
- `is_element_displayed` - Check visibility
- `is_element_enabled` - Check if enabled
- `submit_element` - Submit a form element

</details>

<details>
<summary><b>👆 Gestures & Actions (15+ tools)</b></summary>

- `tap` - Tap at coordinates
- `swipe` - Swipe gesture
- `scroll` - Scroll in direction
- `long_press` - Long press gesture
- `drag_and_drop` - Drag element to target
- `pinch` - Pinch gesture
- `zoom` - Zoom gesture
- `hide_keyboard` - Hide on-screen keyboard
- `rotate_device` - Rotate device orientation
- And more...

</details>

<details>
<summary><b>📱 App Management</b></summary>

- `install_app` - Install app on device
- `remove_app` - Remove app from device
- `launch_app` - Launch the app
- `close_app` - Close the app
- `get_app_state` - Check app state
- `activate_app` - Activate app in background
- `terminate_app` - Terminate app

</details>

<details>
<summary><b>📸 Information & Debugging</b></summary>

- `take_screenshot` - Capture screenshot
- `get_page_source` - Get XML hierarchy
- `get_device_info` - Device information
- `get_device_time` - Device time
- `get_battery_info` - Battery status
- `get_network_connection` - Network status
- `get_clipboard` - Get clipboard content
- `set_clipboard` - Set clipboard content

</details>

<details>
<summary><b>🤖 Android-Specific Tools</b></summary>

- `start_activity` - Start Android activity
- `press_keycode` - Press hardware keycode
- `toggle_wifi` - Toggle WiFi
- `toggle_airplane_mode` - Toggle airplane mode
- `open_notifications` - Open notification drawer
- `clear_app` - Clear app data

</details>

<details>
<summary><b>🍎 iOS-Specific Tools</b></summary>

- `touch_id` - Simulate Touch ID
- `face_id` - Simulate Face ID  
- `press_key` - Press iOS button (home, volumeUp, volumeDown)

</details>

> **Note**: Platform-specific tools are automatically filtered based on your active session (iOS or Android).

## 💡 Usage Examples

### Example 1: Android App Login Flow

## 💡 Usage Examples

### Example 1: Android App Login Flow

```plaintext
User: "Start Appium server on port 4723"
Assistant: [Calls start_appium tool]

User: "Create a session for Android emulator Pixel_6_API_33 with app at /path/to/app.apk"
Assistant: [Calls create_session with platformName: "Android", deviceName: "Pixel_6_API_33", app: "/path/to/app.apk"]

User: "Find the username field by ID 'username_input' and enter 'testuser'"
Assistant: [Calls find_element, then send_keys]

User: "Find password field by ID 'password_input' and enter 'password123'"
Assistant: [Calls find_element, then send_keys]

User: "Click the login button with ID 'login_btn'"
Assistant: [Calls find_element, then click_element]

User: "Take a screenshot"
Assistant: [Calls take_screenshot]

User: "Stop everything"
Assistant: [Calls delete_session, then stop_appium]
```

### Example 2: iOS App Testing

```plaintext
User: "Start Appium and create iOS session for iPhone 14 simulator"
Assistant: [Calls start_appium, then create_session]

User: "Swipe up from bottom"
Assistant: [Calls swipe with appropriate coordinates]

User: "Find all buttons on screen"
Assistant: [Calls find_elements with "class name" and "XCUIElementTypeButton"]

User: "Get the page source to see element hierarchy"
Assistant: [Calls get_page_source]
```

### Example 3: Gesture Automation

```plaintext
User: "Perform long press on element with ID 'menu_item'"
Assistant: [Calls find_element, then long_press]

User: "Drag element 'draggable' to element 'drop_zone'"
Assistant: [Calls find_element for both, then drag_and_drop]

User: "Scroll down on the page"
Assistant: [Calls scroll with direction: "down"]
```

## 📱 Device Setup

### Android Emulator

1. Open Android Studio → AVD Manager
2. Create virtual device (e.g., Pixel 6, API 33)
3. Start emulator
4. Verify: `adb devices`

### Android Real Device

1. Enable **Developer Options** on device
   - Settings → About Phone → Tap "Build Number" 7 times
2. Enable **USB Debugging**
   - Settings → Developer Options → USB Debugging
3. Connect via USB and accept prompt
4. Verify: `adb devices`

### iOS Simulator

1. Open Xcode → Window → Devices and Simulators
2. Create/start simulator (e.g., iPhone 14)
3. Verify: `xcrun simctl list devices`

### iOS Real Device

1. Connect device via USB
2. Trust computer on device
3. Register device in Xcode
4. Get UDID: `idevice_id -l` or Xcode → Window → Devices and Simulators

## 🔧 Troubleshooting

<details>
<summary><b>Appium Server Issues</b></summary>

**Server won't start:**
```bash
# Check if port is in use
lsof -i :4723

# Kill process
kill -9 <PID>

# Try different port
# Use port parameter in start_appium
```

**Driver not installed:**
```bash
# List installed drivers
npx appium driver list

# Install missing driver
npx appium driver install uiautomator2
npx appium driver install xcuitest
```

</details>

<details>
<summary><b>Android Issues</b></summary>

**App won't launch:**
```bash
# Verify app package and activity
aapt dump badging app.apk | grep package

# Check device connection
adb devices

# View logs
adb logcat | grep -i error
```

**Device not detected:**
```bash
# Restart ADB
adb kill-server && adb start-server

# Check USB debugging
adb devices
```

</details>

<details>
<summary><b>iOS Issues</b></summary>

**App won't launch:**
- Verify bundle ID matches installed app
- Ensure app is signed correctly
- Check Developer Certificate is trusted on device

**Simulator not responding:**
```bash
# Reset simulator
xcrun simctl erase all

# Restart Xcode
killall Simulator
```

**Real device connection:**
- Ensure device is unlocked
- Trust computer prompt accepted
- Latest Xcode installed
- Device registered in Apple Developer account

</details>

<details>
<summary><b>Element Finding Issues</b></summary>

**Element not found:**
1. Use `get_page_source` to inspect hierarchy
2. Try different locator strategies:
   - `id` - Fastest, most reliable
   - `accessibility id` - Cross-platform
   - `xpath` - Flexible but slower
   - `class name` - For element types
3. Add wait/delay for dynamic content
4. Check if element is in different context (webview)

**Wrong element selected:**
- Use more specific XPath
- Combine multiple attributes
- Use index for multiple matches

</details>

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Setup

```bash
git clone https://github.com/infinityAutomation/mobile-mcp.git
cd mobile-mcp
npm install
```

### Running Tests

```bash
# Start Appium
npx appium

# In another terminal, run your tests
node src/index.js
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📚 Resources

- [Appium Documentation](https://appium.io/docs/en/latest/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Android Developer Docs](https://developer.android.com/)
- [iOS Developer Docs](https://developer.apple.com/)
- [WebDriver Protocol](https://www.w3.org/TR/webdriver/)

## 🙏 Acknowledgments

- Built with [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk)
- Powered by [Appium](https://appium.io/)
- Inspired by the mobile automation community

---

<div align="center">

**Made with ❤️ by the Infinity Automation Team**

[Report Bug](https://github.com/infinityAutomation/mobile-mcp/issues) • [Request Feature](https://github.com/infinityAutomation/mobile-mcp/issues) • [Documentation](https://github.com/infinityAutomation/mobile-mcp/blob/main/README.md)

</div>
