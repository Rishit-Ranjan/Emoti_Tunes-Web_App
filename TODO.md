gemini # Emoti_Tunes — Task TODO

## Goal
Use Gemini for emotion/audio detection and use an ML (tfjs) model for playlist generation, without changing core app functionality or UI.

## Steps
- [x] Inspect current flow from AudioView/CameraView → Service functions → PlaylistDisplay.

- [ ] Implement ML-based playlist generator (tfjs) that maps emotion → ranked songs using a local dataset.

- [ ] Update `generatePlaylist` in `src/services/Service.js` to use the ML playlist generator (no Gemini).
- [ ] Ensure mic pipeline input types match: `AudioView` blob payload → `detectEmotionFromAudio` expects a Blob/File.
- [ ] Update `analyzeAndGeneratePlaylist` to call ML playlist generation (keep emotion detection via Gemini).

- [ ] Validate by running `npm run dev` and manually checking camera + mic flows.
- [ ] Update README/notes if a `.env` key is now only required for emotion detection.

