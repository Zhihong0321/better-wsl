# Changelog

## 2025-12-07
- Implemented file view restriction in `server/index.js` to limit WSL access to `~/better-cli-workspace`.
- Modified file listing logic to conditionally hide `..` navigation at the workspace root to prevent upward traversal.
- Added path validation to automatically redirect unauthorized access attempts back to the workspace directory.
