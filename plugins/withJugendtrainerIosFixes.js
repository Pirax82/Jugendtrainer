const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");

/**
 * Re-applies our iOS Podfile `post_install` fixes after every `expo prebuild`.
 * This keeps Xcode builds stable even when iOS is regenerated.
 */
module.exports = function withJugendtrainerIosFixes(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const iosRoot = config.modRequest.platformProjectRoot;

      // Patch generated iOS display name + URL scheme so Xcode/device show the right branding.
      try {
        const xcodeproj = fs.readdirSync(iosRoot).find((f) => f.endsWith(".xcodeproj"));

        // Expo prebuild often keeps the app directory name as the original template (e.g. "onspaceapp")
        // even if the .xcodeproj gets renamed. Find the actual app dir by looking for Info.plist.
        const appDir = fs
          .readdirSync(iosRoot)
          .find((f) => {
            try {
              const full = path.join(iosRoot, f);
              return fs.statSync(full).isDirectory() && fs.existsSync(path.join(full, "Info.plist"));
            } catch {
              return false;
            }
          });

        if (xcodeproj && appDir) {
          const projectName = xcodeproj.replace(".xcodeproj", "");

          // Info.plist display name + scheme
          const infoPlistPath = path.join(iosRoot, appDir, "Info.plist");
          if (fs.existsSync(infoPlistPath)) {
            let plist = fs.readFileSync(infoPlistPath, "utf8");
            plist = plist.replace(
              /<key>CFBundleDisplayName<\/key>\s*<string>[^<]*<\/string>/,
              "<key>CFBundleDisplayName</key>\n    <string>TVS Jugendtrainer</string>"
            );
            // Replace old scheme in URL schemes array if present
            plist = plist.replace(
              /<string>onspaceapp<\/string>/g,
              "<string>tvsjugendtrainer</string>"
            );
            fs.writeFileSync(infoPlistPath, plist);
          }

          // Force the iOS AppIcon to be the TV Schweinheim logo (durable across prebuilds).
          // iOS currently uses a single universal 1024 icon in the asset catalog.
          const iconSource = path.join(iosRoot, "..", "assets", "images", "logo.png");
          const appIconDest = path.join(
            iosRoot,
            appDir,
            "Images.xcassets",
            "AppIcon.appiconset",
            "App-Icon-1024x1024@1x.png"
          );
          if (fs.existsSync(iconSource) && fs.existsSync(appIconDest)) {
            try {
              // Resize to exactly 1024x1024 to satisfy the asset catalog expectation.
              childProcess.execFileSync("/usr/bin/sips", [
                "-z",
                "1024",
                "1024",
                iconSource,
                "--out",
                appIconDest,
              ]);
            } catch {
              // Fallback: overwrite without resizing.
              fs.copyFileSync(iconSource, appIconDest);
            }
          }

          // project.pbxproj PRODUCT_NAME (doesn't rename the target, but updates product name)
          const pbxprojPath = path.join(iosRoot, xcodeproj, "project.pbxproj");
          if (fs.existsSync(pbxprojPath)) {
            let pbx = fs.readFileSync(pbxprojPath, "utf8");
            pbx = pbx.replace(/PRODUCT_NAME = onspaceapp;/g, "PRODUCT_NAME = TVSJugendtrainer;");
            // Rename the app target name shown in Xcode (safe string replacement within comments + name fields)
            pbx = pbx.replace(/\/\* onspaceapp \*\//g, "/* TVSJugendtrainer */");
            pbx = pbx.replace(/name = onspaceapp;/g, "name = TVSJugendtrainer;");
            pbx = pbx.replace(/productName = onspaceapp;/g, "productName = TVSJugendtrainer;");
            pbx = pbx.replace(/path = onspaceapp\.app;/g, "path = TVSJugendtrainer.app;");
            // Disable user script sandboxing to avoid "Sandbox: bash(...) deny file-read-data" for CocoaPods/Expo scripts.
            pbx = pbx.replace(/ENABLE_USER_SCRIPT_SANDBOXING = YES;/g, "ENABLE_USER_SCRIPT_SANDBOXING = NO;");
            fs.writeFileSync(pbxprojPath, pbx);
          }

          // Create/replace shared scheme with the new name
          const schemesDir = path.join(iosRoot, xcodeproj, "xcshareddata", "xcschemes");
          fs.mkdirSync(schemesDir, { recursive: true });
          const oldScheme = path.join(schemesDir, "onspaceapp.xcscheme");
          const newScheme = path.join(schemesDir, "TVSJugendtrainer.xcscheme");
          const schemeXml = `<?xml version="1.0" encoding="UTF-8"?>\n<Scheme\n   LastUpgradeVersion = \"1130\"\n   version = \"1.3\">\n   <BuildAction\n      parallelizeBuildables = \"YES\"\n      buildImplicitDependencies = \"YES\">\n      <BuildActionEntries>\n         <BuildActionEntry\n            buildForTesting = \"YES\"\n            buildForRunning = \"YES\"\n            buildForProfiling = \"YES\"\n            buildForArchiving = \"YES\"\n            buildForAnalyzing = \"YES\">\n            <BuildableReference\n               BuildableIdentifier = \"primary\"\n               BlueprintIdentifier = \"13B07F861A680F5B00A75B9A\"\n               BuildableName = \"TVSJugendtrainer.app\"\n               BlueprintName = \"TVSJugendtrainer\"\n               ReferencedContainer = \"container:TVSJugendtrainer.xcodeproj\">\n            </BuildableReference>\n         </BuildActionEntry>\n      </BuildActionEntries>\n   </BuildAction>\n   <TestAction\n      buildConfiguration = \"Debug\"\n      selectedDebuggerIdentifier = \"Xcode.DebuggerFoundation.Debugger.LLDB\"\n      selectedLauncherIdentifier = \"Xcode.DebuggerFoundation.Launcher.LLDB\"\n      shouldUseLaunchSchemeArgsEnv = \"YES\">\n      <Testables>\n      </Testables>\n   </TestAction>\n   <LaunchAction\n      buildConfiguration = \"Debug\"\n      selectedDebuggerIdentifier = \"Xcode.DebuggerFoundation.Debugger.LLDB\"\n      selectedLauncherIdentifier = \"Xcode.DebuggerFoundation.Launcher.LLDB\"\n      launchStyle = \"0\"\n      useCustomWorkingDirectory = \"NO\"\n      ignoresPersistentStateOnLaunch = \"NO\"\n      debugDocumentVersioning = \"YES\"\n      debugServiceExtension = \"internal\"\n      allowLocationSimulation = \"YES\">\n      <BuildableProductRunnable\n         runnableDebuggingMode = \"0\">\n         <BuildableReference\n            BuildableIdentifier = \"primary\"\n            BlueprintIdentifier = \"13B07F861A680F5B00A75B9A\"\n            BuildableName = \"TVSJugendtrainer.app\"\n            BlueprintName = \"TVSJugendtrainer\"\n            ReferencedContainer = \"container:TVSJugendtrainer.xcodeproj\">\n         </BuildableReference>\n      </BuildableProductRunnable>\n   </LaunchAction>\n   <ProfileAction\n      buildConfiguration = \"Release\"\n      shouldUseLaunchSchemeArgsEnv = \"YES\"\n      savedToolIdentifier = \"\"\n      useCustomWorkingDirectory = \"NO\"\n      debugDocumentVersioning = \"YES\">\n      <BuildableProductRunnable\n         runnableDebuggingMode = \"0\">\n         <BuildableReference\n            BuildableIdentifier = \"primary\"\n            BlueprintIdentifier = \"13B07F861A680F5B00A75B9A\"\n            BuildableName = \"TVSJugendtrainer.app\"\n            BlueprintName = \"TVSJugendtrainer\"\n            ReferencedContainer = \"container:TVSJugendtrainer.xcodeproj\">\n         </BuildableReference>\n      </BuildableProductRunnable>\n   </ProfileAction>\n   <AnalyzeAction\n      buildConfiguration = \"Debug\">\n   </AnalyzeAction>\n   <ArchiveAction\n      buildConfiguration = \"Release\"\n      revealArchiveInOrganizer = \"YES\">\n   </ArchiveAction>\n</Scheme>\n`;
          fs.writeFileSync(newScheme, schemeXml);
          if (fs.existsSync(oldScheme)) fs.unlinkSync(oldScheme);
        }
      } catch (e) {
        // ignore, optional
      }

      const podfilePath = path.join(config.modRequest.platformProjectRoot, "Podfile");
      if (!fs.existsSync(podfilePath)) return config;

      let podfile = fs.readFileSync(podfilePath, "utf8");

      const markerStart = "    # ---- Jugendtrainer build fixes + debug logging (runs on every `pod install`) ----";
      if (podfile.includes(markerStart)) {
        // already patched
        return config;
      }

      const injection = `

${markerStart}
    begin
      debug_log_path = File.join(__dir__, '..', '.cursor', 'debug.log')
      log = lambda do |hypothesis_id, location, message, data|
        payload = {
          timestamp: (Time.now.to_f * 1000).to_i,
          sessionId: 'debug-session',
          runId: 'pods',
          hypothesisId: hypothesis_id,
          location: location,
          message: message,
          data: data,
        }
        File.open(debug_log_path, 'a') { |f| f.puts(payload.to_json) }
      end

      expo_router_pkg = File.join(__dir__, '..', 'node_modules', 'expo-router', 'package.json')
      expo_router_version = File.exist?(expo_router_pkg) ? (JSON.parse(File.read(expo_router_pkg))['version'] rescue 'unknown') : 'missing'
      screens_pkg = File.join(__dir__, '..', 'node_modules', 'react-native-screens', 'package.json')
      screens_version = File.exist?(screens_pkg) ? (JSON.parse(File.read(screens_pkg))['version'] rescue 'unknown') : 'missing'
      log.call('A', 'ios/Podfile:post_install', 'versions', { expoRouter: expo_router_version, reactNativeScreens: screens_version })

      link_header = File.join(__dir__, '..', 'node_modules', 'expo-router', 'ios', 'LinkPreview', 'LinkPreviewNativeNavigation.h')
      if File.exist?(link_header)
        content = File.read(link_header)
        original = content.dup

        if content.include?('#import <RNScreens/RNSDismissibleModalProtocol.h>') &&
           !content.include?('__has_include(<RNScreens/RNSDismissibleModalProtocol.h>)')
          content.gsub!(
            '#import <RNScreens/RNSDismissibleModalProtocol.h>',
            <<~HDR.chomp
            #if __has_include(<RNScreens/RNSDismissibleModalProtocol.h>)
            #import <RNScreens/RNSDismissibleModalProtocol.h>
            #else
            @protocol RNSDismissibleModalProtocol;
            #endif
            HDR
          )
        end

        if content.include?('#import <RNScreens/RNSTabBarController.h>') &&
           !content.include?('__has_include(<RNScreens/RNSTabBarController.h>)')
          content.gsub!(
            '#import <RNScreens/RNSTabBarController.h>',
            <<~HDR.chomp
            #if __has_include(<RNScreens/RNSTabBarController.h>)
            #import <RNScreens/RNSTabBarController.h>
            #else
            @class UITabBarController;
            #endif
            HDR
          )
        end

        if content != original
          File.write(link_header, content)
          log.call('A', 'ios/Podfile:post_install', 'patched LinkPreviewNativeNavigation.h', {})
        end
      end

      lottie_animation_view = File.join(__dir__, '..', 'node_modules', 'lottie-react-native', 'ios', 'LottieReactNative', 'AnimationViewManagerModule.swift')
      if File.exist?(lottie_animation_view)
        content = File.read(lottie_animation_view)
        original = content.dup
        content.gsub!(/self\\.bridge\\.uiManager/, 'self.bridge?.uiManager')
        if content != original
          File.write(lottie_animation_view, content)
          log.call('B', 'ios/Podfile:post_install', 'patched lottie AnimationViewManagerModule.swift', {})
        end
      end

      lottie_container_view = File.join(__dir__, '..', 'node_modules', 'lottie-react-native', 'ios', 'LottieReactNative', 'ContainerView.swift')
      if File.exist?(lottie_container_view)
        content = File.read(lottie_container_view)
        original = content.dup
        content.gsub!(/super\\.removeReactSubview\\(animationView\\)/, 'if let oldView = animationView { super.removeReactSubview(oldView) }')
        if content != original
          File.write(lottie_container_view, content)
          log.call('B', 'ios/Podfile:post_install', 'patched lottie ContainerView.swift', {})
        end
      end

      keyboard_controller_view = File.join(__dir__, '..', 'node_modules', 'react-native-keyboard-controller', 'ios', 'views', 'KeyboardControllerViewManager.swift')
      if File.exist?(keyboard_controller_view)
        content = File.read(keyboard_controller_view)
        original = content.dup
        content.gsub!(/return KeyboardControllerView\\(frame: CGRect\\.zero, bridge: bridge\\)/, 'return KeyboardControllerView(frame: CGRect.zero, bridge: bridge!)')
        content.gsub!(/(\\s)bridge\\.uiManager\\.addUIBlock/, '\\\\1bridge?.uiManager.addUIBlock')
        content.gsub!(/KeyboardController\\.shared\\(\\)\\?\\./, 'KeyboardController.shared().')
        content.gsub!(/body: nil\\)/, 'body: NSNull())')
        if content != original
          File.write(keyboard_controller_view, content)
          log.call('B', 'ios/Podfile:post_install', 'patched keyboard-controller KeyboardControllerViewManager.swift', {})
        end
      end
    rescue => e
      puts "⚠️ Jugendtrainer post_install patch error: #{e}"
    end
`;

      // Insert right before the `end` of the post_install block (first match).
      // We anchor on the resource bundle signing block which is present in Expo-generated Podfiles.
      const anchor =
        "    installer.target_installation_results.pod_target_installation_results";
      const idx = podfile.indexOf(anchor);
      if (idx === -1) return config;

      // Find the end of post_install block by locating the first "\n  end" after anchor
      const endIdx = podfile.indexOf("\n  end", idx);
      if (endIdx === -1) return config;

      podfile = podfile.slice(0, endIdx) + injection + podfile.slice(endIdx);
      fs.writeFileSync(podfilePath, podfile);

      return config;
    },
  ]);
};


