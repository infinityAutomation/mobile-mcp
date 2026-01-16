# Mobile MCP - Mobile App Automation Server

A Model Context Protocol (MCP) server for automating iOS and Android mobile applications using Appium. This server provides comprehensive tools for mobile app testing, automation, and interaction through the MCP interface.

## Features

- 🤖 **Appium Integration**: Full Appium 2.0 support for iOS and Android
- 📱 **Cross-Platform**: Automate both iOS and Android applications
- 🔍 **Element Finding**: Multiple locator strategies (ID, XPath, Accessibility ID, etc.)
- 👆 **Gestures**: Tap, swipe, long press, and other touch interactions
- 📸 **Screenshots**: Capture device screenshots
- 🔧 **App Management**: Install, remove, launch, and close apps
- 🌳 **Page Source**: Get XML hierarchy of the current screen
- 💾 **Session Management**: Create and manage automation sessions
- 🎯 **56 Tools**: Comprehensive automation toolkit with platform-specific filtering
- 🔄 **Context Switching**: Seamlessly switch between native and webview contexts

## Prerequisites

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

## Installation

1. Clone the repository:
   ```bash
   cd /Users/maheswara/repo/mobile-mcp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Install Appium drivers:
   ```bash
   # For Android
   npx appium driver install uiautomator2
   
   # For iOS (macOS only)
   npx appium driver install xcuitest
   ```

## Configuration

### VS Code Configuration

Add this server to your VS Code MCP settings (`.vscode/mcp.json`):

```json
{
  "servers": {
    "mobile-automation": {
      "type": "stdio",
      "command": "node",
      "args": ["/Users/maheswara/repo/mobile-mcp/src/index.js"]
    }
  }
}
```

### Claude Desktop Configuration

Add to your Claude Desktop configuration:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mobile-automation": {
      "command": "node",
      "args": ["/Users/maheswara/repo/mobile-mcp/src/index.js"]
    }
  }
}
```

## Available Tools

### Server Management

#### `start_appium`
Start the Appium server for mobile automation.

**Parameters:**
- `port` (optional): Port number for Appium server (default: 4723)

**Example:**
```javascript
{
  "port": 4723
}
```

#### `stop_appium`
Stop the Appium server.

### Session Management

#### `create_session`
Create a new mobile automation session with specified capabilities.

**Parameters:**
- `platformName` (required): "iOS" or "Android"
- `deviceName` (required): Name of the device or emulator
- `app` (optional): Path to the app file (.apk for Android, .app/.ipa for iOS)
- `appPackage` (optional): Android app package name
- `appActivity` (optional): Android app activity name
- `bundleId` (optional): iOS bundle identifier
- `automationName` (optional): "UiAutomator2" (Android) or "XCUITest" (iOS)
- `udid` (optional): Device UDID for real devices

**Example (Android):**
```javascript
{
  "platformName": "Android",
  "deviceName": "Pixel_6_API_33",
  "app": "/path/to/app.apk",
  "appPackage": "com.example.app",
  "appActivity": ".MainActivity"
}
```

**Example (iOS):**
```javascript
{
  "platformName": "iOS",
  "deviceName": "iPhone 14",
  "app": "/path/to/app.app",
  "bundleId": "com.example.app"
}
```

#### `delete_session`
Delete the current mobile automation session.

### Element Interaction

#### `find_element`
Find a single element using various locator strategies.

**Parameters:**
- `using` (required): Locator strategy (id, xpath, accessibility id, class name, name)
- `value` (required): The locator value

**Example:**
```javascript
{
  "using": "id",
  "value": "username_field"
}
```

#### `find_elements`
Find multiple elements using various locator strategies.

#### `click_element`
Click on an element.

**Parameters:**
- `elementId` (required): Element ID returned from find_element

#### `send_keys`
Send text to an element.

**Parameters:**
- `elementId` (required): Element ID to send keys to
- `text` (required): Text to send

#### `get_element_text`
Get text content of an element.

#### `get_element_attribute`
Get an attribute value of an element.

**Parameters:**
- `elementId` (required): Element ID
- `attribute` (required): Attribute name (e.g., 'text', 'enabled', 'displayed')

### Gestures

#### `tap`
Tap at specific coordinates.

**Parameters:**
- `x` (required): X coordinate
- `y` (required): Y coordinate

#### `swipe`
Perform a swipe gesture.

**Parameters:**
- `startX`, `startY` (required): Starting coordinates
- `endX`, `endY` (required): Ending coordinates
- `duration` (optional): Duration in milliseconds (default: 500)

**Example:**
```javascript
{
  "startX": 100,
  "startY": 500,
  "endX": 100,
  "endY": 100,
  "duration": 800
}
```

### Information & Debugging

#### `get_page_source`
Get the page source (XML hierarchy) of the current screen.

#### `take_screenshot`
Take a screenshot and return base64 encoded image.

#### `get_device_info`
Get information about the connected device.

### App Management

#### `install_app`
Install an app on the device.

**Parameters:**
- `appPath` (required): Path to the app file

#### `remove_app`
Remove an app from the device.

**Parameters:**
- `bundleId` (required): Bundle ID (iOS) or package name (Android)

#### `launch_app`
Launch the app associated with current session.

#### `close_app`
Close the currently running app.

## Usage Example

Here's a typical workflow for automating a mobile app:

1. **Start Appium Server:**
   ```
   Use tool: start_appium
   ```

2. **Create Session:**
   ```
   Use tool: create_session with Android/iOS capabilities
   ```

3. **Interact with App:**
   ```
   - Find element by ID
   - Send keys to input field
   - Click button
   - Get element text
   - Take screenshot
   ```

4. **Clean Up:**
   ```
   - Delete session
   - Stop Appium
   ```

## Device Setup

### Android Emulator

1. Open Android Studio
2. Go to AVD Manager
3. Create a new virtual device
4. Start the emulator
5. List devices: `adb devices`

### Android Real Device

1. Enable Developer Options on your device
2. Enable USB Debugging
3. Connect device via USB
4. Accept USB debugging prompt
5. Verify: `adb devices`

### iOS Simulator

1. Open Xcode
2. Go to Window > Devices and Simulators
3. Create or start a simulator
4. List devices: `xcrun simctl list devices`

### iOS Real Device

1. Connect device via USB
2. Trust the computer on your device
3. Ensure device is registered in Xcode
4. Get UDID: `idevice_id -l` or from Xcode

## Troubleshooting

### Appium Server Won't Start
- Check if port 4723 is already in use: `lsof -i :4723`
- Kill existing process: `kill -9 <PID>`
- Try a different port

### Android App Won't Launch
- Verify app package and activity: `aapt dump badging <app.apk> | grep package`
- Check device connection: `adb devices`
- View device logs: `adb logcat`

### iOS App Won't Launch
- Verify bundle ID: `osascript -e 'id of app "<AppName>"'`
- Check signing: App must be signed for device
- Trust developer certificate on device

### Element Not Found
- Use `get_page_source` to inspect the element hierarchy
- Try different locator strategies (id, xpath, accessibility id)
- Add wait time for elements to load

## Development

### Start Server
```bash
npm start
```

## Resources

- [Appium Documentation](https://appium.io/docs/en/latest/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Android Developer Docs](https://developer.android.com/)
- [iOS Developer Docs](https://developer.apple.com/)

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
