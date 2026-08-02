const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Google Sign-In pulls in AppCheckCore (a Swift pod) which depends on
// GoogleUtilities and RecaptchaInterop. Those don't define modules, so when
// built as static libraries CocoaPods refuses to integrate them unless we opt
// them into module maps via :modular_headers => true.
const POD_LINES = [
  "  pod 'GoogleUtilities', :modular_headers => true",
  "  pod 'RecaptchaInterop', :modular_headers => true",
];

module.exports = function withModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        'Podfile'
      );
      let contents = fs.readFileSync(podfilePath, 'utf8');

      if (!contents.includes(':modular_headers => true')) {
        // Insert the pod lines just inside the target, after use_expo_modules!
        contents = contents.replace(
          /use_expo_modules!\n/,
          `use_expo_modules!\n${POD_LINES.join('\n')}\n`
        );
        fs.writeFileSync(podfilePath, contents);
      }

      return config;
    },
  ]);
};
