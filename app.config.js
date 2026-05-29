import 'dotenv/config';

export default {
  expo: {
    name: "ExamFlow AI",
    slug: "examflow-ai",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#0D0D1A"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.examflowai.app",
      infoPlist: {
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: ["com.examflowai.app"]
          }
        ],
        NSPhotoLibraryUsageDescription:
          "ExamFlow AI needs access to your photo library to update your profile picture.",
        NSCameraUsageDescription:
          "ExamFlow AI needs camera access to take a profile photo.",
        NSPhotoLibraryAddUsageDescription:
          "ExamFlow AI may save processed images to your photo library.",
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundImage: "./assets/android-icon-background.png",
        monochromeImage: "./assets/android-icon-monochrome.png",
      },
      package: "com.examflowai.app",
      intentFilters: [
        {
          action: "VIEW",
          data: [{ scheme: "com.examflowai.app" }],
          category: ["BROWSABLE", "DEFAULT"]
        }
      ]
    },
    web: {
      favicon: "./assets/favicon.png",
      bundler: "metro",
      output: "single"
    },
    plugins: [
      "expo-router",
      "expo-font"
    ],
    scheme: "com.examflowai.app",
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.11:5000",
      googleClientId: "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
      googleExpoClientId: "YOUR_EXPO_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
      eas: {
        projectId: "10fca0b8-4bcf-4d1e-87ab-6fc2543d9e8b"
      }
    }
  }
};
