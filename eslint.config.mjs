// Shared base rules extended by each app's own ESLint config.
export default [
  {
    ignores: ["**/dist/**", "**/.next/**", "**/build/**", "**/coverage/**"],
  },
  {
    rules: {
      "prefer-const": "error",
      eqeqeq: ["error", "smart"],
    },
  },
];
