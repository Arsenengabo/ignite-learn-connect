# Responsive chat workspace refinement

## What will change
- Make the chat workspace use the available desktop height and width without oversized gaps, clipped controls, or unnecessary page scrolling.
- Keep the three-column desktop layout, tune the conversation list and message pane across laptop, desktop, and wide screens, and add a focused two-column tablet layout.
- Preserve the one-pane mobile flow with reliable back navigation, readable messages, and composer controls that remain reachable above the bottom navigation.
- Make visible controls functional: conversation filters will filter results, search actions will focus or reveal search, and disabled/loading states will be clear.
- Improve selected, focus, hover, and empty states while retaining the approved ILC visual direction and chat behavior.

## Technical details
- Reuse the existing AI Elements conversation, message, and prompt-input components.
- Adjust only chat presentation and local interaction state; realtime messaging, school-wide student search, and Supabase permissions remain unchanged.
- Validate at phone, tablet, laptop, and desktop widths and confirm the preview remains error-free.
