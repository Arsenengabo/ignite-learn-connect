# Responsive chat and desktop navigation

## What will change
- Add a desktop navigation bar below the header so Chat and every student destination remain visible on large screens.
- Keep the existing bottom navigation for phones and tablets, with the same selected-tab behavior across screen sizes.
- Rework Student Chat into a responsive workspace that fills available width and adapts its height safely on short, tall, narrow, and wide screens.
- Improve room and direct-message controls with clear selected states, larger touch targets, disabled send states, and better message/input spacing.
- On wide screens, show direct-message conversations and the open chat together; retain the simple step-by-step view on compact screens.

## Technical details
- Reuse the shared navigation context so desktop and mobile controls stay synchronized.
- Use existing ILC semantic colors and shared button components; no chat permissions or database behavior will change.
- Validate the result in Chromium at mobile and desktop widths and confirm the preview remains error-free.
