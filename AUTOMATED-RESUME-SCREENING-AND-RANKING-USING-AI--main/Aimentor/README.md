# AI Career Mentor (AMD-SlingShot)

Simple React/Vite demo that analyzes a resume against a job role using Claude API.

## Getting started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file at project root with your Claude API key:
   ```env
   VITE_CLAUDE_API_KEY=sk-...  # obtain from https://www.anthropic.com/
   ```
   If you don't provide a key the app will fall back to fake/demo responses.

3. Run the dev server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:5173 in your browser and interact with the app.

## Notes

- The message you saw in the browser is from the catch block when the API call failed.  It indicates the app didn't have a valid Claude key or network access.
- You can test with `Try Demo` button even without a key.
- Modify `src/App.jsx` to change prompts or behavior.

Happy hacking! 🚀